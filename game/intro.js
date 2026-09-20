'use strict';

const catalog = require('../data/components.json');
const { integer, barrelRevenue, pipelineAssetValue } = require('./rules');

function introductoryPreset() {
  return {
    id: 'two-player-intro', players: 2,
    valuationNumbers: [...catalog.scope.valuationNumbers],
    includeValuationTile: true,
    // The future server setup must shuffle these nine physical markers.
    refinementPool: catalog.refinementMarkers.filter(m => m.value !== 7).map(m => ({ ...m }))
  };
}

// Assets and fixed introductory valuations only. The turn engine must first
// resolve year-end contracts, then add cash and deduct penalties separately.
// Pipelines are trusted server-derived continuous lines, using actual lengths.
function scoreIntroAssets({ tanks, barrels, pipelines, costsByColor }) {
  if (!Array.isArray(tanks) || tanks.length !== 4) throw new Error('Four tank grades are required.');
  tanks.forEach(n => integer(n, 'Tank count'));
  if (!Array.isArray(barrels) || !Array.isArray(pipelines)) throw new Error('Provide barrels and pipelines.');
  const colors = ['orange', 'teal', 'silver'];
  const occupancy = [0, 0, 0, 0];
  let oil = 0;
  for (const barrel of barrels) {
    if (!barrel || !colors.includes(barrel.color)) throw new Error('Unknown oil color.');
    integer(barrel.grade, 'Oil grade', 0, 3);
    occupancy[barrel.grade]++;
    oil += barrelRevenue('oilAtEnd', barrel.grade);
  }
  if (occupancy.some((n, grade) => n > tanks[grade] * 2)) throw new Error('Oil exceeds tank capacity.');
  let pipes = 0, machinePipes = 0;
  const ids = new Set();
  for (const pipe of pipelines) {
    if (!pipe || typeof pipe.id !== 'string' || !pipe.id || ids.has(pipe.id)) throw new Error('Pipelines need unique IDs.');
    ids.add(pipe.id);
    if (!colors.includes(pipe.color) || typeof pipe.machineAttached !== 'boolean') throw new Error('Invalid pipeline details.');
    integer(pipe.segments, 'Actual pipe length');
    const value = pipelineAssetValue(costsByColor?.[pipe.color], pipe.segments);
    pipes += value;
    if (pipe.machineAttached) machinePipes += value;
  }
  const tankBonus = tanks.reduce((a, b) => a + b, 0) * 10;
  const result = { oilAssets: oil, pipelineAssets: pipes,
    valuation1: oil, valuation2: pipes, valuation3: tankBonus,
    valuationTile: machinePipes, total: 2 * oil + 2 * pipes + tankBonus + machinePipes };
  if (!Object.values(result).every(Number.isSafeInteger)) throw new Error('Asset score is too large.');
  return result;
}

module.exports = { introductoryPreset, scoreIntroAssets };
