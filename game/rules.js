'use strict';

// Values transcribed from the user's physical boards and rulebook.
// These helpers are not a full turn engine; callers must separately enforce
// action eligibility, shared supply, pipe geometry and upgrade timing.
const rules = require('../data/rules.json');

function integer(value, label, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}
function quoteGovernmentPipes(count) {
  integer(count, 'Government pipe count', 1, 5);
  return rules.costs.governmentPipes[count];
}
function quoteShopPipes(count) {
  if (count !== 2 && count !== 4) throw new Error('Shop pipes must be bought in a bundle of two or four.');
  return rules.costs.shopPipeBundles[count];
}
function barrelRevenue(channel, grade, quantity = 1) {
  if (!['contract', 'order', 'oilAtEnd'].includes(channel)) throw new Error('Unknown oil payment channel.');
  integer(grade, 'Oil grade', 0, 3);
  integer(quantity, 'Barrel quantity');
  const price = rules.income[`${channel}ByGrade`][grade];
  if (price === null) throw new Error('No payment for crude oil is verified for this channel.');
  const total = price * quantity;
  if (!Number.isSafeInteger(total)) throw new Error('Oil payment is too large.');
  return total;
}
function penaltyCost(count) {
  integer(count, 'Penalty count');
  if (count >= rules.penalties.totalByCount.length) {
    throw new Error('Penalty amounts beyond ten tokens still require a rules clarification.');
  }
  return rules.penalties.totalByCount[count];
}
function refinementValue(segments, engineeringBonusLevel = 0) {
  integer(segments, 'Pipe segments');
  // Engineering II replaces the bonus from I. This is deliberately the bonus
  // level (0, I or II), not the highest owned card; III changes throughput.
  integer(engineeringBonusLevel, 'Engineering bonus level', 0, 2);
  const result = segments + Math.floor(segments / 4) * engineeringBonusLevel;
  if (!Number.isSafeInteger(result)) throw new Error('Refinement value is too large.');
  return result;
}
function validateCosts(costs) {
  if (!Array.isArray(costs) || costs.length !== 3) throw new Error('Provide the three refinement costs for this oil color.');
  costs.forEach(value => integer(value, 'Refinement cost', 1));
}
function refinementCost(costs, from, to) {
  validateCosts(costs);
  integer(from, 'Starting grade', 0, 2);
  integer(to, 'Target grade', from + 1, 3);
  const total = costs.slice(from, to).reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Refinement cost is too large.');
  return total;
}
function highestGrade(costs, value, from = 0) {
  validateCosts(costs);
  integer(value, 'Refinement value');
  integer(from, 'Starting grade', 0, 3);
  let target = from, remaining = value;
  while (target < 3 && remaining >= costs[target]) {
    remaining -= costs[target]; target++;
  }
  return target;
}
function pipelineAssetValue(costs, value) {
  return rules.income.pipelineAtEndByGrade[highestGrade(costs, value)];
}

module.exports = { integer, quoteGovernmentPipes, quoteShopPipes, barrelRevenue, penaltyCost, refinementValue, refinementCost, highestGrade, pipelineAssetValue };
