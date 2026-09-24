'use strict';

const $ = id => document.getElementById(id);
const socket = io({ autoConnect: false });
const STORE = 'pipeline.seats.v1';
let mode = 'create', room = null, session = null, busy = false, noticeTimer;
let draftTanks = {};
let rollTimer=null,rollKey=null,serverOffset=0;
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sound = name => window.PipelineSound?.play(name);
function readStore() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function notice(message) {
  $('notice').textContent = message;
  $('notice').hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 6500);
}
function saveSession(data) {
  session = { code: data.code, token: data.token, seat: data.seat };
  try {
    sessionStorage.setItem('pipeline.active', JSON.stringify(session));
    const saved = readStore();
    const key = `${data.code}:${data.seat}`;
    saved[key] = { ...session, name: saved[key]?.name || $('name').value || 'Saved seat' };
    localStorage.setItem(STORE, JSON.stringify(saved));
  } catch { notice('Browser storage is unavailable. Keep this tab open to retain your seat.'); }
}
function savedTables() {
  const saved = Object.values(readStore());
  $('saved').hidden = saved.length === 0;
  $('saved-select').innerHTML = saved.map(s => `<option value="${escapeHTML(`${s.code}:${s.seat}`)}">${escapeHTML(s.code)} · ${escapeHTML(s.name)}</option>`).join('');
}
function request(event, payload) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) return reject(new Error('Connection lost. Waiting to reconnect…'));
    socket.timeout(10000).emit(event, payload, (error, reply) => {
      if (error) return reject(new Error('The server did not respond. Reconnect before retrying.'));
      if (!reply?.ok) return reject(new Error(reply?.error || 'Could not complete that action.'));
      resolve(reply);
    });
  });
}
async function run(action) {
  if (busy) return;
  busy = true; updateConnection();
  try { await action(); } catch (error) { notice(error.message); }
  finally { busy = false; updateConnection(); if (room) render(); }
}
function updateConnection() {
  $('submit-room').disabled = busy || !socket.connected;
  $('resume').disabled = busy || !socket.connected;
  $('leave').disabled = busy || !socket.connected;
}
function setMode(next) {
  if (next !== mode) sound('click');
  mode = next;
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.classList.toggle('selected', button.dataset.mode === mode);
    button.setAttribute('aria-pressed', button.dataset.mode === mode);
  });
  $('code-field').hidden = mode !== 'join'; $('code').required = mode === 'join';
  $('partner-field').hidden = mode !== 'local'; $('partner').required = mode === 'local';
  $('submit-room').innerHTML = `${mode === 'join' ? 'Join your partner' : mode === 'local' ? 'Open a shared table' : 'Create a private table'} <span>↗</span>`;
}
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('room-form').addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    const reply = await request(mode === 'join' ? 'joinRoom' : 'createRoom', {
      name: $('name').value, code: $('code').value, local: mode === 'local', partnerName: $('partner').value
    });
    saveSession(reply);
    sound('confirm');
  });
});
$('resume').addEventListener('click', () => run(async () => {
  const saved = readStore()[$('saved-select').value];
  if (saved) { saveSession(await request('resumeRoom', saved)); sound('confirm'); }
}));
$('leave').addEventListener('click', () => run(async () => {
  await request('leaveRoom', {});
  room = null; session = null; draftTanks = {};
  try { sessionStorage.removeItem('pipeline.active'); } catch {}
  $('table').hidden = true; $('lobby').hidden = false; savedTables();
  sound('click');
}));
$('copy').addEventListener('click', async () => {
  if (!room) return;
  const url = new URL(location.origin); url.searchParams.set('room', room.code);
  try { await navigator.clipboard.writeText(url.href); notice(room.local?'Table link copied. This is a same-device table; choose Create a table for remote play.':'Invite link copied. Send it to your partner.'); }
  catch { notice(`Share this table code: ${room.code}`); }
  sound('click');
});

