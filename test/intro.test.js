'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../data/components.json');
const { introductoryPreset, scoreIntroAssets } = require('../game/intro');

test('intro preset fixes three valuations and excludes the three sevens', () => {
  const preset = introductoryPreset();
  assert.deepEqual(preset.valuationNumbers, [1, 2, 3]);
  assert.equal(preset.players, 2);
  assert.equal(preset.includeValuationTile, true);
  assert.deepEqual(preset.refinementPool.map(m => m.value), [4, 4, 4, 5, 5, 5, 6, 6, 6]);
  preset.refinementPool[0].value = 99;
  assert.equal(introductoryPreset().refinementPool[0].value, 4);
  assert.equal(catalog.upgrades.reduce((n, u) => n + u.levels.reduce((m, l) => m + l.copies, 0), 0), 35);
});

test('two-player markets exclude covered slots and retain per-row demand', () => {
  for (const market of catalog.markets) for (const row of market.rows) {
    assert.deepEqual(row.twoPlayerSlots, row.grade === 0 ? [0, 1, 2, 3, 4, 5] : [2, 3]);
    if (row.grade === 0) assert.equal(row.refresh.maximum, 4);
  }
  const market = catalog.markets.find(m => m.id === 'market-2');
  const lowOrange = market.rows.find(r => r.color === 'orange' && r.grade === 1);
  assert.equal(lowOrange.refresh.maximum, 1); // IMG_0366 M.2 orange, bottom row.
  assert.deepEqual(lowOrange.twoPlayerSlots.map(i => lowOrange.printedSlotPrices[i]), [30, 30]);
  const highSilver = catalog.markets.find(m => m.id === 'market-1').rows.find(r => r.color === 'silver' && r.grade === 3);
  assert.equal(highSilver.refresh.maximum, 0); // No removal symbol on this overlay row.
});

function position() {
  return { tanks: [2, 1, 1, 1], barrels: [{ color: 'orange', grade: 0 }, { color: 'teal', grade: 2 }, { color: 'silver', grade: 3 }],
    pipelines: [{ id: 'a', color: 'teal', segments: 9, machineAttached: false }, { id: 'b', color: 'teal', segments: 15, machineAttached: true }, { id: 'c', color: 'orange', segments: 3, machineAttached: true }],
    costsByColor: { teal: [4, 5, 6], orange: [4, 5, 6] } };
}
test('intro assets count every line, ignore crude, and add the separate machine tile', () => {
  const input = position(), before = structuredClone(input);
  assert.deepEqual(scoreIntroAssets(input), { oilAssets: 50, pipelineAssets: 50, valuation1: 50, valuation2: 50, valuation3: 50, valuationTile: 30, total: 280 });
  assert.deepEqual(input, before);
  input.pipelines[1].machineAttached = false;
  assert.equal(scoreIntroAssets(input).total, 250);
});
test('intro scoring rejects duplicate lines, malformed grades and impossible storage', () => {
  const duplicate = position(); duplicate.pipelines.push({ ...duplicate.pipelines[0] });
  assert.throws(() => scoreIntroAssets(duplicate), /unique/);
  const invalid = position(); invalid.barrels[0].grade = '2';
  assert.throws(() => scoreIntroAssets(invalid), /integer/);
  const full = position(); full.tanks[3] = 0;
  assert.throws(() => scoreIntroAssets(full), /capacity/);
  const missing = position(); delete missing.costsByColor.teal;
  assert.throws(() => scoreIntroAssets(missing), /costs/);
});
