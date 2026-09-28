'use strict';
// Optional house rule: five minutes per turn, then $5 per completed extra minute.
function startClock(state, now) {
  state.clock = { actor: state.turn.actor, startedAt: now, chargedMinutes: 0, allowanceMs: 300000 };
}
function settleClock(state, now) {
  if (state.phase !== 'playing' || !state.clock) return 0;
  const c = state.clock;
  if (Number.isFinite(c.pausedAt)) return 0;
  const minutes = Math.max(0, Math.floor((now - c.startedAt - c.allowanceMs) / 60000));
  const due = Math.max(0, minutes - c.chargedMinutes);
  if (due) {
    state.players[c.actor].cash -= due * 5;
    state.players[1-c.actor].cash += due * 5;
    c.chargedMinutes = minutes;
  }
  return due * 5;
}
function setClockPaused(state, now, paused) {
  if (state.phase !== 'playing' || !state.clock) throw new Error('The turn clock is not running.');
  if (typeof paused !== 'boolean') throw new Error('Choose whether to pause or resume the turn clock.');
  const c = state.clock, isPaused = Number.isFinite(c.pausedAt);
  if (paused === isPaused) throw new Error(`The turn clock is already ${paused ? 'paused' : 'running'}.`);
  if (paused) {
    const charged = settleClock(state, now);
    c.pausedAt = now;
    return charged;
  }
  c.startedAt += Math.max(0, now - c.pausedAt);
  delete c.pausedAt;
  return 0;
}
module.exports = { startClock, settleClock, setClockPaused };
