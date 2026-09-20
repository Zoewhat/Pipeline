'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { io } = require('socket.io-client');
const { createApp } = require('../server');

async function start(dir) {
  const app = createApp({ storageDir: dir });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  return { ...app, url: `http://127.0.0.1:${app.server.address().port}` };
}
async function connect(url) {
  const socket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  socket.on('state', state => { socket.latest = state; });
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  return socket;
}
async function call(socket, event, data) {
  const reply = await new Promise((resolve, reject) => socket.timeout(3000).emit(event, data, (error, result) => error ? reject(error) : resolve(result)));
  // Allow other packets in the same WebSocket message to finish dispatching.
  await new Promise(resolve => setImmediate(resolve));
  return reply;
}
function waitState(socket, predicate) {
  if (socket.latest && predicate(socket.latest)) return Promise.resolve(socket.latest);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('state', listener); reject(new Error('State timeout')); }, 3000);
    function listener(state) { if (predicate(state)) { clearTimeout(timer); socket.off('state', listener); resolve(state); } }
    socket.on('state', listener);
  });
}

test('two-player rooms authorize seats, validate revisions, and survive reconnect/restart', async t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pipeline-test-'));
  let app = await start(dir);
  const clients = [];
  t.after(async () => { clients.forEach(c => c.disconnect()); await app.close(); rmSync(dir, { recursive: true, force: true }); });
  const a = await connect(app.url), b = await connect(app.url), stranger = await connect(app.url);
  clients.push(a, b, stranger);
  assert.equal((await call(a, 'createRoom', { name: '   ' })).ok, false);
  const owner = await call(a, 'createRoom', { name: 'Zoe' });
  assert.equal(owner.ok, true);
  assert.match(owner.code, /^[A-F0-9]{8}$/);
  assert.equal((await call(a, 'createRoom', { name: 'Duplicate' })).ok, false);
  const partner = await call(b, 'joinRoom', { code: owner.code.toLowerCase(), name: 'Partner' });
  assert.equal(partner.ok, true);
  assert.equal(partner.seat, 1);
  const shared = await waitState(a, state => state.players.length === 2);
  assert.equal(shared.gameplayAvailable, true);
  assert.equal(JSON.stringify(shared).includes('token'), false);
  assert.equal((await call(stranger, 'joinRoom', { code: owner.code, name: 'Third' })).ok, false);
  assert.equal((await call(stranger, 'resumeRoom', { code: owner.code, token: 'a'.repeat(64) })).ok, false);
  assert.equal((await call(stranger, 'setTanks', { tanks: [5, 0, 0, 0], revision: shared.revision })).ok, false);
  assert.equal((await call(a, 'setTanks', { tanks: [5, 0, 0, 0], revision: -1 })).ok, false);
  assert.equal((await call(a, 'setTanks', { tanks: [6, -1, 0, 0], revision: shared.revision })).ok, false);
  // Client-supplied seat cannot modify the other player's tanks.
  assert.equal((await call(a, 'setTanks', { seat: 1, tanks: [1, 2, 1, 1], revision: shared.revision })).ok, true);
  await waitState(b, state => state.revision > shared.revision);
  assert.deepEqual(a.latest.state.tanks[0], [1, 2, 1, 1]);
  assert.deepEqual(a.latest.state.tanks[1], [0, 0, 0, 0]);
  assert.equal((await call(b, 'setReady', { tanks: [0, 0, 0, 5], ready: true, revision: b.latest.revision })).ok, true);
  await waitState(a, state => state.state.ready[1]);
  assert.equal((await call(b, 'setTanks', { tanks: [5, 0, 0, 0], revision: b.latest.revision })).ok, false);
  assert.deepEqual(a.latest.state.tanks[1], [0, 0, 0, 5]);
  assert.equal((await call(b, 'setReady', { ready: 'yes', revision: b.latest.revision })).ok, false);
  const duplicate = await connect(app.url); clients.push(duplicate);
  assert.equal((await call(duplicate, 'resumeRoom', owner)).ok, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(a.connected, false);
  duplicate.disconnect(); b.disconnect(); stranger.disconnect();
  const saved = readFileSync(path.join(dir, 'rooms.json'), 'utf8');
  assert.equal(saved.includes(owner.token), false);
  assert.equal(saved.includes(partner.token), false);
  await app.close();
  app = await start(dir);
  const resumed = await connect(app.url); clients.push(resumed);
  const reply = await call(resumed, 'resumeRoom', partner);
  assert.equal(reply.ok, true);
  assert.equal(reply.seat, 1);
  await waitState(resumed, state => state.code === owner.code);
  assert.deepEqual(resumed.latest.state.tanks[1], [0, 0, 0, 5]);
  assert.equal(resumed.latest.state.ready[1], true);
  assert.equal(resumed.latest.state.phase, 'setup');
  assert.equal((await fetch(`${app.url}/health`)).status, 200);
  assert.equal((await fetch(`${app.url}/`)).headers.get('x-frame-options'), 'DENY');
});

