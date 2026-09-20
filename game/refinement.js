'use strict';

const { integer, refinementCost } = require('./rules');
const { refining, setup } = require('../data/rules.json');

// Resolve one simultaneous, ordinary-throughput batch without mutating inputs.
// `pipelines` must come from SERVER analysis of eligible pipe geometry, never
// from a socket payload. Worker/machine eligibility, fees, Engineering III and
// once-per-turn bookkeeping belong to the future turn engine.
function refineBatch({ tanks, barrels, pipelines, costsByColor, selections }) {
  if (!Array.isArray(tanks) || tanks.length !== 4) throw new Error('Four tank rows are required.');
  tanks.forEach(n => integer(n, 'Tank count', 0, 1000));
  if (![barrels, pipelines, selections].every(Array.isArray)) throw new Error('Refinement collections must be arrays.');
  if (!costsByColor || typeof costsByColor !== 'object') throw new Error('Refinement costs are required.');
  const oil = new Map(), lines = new Map();
  for (const barrel of barrels) {
    if (!barrel || typeof barrel.id !== 'string' || !barrel.id || oil.has(barrel.id)) throw new Error('Barrels need unique IDs.');
    if (!refining.colors.includes(barrel.color)) throw new Error('Unknown oil color.');
    integer(barrel.grade, 'Oil grade', 0, 3);
    oil.set(barrel.id, barrel);
  }
  for (const line of pipelines) {
    if (!line || typeof line.id !== 'string' || !line.id || lines.has(line.id)) throw new Error('Pipelines need unique IDs.');
    if (!refining.colors.includes(line.color)) throw new Error('Unknown pipeline color.');
    integer(line.value, 'Pipeline refinement value');
    lines.set(line.id, line);
  }
  function checkCapacity(items) {
    const used = [0, 0, 0, 0];
    items.forEach(barrel => used[barrel.grade]++);
    if (used.some((n, grade) => n > tanks[grade] * setup.barrelsPerTank)) throw new Error('Not enough tank capacity at the destination grade.');
  }
  checkCapacity(barrels);
  const usedLines = new Set(), moves = new Map();
  for (const selection of selections) {
    if (!selection || typeof selection !== 'object') throw new Error('Invalid refinement selection.');
    const { pipelineId, barrelId, toGrade } = selection;
    const line = lines.get(pipelineId), barrel = oil.get(barrelId);
    if (!line || !barrel) throw new Error('Unknown pipeline or barrel.');
    if (usedLines.has(pipelineId)) throw new Error('A pipeline can refine only one barrel in an ordinary batch.');
    if (moves.has(barrelId)) throw new Error('A barrel cannot run through multiple pipelines in the same batch.');
    if (line.color !== barrel.color) throw new Error('Pipeline and oil colors must match.');
    if (line.value < refinementCost(costsByColor[barrel.color], barrel.grade, toGrade)) throw new Error('Pipeline is too short for this refinement.');
    usedLines.add(pipelineId); moves.set(barrelId, toGrade);
  }
  const result = barrels.map(barrel => ({ ...barrel, grade: moves.has(barrel.id) ? moves.get(barrel.id) : barrel.grade }));
  // All runs are simultaneous: compare the final occupancy, never transient
  // intermediate grades or a sequentially updated source barrel.
  checkCapacity(result);
  return result;
}
module.exports = { refineBatch };
