'use strict';

// Confirmed against the user's player board and rulebook; see data/sources.json.
const { setup } = require('../data/rules.json');
const GRADES = ['Crude', 'Low', 'Mid', 'High'];
const YEAR_ROUNDS = [...setup.roundsPerYear];

function validateTanks(tanks) {
  if (!Array.isArray(tanks) || tanks.length !== 4 ||
      tanks.some(n => !Number.isInteger(n) || n < 0 || n > setup.startingTanks) ||
      tanks.reduce((a, b) => a + b, 0) !== setup.startingTanks) {
    throw new Error('Distribute exactly five tanks across the four grades.');
  }
  return [...tanks];
}

function createSetup() {
  return { phase: 'setup', cash: [setup.startingCash, setup.startingCash], tanks: [[0, 0, 0, 0], [0, 0, 0, 0]], ready: [false, false] };
}

function updateTanks(state, seat, tanks) {
  if (state.phase !== 'setup') throw new Error('Tank setup is closed.');
  if (state.ready[seat]) throw new Error('Unlock your setup before moving tanks.');
  state.tanks[seat] = validateTanks(tanks);
}

module.exports = { GRADES, YEAR_ROUNDS, validateTanks, createSetup, updateTanks };
