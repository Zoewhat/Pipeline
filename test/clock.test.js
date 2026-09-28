'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {startClock,settleClock,setClockPaused}=require('../game/clock');

function state(){return {phase:'playing',turn:{actor:0},players:[{cash:40},{cash:40}]};}

test('paused clocks preserve remaining time and do not charge overtime',()=>{
  const s=state();startClock(s,1000);
  assert.equal(setClockPaused(s,121000,true),0);
  assert.equal(s.clock.pausedAt,121000);
  assert.equal(settleClock(s,900000),0);
  assert.deepEqual(s.players.map(p=>p.cash),[40,40]);
  assert.equal(setClockPaused(s,421000,false),0);
  assert.equal(s.clock.startedAt,301000);
  assert.equal(settleClock(s,661000),5);
  assert.deepEqual(s.players.map(p=>p.cash),[35,45]);
});

test('clock pause controls validate state and requested transition',()=>{
  const s=state();startClock(s,0);
  assert.throws(()=>setClockPaused(s,1,'yes'),/whether to pause/);
  setClockPaused(s,1,true);
  assert.throws(()=>setClockPaused(s,2,true),/already paused/);
  setClockPaused(s,3,false);
  assert.throws(()=>setClockPaused(s,4,false),/already running/);
  s.phase='finished';
  assert.throws(()=>setClockPaused(s,5,true),/not running/);
});
