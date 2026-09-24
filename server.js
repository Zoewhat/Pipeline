'use strict';

const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { randomBytes, randomInt, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createSetup, updateTanks } = require('./game/setup');
const { createGame, applyAction, publicState } = require('./game/engine');
const {startClock, settleClock} = require('./game/clock');
const {validatePresence} = require('./game/presence');
const catalog = require('./data/components.json');
const { recoveryStore } = require('./game/recovery');

const tokenHash = token => createHash('sha256').update(token).digest('hex');
const nameOf = value => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Enter your name.');
  return value.trim().slice(0, 24);
};
const codeOf = value => typeof value === 'string' ? value.trim().toUpperCase() : '';

function createApp({ storageDir = process.env.DATA_DIR || path.join(__dirname, 'storage'), backupSecret, now = Date.now, clockInterval = 1000 } = {}) {
  fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 });
  const recovery = recoveryStore(storageDir, backupSecret);
  const savePath = path.join(storageDir, 'rooms.json');
  const rooms = new Map();
  // Fail loudly on corrupt saves; never silently overwrite them with an empty database.
  if (fs.existsSync(savePath)) {
    const saved = JSON.parse(fs.readFileSync(savePath, 'utf8'));
    if (saved.version !== 1 || !Array.isArray(saved.rooms)) throw new Error('Unsupported room save.');
    for (const room of saved.rooms) rooms.set(room.code, room);
  }
  const connections = new Map();
  const presence = new Map();
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    next();
  });
  app.get('/health', (req, res) => res.json({ ok: true, version: '0.2.0', gameplay: 'intro-base' }));
  app.get('/catalog.json', (req, res) => res.json({ pipeTiles: catalog.pipeTiles, contracts: catalog.contracts, orders: catalog.orders, upgrades: catalog.upgrades.filter(u => ['government','engineering','human-resources','refined-markets','shops'].includes(u.id)) }));
  app.use(express.static(path.join(__dirname, 'public')));
  const server = createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 200000,
    allowRequest: (req, callback) => {
      // Same-origin browser sessions; absent Origin is allowed for non-browser tests.
      let allowed = !req.headers.origin;
      try { allowed ||= new URL(req.headers.origin).host === req.headers.host; } catch {}
      callback(null, allowed);
    }
  });

  function persist() {
    const temp = `${savePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ version: 1, rooms: [...rooms.values()] }), { mode: 0o600 });
    fs.renameSync(temp, savePath);
  }
  function commit(room) {
    // Persist a candidate before broadcasting it; failed writes cannot partially apply an action.
    const previous = rooms.get(room.code);
    rooms.set(room.code, room);
    try { persist(); } catch (error) {
      if (previous) rooms.set(room.code, previous); else rooms.delete(room.code);
      throw error;
    }
  }
  function view(room) {
    return {
      code: room.code, local: room.local, revision: room.revision, change:room.change, serverNow:now(),
      state: publicState(room.state), log: room.log,
      players: room.players.map((p, i) => ({ name: p.name, connected: connections.has(`${room.code}:${room.local ? 0 : i}`) })),
      gameplayAvailable: true, backup: recovery.seal(room)
    };
  }
  function broadcast(room) { io.to(room.code).emit('state', view(room)); }
  function makePlayer(name) {
    const token = randomBytes(32).toString('hex');
    return { token, player: { name: nameOf(name), tokenHash: tokenHash(token) } };
  }
  function attach(socket, room, seat) {
    // Older games receive a fresh allowance on first rejoin after the update.
    if(room.state.phase==='playing'&&!room.state.clock){
      const migrated=structuredClone(room);startClock(migrated.state,now());migrated.revision++;migrated.change='clock';commit(migrated);Object.assign(room,migrated);
    }
    const key = `${room.code}:${seat}`;
    const old = connections.get(key);
    if (old && old !== socket.id) io.sockets.sockets.get(old)?.disconnect(true);
    connections.set(key, socket.id);
    socket.data.roomCode = room.code;
    socket.data.seat = seat;
    socket.join(room.code);
  }

  io.on('connection', socket => {
    let windowStart = Date.now(), requests = 0, presenceRequests = 0;
    function on(event, handler) {
      socket.on(event, (payload, ack) => {
        if (typeof ack !== 'function') return;
        try {
          if (Date.now() - windowStart > 10000) { requests = 0; presenceRequests=0; windowStart = Date.now(); }
          if (event==='presence' ? ++presenceRequests > 100 : ++requests > 60) throw new Error('Please wait a moment before trying again.');
          if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid request.');
          handler(payload, result => ack({ ok: true, ...result }));
        } catch (error) {
          const internal = error.code && /^E[A-Z]+$/.test(error.code);
          if (internal) console.error('Room storage operation failed:', error.code);
          ack({ ok: false, error: internal ? 'Could not save your change. Please try again.' : error.message });
        }
      });
    }
    function unattached() {
      if (socket.data.roomCode) throw new Error('Leave this table before opening another.');
    }
    function current(payload) {
      const room = rooms.get(socket.data.roomCode);
      if (!room) throw new Error('Join a table first.');
      if (payload.revision !== room.revision) throw new Error('The table changed. Try your action again.');
      return structuredClone(room);
    }
    function finish(room, message) {
      room.change = 'action';
      delete room.recoveryBootstrap;
      room.revision++;
      room.log.push({ text: message, at: Date.now() });
      room.log = room.log.slice(-40);
      commit(room);
      broadcast(room);
    }
    on('createRoom', (data, done) => {
      unattached();
      if (rooms.size >= 200) throw new Error('This server has reached its table limit.');
      const first = makePlayer(data.name);
      const second = data.local === true ? makePlayer(data.partnerName) : null;
      let code;
      do { code = randomBytes(4).toString('hex').toUpperCase(); } while (rooms.has(code));
      const room = {
        code, local: !!second, revision: 0,
        players: second ? [first.player, second.player] : [first.player],
        state: createSetup(), log: [{ text: `${first.player.name} opened the table.`, at: Date.now() }]
      };
      commit(room);
      attach(socket, room, 0);
      done({ code, token: first.token, seat: 0 });
      broadcast(room);
    });
    on('joinRoom', (data, done) => {
      unattached();
      const previous = rooms.get(codeOf(data.code));
      if (!previous) throw new Error('Table not found. Check the code with your partner.');
      if (previous.local || previous.players.length === 2) throw new Error('Both seats are taken. Use your saved session to reconnect.');
      const room = structuredClone(previous);
      const next = makePlayer(data.name);
      room.players.push(next.player);
      finish(room, `${next.player.name} joined the table.`);
      attach(socket, room, 1);
      done({ code: room.code, token: next.token, seat: 1 });
      broadcast(room);
    });
    on('resumeRoom', (data, done) => {
      unattached();
      let room = rooms.get(codeOf(data.code));
      if ((!room || room.recoveryBootstrap) && data.backup) {
        const restored = recovery.open(data.backup);
        if (restored.code !== codeOf(data.code) || typeof data.token !== 'string' || !restored.players.some(p => p.tokenHash === tokenHash(data.token))) throw new Error('Saved seat could not be found.');
        if (rooms.size >= 200) throw new Error('This server has reached its table limit.');
        if (!room || restored.revision > room.revision) { restored.recoveryBootstrap = true; commit(restored); room = restored; }
      }
      if (!room || typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token)) throw new Error('Saved seat could not be found.');
      const seat = room.players.findIndex(p => p.tokenHash === tokenHash(data.token));
      if (seat < 0 || (room.local && seat !== 0)) throw new Error('Saved seat could not be found.');
      attach(socket, room, seat);
      done({ code: room.code, token: data.token, seat });
      broadcast(room);
    });
    on('setTanks', (data, done) => {
      const room = current(data);
      const seat = room.local ? data.seat : socket.data.seat;
      if (![0, 1].includes(seat)) throw new Error('Invalid seat.');
      updateTanks(room.state, seat, data.tanks);
      finish(room, `${room.players[seat].name} arranged their tanks.`);
      done({});
    });
    on('setReady', (data, done) => {
      const room = current(data);
      const seat = room.local ? data.seat : socket.data.seat;
      if (![0, 1].includes(seat) || typeof data.ready !== 'boolean') throw new Error('Invalid setup change.');
      if (room.state.phase !== 'setup') throw new Error('Tank setup is closed.');
      if (data.ready && data.tanks !== undefined) updateTanks(room.state, seat, data.tanks);
      room.state.ready[seat] = data.ready;
      finish(room, `${room.players[seat].name} ${data.ready ? 'locked' : 'unlocked'} their setup.`);
      done({});
    });
    on('rollFirst', () => { throw Error('The first player is chosen automatically when you start the game.'); });
    on('presence', (data, done) => {
      const room=rooms.get(socket.data.roomCode);
      if(!room||room.local)throw Error('Join an online table first.');
      const key=`${room.code}:${socket.data.seat}`;
      const previous=presence.get(key);
      if(previous&&now()-previous.at<80) {done({});return;}
      const value={...validatePresence(data),seat:socket.data.seat,revision:room.revision,at:now()};
      presence.set(key,value);socket.to(room.code).emit('presence',value);done({});
    });
    on('getPresence', (data, done) => {
      const room=rooms.get(socket.data.roomCode);if(!room||room.local)throw Error('Join an online table first.');
      done({presence:presence.get(`${room.code}:${1-socket.data.seat}`)||null});
      socket.to(room.code).emit('requestPresence');
    });
    on('startGame', (data, done) => {
      const room = current(data);
      if (room.players.length !== 2) throw new Error('Wait for your partner to join.');
      if(room.state.phase!=='setup'||!room.state.ready.every(Boolean))throw Error('Both players must lock their tank setup.');
      // Keep the saved field name for older tables; new games select a seat directly.
      if(!room.state.firstRoll)room.state.firstRoll={winner:randomInt(0,2)};
      room.state.firstRoll.revealAt=now()+3200;
      room.state = createGame(room.state);
      startClock(room.state,room.state.firstRoll.revealAt+1200);
      const roll=room.state.firstRoll;
      finish(room, `${room.players[roll.winner].name} was chosen to go first. The three-year game has begun.`);
      done({});
    });
    on('gameAction', (data, done) => {
      const room = current(data);
      const seat = room.local ? data.seat : socket.data.seat;
      settleClock(room.state,now());
      const turnKey = `${room.state.year}:${room.state.round}:${room.state.turnIndex}`;
      room.state = applyAction(room.state, seat, data.action);
      if(room.state.phase==='playing' && turnKey!==`${room.state.year}:${room.state.round}:${room.state.turnIndex}`)startClock(room.state,now());
      const label = {work:'completed a work action',fulfill:'delivered oil',bonus:'collected an upgrade benefit',machines:'ran their machines',skip:'passed an action',end:'ended their turn'}[data.action.type];
      finish(room, `${room.players[seat].name} ${label}${data.action.space ? ` (${data.action.space})` : ''}.`);
      done({});
    });
    on('leaveRoom', (data, done) => {
      const code = socket.data.roomCode;
      const key = `${code}:${socket.data.seat}`;
      if (connections.get(key) === socket.id) connections.delete(key);
      socket.leave(code || '');
      socket.data = {};
      done({});
      if (rooms.has(code)) broadcast(rooms.get(code));
    });
    socket.on('disconnect', () => {
      const code = socket.data.roomCode;
      const key = `${code}:${socket.data.seat}`;
      if (connections.get(key) === socket.id) connections.delete(key);
      if (rooms.has(code)) broadcast(rooms.get(code));
    });
  });

  const ticker=setInterval(()=>{
    for(const saved of rooms.values()){
      if(saved.state.phase!=='playing'||!saved.state.clock)continue;
      const room=structuredClone(saved),amount=settleClock(room.state,now());
      if(!amount)continue;
      room.revision++;room.change='clock';
      room.log.push({text:`${room.players[room.state.clock.actor].name} paid $${amount} in overtime.`,at:now()});room.log=room.log.slice(-40);
      try{commit(room);broadcast(room);}catch(error){console.error('Clock save failed:',error.code||error.message);}
    }
  },clockInterval);ticker.unref();
  return { app, server, io, close: () => new Promise(resolve => {clearInterval(ticker);io.close(resolve);}) };
}

if (require.main === module) {
  const instance = createApp();
  const port = process.env.PORT || 3001;
  instance.server.listen(port, '0.0.0.0', () => console.log(`Pipeline: http://localhost:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await instance.close(); process.exit(0); });
}
module.exports = { createApp };
