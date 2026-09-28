'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSetup, updateTanks, validateTanks, validateScoring, updateScoring } = require('../game/setup');

test('tank allocation enforces count, integrality and nonnegative capacities', () => {
  for (const allocation of [[0, 0, 0, 5], [5, 0, 0, 0], [2, 1, 1, 1]]) {
    assert.deepEqual(validateTanks(allocation), allocation);
  }
  for (const allocation of [null, {}, [5], [1, 1, 1, 1], [2, 1, 1, 2], [-1, 2, 2, 2], [1.5, 1.5, 1, 1], ['2', 1, 1, 1]]) {
    assert.throws(() => validateTanks(allocation));
  }
});
test('invalid and locked changes do not mutate the setup', () => {
  const setup = createSetup();
  assert.throws(() => updateTanks(setup, 0, [9, 0, 0, 0]));
  assert.deepEqual(setup.tanks[0], [0, 0, 0, 0]);
  setup.ready[0] = true;
  assert.throws(() => updateTanks(setup, 0, [5, 0, 0, 0]));
  assert.deepEqual(setup.tanks[0], [0, 0, 0, 0]);
});
test('valuation setup defaults to the printed tank card and validates house rules', () => {
  const setup = createSetup();
  assert.deepEqual(setup.scoring, {tankBonus:10,repeatOil:false,repeatPipelines:false,machinePipelines:false,levelThreeUpgrades:false});
  setup.ready = [true, true];
  updateScoring(setup, {tankBonus:5,repeatOil:true,repeatPipelines:false,machinePipelines:true,levelThreeUpgrades:false});
  assert.deepEqual(setup.ready, [false, false]);
  assert.equal(setup.scoring.tankBonus, 5);
  for (const invalid of [null, {}, {tankBonus:7,repeatOil:false,repeatPipelines:false,machinePipelines:false,levelThreeUpgrades:false}, {tankBonus:10,repeatOil:'yes',repeatPipelines:false,machinePipelines:false,levelThreeUpgrades:false}]) {
    assert.throws(() => validateScoring(invalid));
  }
});
