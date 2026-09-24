'use strict';
// Optional house rule: five minutes per turn, then $5 per completed extra minute.
function startClock(state, now) {
  state.clock = { actor: state.turn.actor, startedAt: now, chargedMinutes: 0, allowanceMs: 300000 };
}
function settleClock(state, now) {
  if (state.phase !== 'playing' || !state.clock) return 0;
  const c = state.clock;
  const minutes = Math.max(0, Math.floor((now - c.startedAt - c.allowanceMs) / 60000));
  const due = Math.max(0, minutes - c.chargedMinutes);
  if (due) {
    state.players[c.actor].cash -= due * 5;
    state.players[1-c.actor].cash += due * 5;
    c.chargedMinutes = minutes;
  }
  return due * 5;
}
module.exports = { startClock, settleClock };