test('local mode controls both seats but cannot accept an online third player', async t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pipeline-local-'));
  const app = await start(dir);
  const local = await connect(app.url), remote = await connect(app.url);
  t.after(async () => { local.disconnect(); remote.disconnect(); await app.close(); rmSync(dir, { recursive: true, force: true }); });
  const owner = await call(local, 'createRoom', { name: 'One', partnerName: 'Two', local: true });
  assert.equal(owner.ok, true);
  assert.equal((await call(local, 'setReady', { seat: 1, ready: true, tanks: [1, 1, 1, 2], revision: 0 })).ok, true);
  assert.equal(local.latest.state.ready[1], true);
  assert.equal(local.latest.state.ready[0], false);
  assert.equal((await call(remote, 'joinRoom', { code: owner.code, name: 'Three' })).ok, false);
  assert.equal((await call(local, 'setReady', { seat: 5, ready: true, revision: 1 })).ok, false);
  assert.equal((await call(local, 'leaveRoom', {})).ok, true);
  assert.equal((await call(local, 'resumeRoom', owner)).ok, true);
  assert.deepEqual(local.latest.state.tanks[1], [1, 1, 1, 2]);
});

test('game actions enforce the connected seat, hide decks, persist turns, and reject stale or malformed moves', async t => {
  const dir=mkdtempSync(path.join(tmpdir(),'pipeline-game-network-'));const app=await start(dir);const a=await connect(app.url),b=await connect(app.url);
  t.after(async()=>{a.disconnect();b.disconnect();await app.close();rmSync(dir,{recursive:true,force:true});});
  const owner=await call(a,'createRoom',{name:'One'});await call(b,'joinRoom',{name:'Two',code:owner.code});await waitState(a,x=>x.players.length===2);
  await call(a,'setReady',{ready:true,tanks:[2,1,1,1],revision:a.latest.revision});await waitState(b,x=>x.state.ready[0]);await call(b,'setReady',{ready:true,tanks:[2,1,1,1],revision:b.latest.revision});await waitState(a,x=>x.state.ready.every(Boolean));
  assert.equal((await call(a,'startGame',{revision:a.latest.revision})).ok,true);await waitState(b,x=>x.state.phase==='playing');
  assert.equal(a.latest.state.deck,undefined);assert.equal(a.latest.state.contracts[0].reserve.length,1);
  const seat=a.latest.state.turn.actor,active=seat===0?a:b,other=seat===0?b:a,revision=active.latest.revision;
  assert.equal((await call(other,'gameAction',{seat,revision,action:{type:'skip'}})).ok,false);
  assert.equal((await call(active,'gameAction',{revision,action:{type:'work',space:'government',quadrant:-1}})).ok,false);
  assert.equal((await call(active,'setReady',{revision,ready:false})).ok,false);
  assert.equal((await call(active,'gameAction',{revision,seat:1-seat,action:{type:'skip'}})).ok,true);
  await waitState(other,x=>x.revision>revision);assert.equal(other.latest.state.turn.stage,'machine');
  assert.equal((await call(active,'gameAction',{revision,action:{type:'end'}})).ok,false);
  assert.equal(JSON.parse(readFileSync(path.join(dir,'rooms.json'),'utf8')).rooms[0].state.turn.stage,'machine');
});

test('encrypted browser recovery restores a lost server save only with the right seat and stable key',async t=>{
  const one=mkdtempSync(path.join(tmpdir(),'pipeline-recovery-one-')),two=mkdtempSync(path.join(tmpdir(),'pipeline-recovery-two-'));
  const secret='test-only-stable-backup-secret';let app=createApp({storageDir:one,backupSecret:secret});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let client=await connect(`http://127.0.0.1:${app.server.address().port}`);
  const owner=await call(client,'createRoom',{name:'Recovered',local:true,partnerName:'Partner'});const backup=client.latest.backup;assert.ok(backup);assert.equal(backup.includes(owner.token),false);
  client.disconnect();await app.close();app=createApp({storageDir:two,backupSecret:secret});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));client=await connect(`http://127.0.0.1:${app.server.address().port}`);
  t.after(async()=>{client.disconnect();await app.close();rmSync(one,{recursive:true,force:true});rmSync(two,{recursive:true,force:true});});
  assert.equal((await call(client,'resumeRoom',{...owner,token:'a'.repeat(64),backup})).ok,false);
  assert.equal((await call(client,'resumeRoom',{...owner,backup:backup.slice(0,-8)+'abcdefgh'})).ok,false);
  assert.equal((await call(client,'resumeRoom',{...owner,backup})).ok,true);assert.equal(client.latest.code,owner.code);assert.equal(client.latest.players[0].name,'Recovered');
});