function showOpeningRoll() {
  const roll=room.state.firstRoll,stage=$('opening-roll');
  const now=Date.now()+serverOffset;
  if(room.state.phase!=='playing'||!roll?.revealAt||now>=roll.revealAt+1200){
    clearInterval(rollTimer);rollTimer=null;stage.hidden=true;return false;
  }
  $('table').hidden=true;stage.hidden=false;
  const key=`${room.code}:${roll.revealAt}`;
  if(key!==rollKey){
    clearInterval(rollTimer);rollTimer=null;
    rollKey=key;
    stage.querySelectorAll('[data-roll-name]').forEach(n=>n.textContent=room.players[Number(n.dataset.rollName)].name);
    $('roll-result').textContent='Choosing the first player…';
    stage.querySelectorAll('[data-starter-avatar]').forEach(n=>{
      const words=room.players[Number(n.dataset.starterAvatar)].name.trim().split(/\s+/);
      n.textContent=words.length>1?words.map(w=>Array.from(w)[0]).slice(0,2).join('').toUpperCase():Array.from(words[0]).slice(0,2).join('').toUpperCase();
    });
    stage.querySelectorAll('.roll-player').forEach(n=>n.classList.remove('roll-winner','starter-highlight'));
    stage.focus({preventScroll:true});
  }
  if(!rollTimer){
    const pips=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick=()=>{
      if(!room||`${room.code}:${room.state.firstRoll?.revealAt}`!==key){clearInterval(rollTimer);rollTimer=null;stage.hidden=true;return;}
      const time=Date.now()+serverOffset,settled=time>=roll.revealAt;
      const progress=Math.max(0,Math.min(1,(time-roll.revealAt+3200)/3200));
      const highlighted=settled?roll.winner:(Math.floor(14*(1-(1-progress)**2))+roll.winner)%2;
      stage.querySelectorAll('.roll-player').forEach((card,i)=>card.classList.toggle('starter-highlight',(!reduced||settled)&&i===highlighted));
      if(settled){
        const result=`${room.players[roll.winner].name} goes first`;
        if($('roll-result').textContent!==result){
          $('roll-result').textContent=result;
          stage.querySelectorAll('.roll-player')[roll.winner].classList.add('roll-winner');
          sound('confirm');
        }
      }
      if(time>=roll.revealAt+1200){
        clearInterval(rollTimer);rollTimer=null;stage.hidden=true;render();
        $('game-board').tabIndex=-1;$('game-board').focus({preventScroll:true});
      }
    };
    rollTimer=setInterval(tick,90);tick();
  }
  return true;
}

function render() {
  if (!room) return;
  $('lobby').hidden = true; $('table').hidden = false;
  $('table-code').textContent = room.code;
  $('table-identity').hidden = room.players.length === 2;
  $('copy').hidden = room.local && room.state.phase !== 'setup';
  $('download-save').hidden = !session || !room.backup;
  if (session && room.backup) {
    try { const saved=readStore(), key=`${session.code}:${session.seat}`;
      saved[key]={...saved[key],...session,backup:room.backup}; localStorage.setItem(STORE,JSON.stringify(saved));
    } catch {}
  }
  if(showOpeningRoll())return;
  $('waiting').hidden = room.players.length === 2;
  const setup = room.state.phase === 'setup';
  $('players').hidden = !setup;
  $('start-game').hidden = !setup;
  $('start-game').disabled = busy || !socket.connected || room.players.length !== 2 || !room.state.ready?.every(Boolean);
  $('log').innerHTML = [...room.log].reverse().map(entry => `<li>${escapeHTML(entry.text)}</li>`).join('');
  PipelineTable.render(room, session, async action => {
    if (busy) throw new Error('Waiting for the previous action.');
    busy = true;
    try { await request('gameAction', { revision: room.revision, seat: room.state.bonuses?.[0]?.actor ?? room.state.turn?.actor, action }); }
    finally { busy = false; updateConnection(); render(); }
  }, notice, busy || !socket.connected);
  if (!setup) return;
  const grades = ['Crude', 'Low-grade', 'Mid-grade', 'High-grade'];
  $('players').innerHTML = [0, 1].map(seat => {
    const player = room.players[seat];
    if (!player) return '<article class="player empty-seat"><h2>A seat for your partner.</h2><p>Waiting for them to join…</p></article>';
    const mine = room.local || session?.seat === seat;
    const ready = room.state.ready[seat];
    const tanks = draftTanks[seat] || room.state.tanks[seat];
    const total = tanks.reduce((a, b) => a + b, 0);
    const disabled = !mine || ready || busy || !socket.connected;
    return `<article class="player"><div class="player-top"><div><div class="player-name">${escapeHTML(player.name)}</div></div><div class="cash">$40<small>starting cash</small></div></div>
      ${[3,2,1,0].map(index => { const grade=grades[index]; return `<div class="tank-row"><span class="tank-grade">${grade}<small>${tanks[index] * 2} barrel capacity</small></span><div class="tank-icons" aria-hidden="true">${Array.from({ length: tanks[index] }, () => '<span class="tank">Ⅱ</span>').join('')}</div><div class="tank-controls"><button data-tank="${seat},${index},-1" aria-label="Remove ${grade} tank for ${escapeHTML(player.name)}" ${disabled || tanks[index] === 0 ? 'disabled' : ''}>−</button><output aria-label="${grade} tanks">${tanks[index]}</output><button data-tank="${seat},${index},1" aria-label="Add ${grade} tank for ${escapeHTML(player.name)}" ${disabled || tanks[index] === 5 || total === 5 ? 'disabled' : ''}>+</button></div></div>`;}).join('')}
      <p class="tank-total ${total !== 5 ? 'invalid' : ''}">${total === 5 ? (ready ? 'Five tanks saved and locked.' : mine ? '5 of 5 tanks placed. Remove one to move it to another grade.' : '5 of 5 tanks placed.') : `${5 - total} tank${5 - total === 1 ? '' : 's'} left to place.`}</p>
      <div class="player-actions">${mine ? `<button class="primary" data-ready="${seat}" ${busy || !socket.connected || total !== 5 ? 'disabled' : ''}>${ready ? 'Unlock setup' : 'Save & lock'}</button>` : `<span class="helper">${ready ? 'Your partner has finished their setup.' : 'Your partner is arranging their tanks.'}</span>`}</div></article>`;
  }).join('');
  $('log').innerHTML = [...room.log].reverse().map(entry => `<li><time>${escapeHTML(new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</time>${escapeHTML(entry.text)}</li>`).join('');
}
$('start-game').addEventListener('click', () => run(async () => { await request('startGame', {revision:room.revision}); sound('confirm'); }));
$('players').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || !room) return;
  if (button.dataset.tank) {
    const [seat, grade, delta] = button.dataset.tank.split(',').map(Number);
    draftTanks[seat] ||= [...room.state.tanks[seat]];
    draftTanks[seat][grade] += delta;
    sound('click');
    render();
  }
  if (button.dataset.ready !== undefined) run(async () => {
    const seat = Number(button.dataset.ready);
    if (room.state.ready[seat]) {
      await request('setReady', { seat, ready: false, revision: room.revision });
      sound('click');
    } else {
      const tanks = draftTanks[seat] || room.state.tanks[seat];
      await request('setReady', { seat, tanks, ready: true, revision: room.revision });
      delete draftTanks[seat];
      sound('confirm');
    }
  });
});

