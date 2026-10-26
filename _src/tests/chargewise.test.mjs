import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, optimize, greedy, audit, checkInputs, SLOTS } from '../../chargewise/planner.mjs';

const near = (actual, expected, tolerance = 1e-4) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
test('fixture meets all targets at its independently derived minimum peak', () => {
  const fleet = fixture(), planned = optimize(fleet, 22), checked = audit(fleet, planned.power, 22);
  assert.equal(planned.feasible, true); assert.equal(checked.valid, true); assert.equal(checked.met, 4);
  near(checked.peak, 48 / 6 / .9); near(checked.energyCost, 24.08888889);
  near(checked.energyCost + checked.peak * 15.2, 159.2);
  const baseline = audit(fleet, greedy(fleet, 22), 22);
  near(baseline.peak, 22); near(baseline.energyCost, 21.46666667);
});
test('energy-only scheduling trades a higher peak for lower energy cost', () => {
  const fleet = fixture(), planned = optimize(fleet, 22, { objective: 'energy' }), checked = audit(fleet, planned.power, 22);
  assert.equal(checked.valid, true); near(checked.energyCost, 21.46666667); near(checked.peak, 22);
});
test('morning outage tightens a single van window to a 10 kW minimum', () => {
  const fleet = fixture(), outage = { port: 0, start: 6, end: 10 };
  const planned = optimize(fleet, 22, { outage }), checked = audit(fleet, planned.power, 22, { outage });
  assert.equal(checked.valid, true); near(checked.peak, 10);
  assert.ok(planned.power[0].slice(0, 16).every(p => p === 0));
});
test('afternoon replan preserves delivered history and avoids unavailable slots', () => {
  const fleet = fixture(), base = optimize(fleet, 22);
  const frozen = base.power.map(row => row.map((p, s) => s < 24 ? p : 0));
  const outage = { port: 1, start: 16, end: 18 }, options = { frozen, outage };
  const planned = optimize(fleet, 22, options), checked = audit(fleet, planned.power, 22, options);
  assert.equal(checked.valid, true); near(checked.peak, 48 / 6 / .9);
  planned.power.forEach((row, i) => assert.deepEqual(row.slice(0, 24), frozen[i].slice(0, 24)));
  assert.ok(planned.power[3].slice(40, 48).every(p => p === 0));
  assert.equal(audit(fleet, greedy(fleet, 22, outage, frozen), 22, options).valid, true);
});
test('a smaller connection and an impossible per-van request are rejected as infeasible', () => {
  let fleet = fixture(), planned = optimize(fleet, 8);
  assert.equal(planned.feasible, false); assert.equal(audit(fleet, planned.power, 8).valid, false);
  fleet[0].energy = 60; planned = optimize(fleet, 22);
  assert.equal(planned.feasible, false); assert.ok(audit(fleet, planned.power, 22).unserved > 0);
});
test('editing a departure changes the physical optimum', () => {
  const fleet = fixture(); fleet[2].departure = 18; fleet[3].departure = 18;
  const planned = optimize(fleet, 22), checked = audit(fleet, planned.power, 22);
  assert.equal(checked.valid, true); near(checked.peak, 48 / 4 / .9);
});
test('overlapping plug occupancy and invalid inputs cannot enter the planner', () => {
  const fleet = fixture(); fleet[2].arrival = 11;
  assert.throws(() => checkInputs(fleet, 22), /same plug/);
  fleet[2].arrival = 14.1; assert.throws(() => checkInputs(fleet, 22), /15-minute/);
  assert.throws(() => checkInputs(fixture(), NaN), /connection/);
});
test('allocation audit detects corrupted energy, outages and delivered history', () => {
  const fleet = fixture(), planned = optimize(fleet, 22);
  const corrupted = planned.power.map(row => row.slice()); corrupted[0][0] = 12;
  assert.equal(audit(fleet, corrupted, 22).valid, false);
  assert.equal(audit(fleet, planned.power, 22, { outage: { port: 0, start: 6, end: 7 } }).valid, false);
  const frozen = planned.power.map(row => row.map((p, s) => s < 24 ? p : 0));
  corrupted[0][0] = frozen[0][0] - 1;
  assert.ok(audit(fleet, corrupted, 22, { frozen }).errors.includes('Already delivered energy changed.'));
  assert.equal(audit(fleet, [Array(SLOTS).fill(0)], 22).valid, false);
});
