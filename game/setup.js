'use strict';

// Confirmed against the user's player board and rulebook; see data/sources.json.
const { setup } = require('../data/rules.json');
const GRADES = ['Crude', 'Low', 'Mid', 'High'];
const YEAR_ROUNDS = [...setup.roundsPerYear];
const DEFAULT_SCORING = Object.freeze({
  tankBonus: 10,
  repeatOil: false,
  repeatPipelines: false,
  machinePipelines: false,
  levelThreeUpgrades: false
});

function validateTanks(tanks) {
  if (!Array.isArray(tanks) || tanks.length !== 4 ||
      tanks.some(n => !Number.isInteger(n) || n < 0 || n > setup.startingTanks) ||
      tanks.reduce((a, b) => a + b, 0) !== setup.startingTanks) {
    throw new Error('Distribute exactly five tanks across the four grades.');
  }
  return [...tanks];
}

function createSetup() {
  return { phase: 'setup', cash: [setup.startingCash, setup.startingCash], tanks: [[0, 0, 0, 0], [0, 0, 0, 0]], ready: [false, false], scoring: {...DEFAULT_SCORING} };
}

function updateTanks(state, seat, tanks) {
  if (state.phase !== 'setup') throw new Error('Tank setup is closed.');
  if (state.ready[seat]) throw new Error('Unlock your setup before moving tanks.');
  state.tanks[seat] = validateTanks(tanks);
}

function validateScoring(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose valid valuation rules.');
  if (![0, 5, 10].includes(value.tankBonus)) throw new Error('Tank valuation must be off, $5, or $10 per tank.');
  for (const key of ['repeatOil', 'repeatPipelines', 'machinePipelines', 'levelThreeUpgrades']) {
    if (typeof value[key] !== 'boolean') throw new Error('Choose valid valuation rules.');
  }
  return {
    tankBonus: value.tankBonus,
    repeatOil: value.repeatOil,
    repeatPipelines: value.repeatPipelines,
    machinePipelines: value.machinePipelines,
    levelThreeUpgrades: value.levelThreeUpgrades
  };
}

function normalizeScoring(value) {
  return value === undefined ? {...DEFAULT_SCORING} : validateScoring(value);
}

function updateScoring(state, value) {
  if (state.phase !== 'setup') throw new Error('Valuation setup is closed.');
  state.scoring = validateScoring(value);
  state.ready = [false, false];
}

module.exports = { GRADES, YEAR_ROUNDS, DEFAULT_SCORING, validateTanks, validateScoring, normalizeScoring, createSetup, updateTanks, updateScoring };