socket.on('state', data => {
  serverOffset=(data.serverNow||Date.now())-Date.now();
  room = data; updateConnection(); render();
});
socket.on('connect', async () => {
  updateConnection();
  let active = session;
  try { active ||= JSON.parse(sessionStorage.getItem('pipeline.active')); } catch {}
  if (active) {
    try { const saved=readStore()[`${active.code}:${active.seat}`]; saveSession(await request('resumeRoom', {...active,backup:saved?.backup})); render(); }
    catch (error) {
      room = null; session = null;
      $('table').hidden = true; $('lobby').hidden = false;
      try { sessionStorage.removeItem('pipeline.active'); } catch {}
      notice(`${error.message} Your table may have been reset on the server.`);
    }
  }
});
socket.on('disconnect', reason => {
  updateConnection(); render();
  if (reason === 'io server disconnect') notice('This seat was opened in another tab. Reload to take it back.');
});
socket.on('connect_error', () => { updateConnection(); });
$('download-save').addEventListener('click', () => {
  if (!room?.backup || !session) return;
  const blob=new Blob([JSON.stringify({format:'pipeline-seat-v1',...session,backup:room.backup})],{type:'application/json'});
  const url=URL.createObjectURL(blob), link=document.createElement('a');link.href=url;link.download=`pipeline-${room.code}-seat-${session.seat+1}.json`;link.click();URL.revokeObjectURL(url);
  notice('Recovery file saved. Keep it private: it restores your seat.');
});
$('restore-file').addEventListener('change', () => run(async () => {
  const file=$('restore-file').files[0];if(!file)return;
  if(file.size>200000)throw new Error('That recovery file is too large.');
  const saved=JSON.parse(await file.text());if(saved.format!=='pipeline-seat-v1')throw new Error('Choose a Pipeline recovery file.');
  saveSession(await request('resumeRoom',saved));sound('confirm');render();
}));
const inviteCode = new URLSearchParams(location.search).get('room');
if (inviteCode) { setMode('join'); $('code').value = inviteCode.slice(0, 8); }
else setMode('create');
savedTables(); socket.connect();
