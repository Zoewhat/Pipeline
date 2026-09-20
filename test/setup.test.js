'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSetup, updateTanks, validateTanks } = require('../game/setup');

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
