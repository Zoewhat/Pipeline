'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { quoteGovernmentPipes, quoteShopPipes, barrelRevenue, penaltyCost, refinementValue, refinementCost, highestGrade, pipelineAssetValue } = require('../game/rules');
const { refineBatch } = require('../game/refinement');

test('construction uses printed nonlinear prices and rejects nonexistent bundles', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(quoteGovernmentPipes), [5, 10, 20, 35, 55]);
  assert.equal(quoteShopPipes(2), 15); assert.equal(quoteShopPipes(4), 40);
  for (const n of [0, 1, 3, 5, '2', 2.5]) assert.throws(() => quoteShopPipes(n));
  for (const n of [0, 6, NaN, '1']) assert.throws(() => quoteGovernmentPipes(n));
});
test('contract, order and end-game payments are distinct; penalties are cumulative', () => {
  assert.equal(barrelRevenue('contract', 2, 2), 70);
  assert.equal(barrelRevenue('order', 2, 2), 90);
  assert.equal(barrelRevenue('oilAtEnd', 2, 2), 40);
  assert.equal(barrelRevenue('oilAtEnd', 0, 2), 0);
  assert.throws(() => barrelRevenue('contract', 0));
  assert.throws(() => barrelRevenue('market', 1));
  assert.throws(() => barrelRevenue('order', 3, -2));
  assert.equal(penaltyCost(0), 0); assert.equal(penaltyCost(3), 90); assert.equal(penaltyCost(10), 650);
  assert.throws(() => penaltyCost(11));
});
test('refinement sums intermediate costs and engineering II replaces I', () => {
  // Teal refinement markers shown in the physical rulebook's p9 example.
  const costs = [4, 6, 5];
  assert.equal(refinementCost(costs, 0, 2), 10);
  assert.equal(refinementCost(costs, 1, 3), 11);
  assert.equal(highestGrade(costs, 9), 1);
  assert.equal(highestGrade(costs, 10), 2);
  assert.equal(highestGrade(costs, 15), 3);
  assert.equal(refinementValue(7, 1), 8);
  assert.equal(refinementValue(8, 2), 12);
  assert.equal(pipelineAssetValue(costs, 3), 0);
  assert.equal(pipelineAssetValue(costs, 15), 30);
  assert.throws(() => refinementCost(costs, 1, 1));
  assert.throws(() => refinementCost([4, null, 5], 0, 1));
  assert.throws(() => highestGrade(costs, Infinity));
  assert.throws(() => refinementValue(8, 3));
});

function fixture() {
  // Synthetic IDs and trusted pipeline summaries test the resolver; they are
  // deliberately not game components and are never added to the catalog.
  return { tanks: [1, 0, 1, 1], barrels: [{ id: 'a', color: 'teal', grade: 0 }],
    pipelines: [{ id: 'p', color: 'teal', value: 10 }, { id: 'q', color: 'teal', value: 15 }],
    costsByColor: { teal: [4, 6, 5] }, selections: [{ pipelineId: 'p', barrelId: 'a', toGrade: 2 }] };
}
test('multi-grade refining needs only destination tanks and leaves the input unchanged', () => {
  const input = fixture(), before = structuredClone(input);
  assert.deepEqual(refineBatch(input), [{ id: 'a', color: 'teal', grade: 2 }]);
  assert.deepEqual(input, before);
  input.tanks[2] = 0;
  assert.throws(() => refineBatch(input), /tank capacity/);
  assert.equal(input.barrels[0].grade, 0);
});
test('simultaneous refining frees destination capacity irrespective of selection order', () => {
  const input = fixture();
  input.tanks = [1, 1, 1, 1];
  input.barrels.push({ id: 'b', color: 'teal', grade: 2 }, { id: 'c', color: 'orange', grade: 2 });
  input.selections.push({ pipelineId: 'q', barrelId: 'b', toGrade: 3 });
  const result = refineBatch(input);
  assert.deepEqual(result.map(b => b.grade), [2, 3, 2]);
  input.selections.reverse();
  assert.deepEqual(refineBatch(input), result);
});
test('batch cannot rerun a barrel, reuse a pipeline, mismatch colors or exceed strength', () => {
  let input = fixture();
  input.selections.push({ pipelineId: 'q', barrelId: 'a', toGrade: 3 });
  assert.throws(() => refineBatch(input), /multiple pipelines/);
  input = fixture(); input.barrels.push({ id: 'b', color: 'teal', grade: 0 });
  input.selections.push({ pipelineId: 'p', barrelId: 'b', toGrade: 2 });
  assert.throws(() => refineBatch(input), /one barrel/);
  input = fixture(); input.pipelines[0].color = 'orange';
  assert.throws(() => refineBatch(input), /colors must match/);
  input = fixture(); input.pipelines[0].value = 9;
  assert.throws(() => refineBatch(input), /too short/);
  input = fixture(); input.selections[0].barrelId = 'unknown';
  assert.throws(() => refineBatch(input), /Unknown/);
  input = fixture(); input.barrels.push({ ...input.barrels[0] });
  assert.throws(() => refineBatch(input), /unique IDs/);
});

test('catalog records printed prices and the full pipe inventory', () => {
  const catalog = require('../data/components.json');
  assert.equal(catalog.verified, false);
  assert.equal(catalog.pipeTiles.length, 135);
  assert.equal(catalog.contracts.length, 30);
  assert.equal(catalog.orders.length, 24);
  const market1 = catalog.markets.find(m => m.id === 'market-1');
  assert.deepEqual(market1.rows.find(r => r.color === 'silver' && r.grade === 3).printedSlotPrices, [50, 50, 55, 55]);
  assert.deepEqual(market1.rows[0].twoPlayerSlots, [0, 1, 2, 3, 4, 5]);
  assert.equal(catalog.valuations.find(v => v.number === 14).verified, false);
});

test('photographed fulfillment inventory retains mixed grades and every tile position', () => {
  const { contracts, orders, pipeInventoryReview } = require('../data/components.json');
  for (const [deck, width, source] of [[contracts, 10, 'IMG_0362'], [orders, 8, 'IMG_0361']]) {
    assert.equal(new Set(deck.map(t => t.id)).size, width * 3);
    for (let row = 1; row <= 3; row++) {
      assert.deepEqual(deck.filter(t => t.sourcePosition.row === row).map(t => t.sourcePosition.column), Array.from({ length: width }, (_, i) => i + 1));
    }
    for (const tile of deck) {
      assert.equal(tile.source, source);
      assert.equal(tile.requirementsVerified, true);
      for (const barrel of tile.requirements) {
        assert.ok(['orange', 'teal', 'silver'].includes(barrel.color));
        assert.ok([1, 2, 3].includes(barrel.grade));
      }
    }
  }
  // IMG_0362 bottom row, column 7: three distinct grades on one contract.
  const mixed = contracts.find(t => t.id === 'contract-r3-c07');
  assert.deepEqual(mixed.requirements, [{ color: 'orange', grade: 3 }, { color: 'orange', grade: 2 }, { color: 'teal', grade: 1 }]);
  assert.equal(mixed.requirements.reduce((sum, b) => sum + barrelRevenue('contract', b.grade), 0), 100);
  assert.deepEqual(contracts.find(t => t.id === 'contract-r3-c05').requirements, [{ color: 'orange', grade: 3 }, { color: 'teal', grade: 2 }]);
  assert.deepEqual(contracts.find(t => t.id === 'contract-r2-c04').requirements.map(b => b.grade), [2, 1]);
  assert.deepEqual(orders.find(t => t.id === 'order-r2-c07').requirements.map(b => b.grade), [3, 3, 2, 1]);
  for (const tile of orders) assert.equal(tile.requirements.length, tile.setupGroup);
  assert.equal(pipeInventoryReview.batches.reduce((sum, b) => sum + b.count, 0), 135);
  assert.equal(pipeInventoryReview.geometryTranscribed, true);
  assert.ok(contracts.every(t => t.setupGroupVerified));
});
