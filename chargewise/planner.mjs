/* Small continuous-flow planner for the public demo. No Python, model or API.
   Fixed, non-overlapping plug assignments; 15-minute slots; constant power.
   The production OR-Tools model additionally includes a battery taper envelope. */
export const STEP = .25, START = 6, END = 20, SLOTS = (END - START) / STEP, EFFICIENCY = .9;
export const fixture = () => [
  { name: 'VAN-01', port: 0, arrival: 6, departure: 12, energy: 18, maxPower: 11 },
  { name: 'VAN-02', port: 1, arrival: 6, departure: 12, energy: 18, maxPower: 11 },
  { name: 'VAN-03', port: 0, arrival: 14, departure: 20, energy: 24, maxPower: 11 },
  { name: 'VAN-04', port: 1, arrival: 14, departure: 20, energy: 24, maxPower: 11 },
];
export const prices = Array.from({ length: SLOTS }, (_, i) => START + i * STEP < 16 ? .22 : .32);
const zeros = fleet => fleet.map(() => Array(SLOTS).fill(0));
export function available(van, slot, outage) {
  const time = START + slot * STEP;
  return time >= van.arrival && time + STEP <= van.departure + 1e-8
    && !(outage && van.port === outage.port && time >= outage.start && time < outage.end);
}
export function checkInputs(fleet, cap) {
  if (!Number.isFinite(cap) || cap < 1 || cap > 22) throw new Error('Choose a connection between 1 and 22 kW.');
  for (const van of fleet) {
    if (![van.arrival, van.departure, van.energy, van.maxPower].every(Number.isFinite)
      || van.arrival < START || van.departure > END || van.arrival >= van.departure
      || !Number.isInteger(van.arrival / STEP) || !Number.isInteger(van.departure / STEP)
      || van.energy < 1 || van.energy > 60 || van.maxPower <= 0 || van.maxPower > 11)
      throw new Error('Use 15-minute times from 06:00 to 20:00, departure after arrival, and 1–60 kWh per van.');
  }
  for (let i = 0; i < fleet.length; i++) for (let j = 0; j < i; j++) {
    if (fleet[i].port === fleet[j].port && fleet[i].arrival < fleet[j].departure && fleet[j].arrival < fleet[i].departure)
      throw new Error('Two vans occupy the same plug. A plug stays occupied until departure, even when charging has finished.');
  }
}

/* Successive shortest augmenting paths. Source -> time slot -> van -> sink.
   Capacities are grid kWh; the time-to-van edges enforce individual ratings.
   Reverse edges allow a later augmentation to revise an earlier allocation. */
export function flowPlan(fleet, cap, { outage = null, frozen = null, cost = true } = {}) {
  const power = frozen ? frozen.map(row => row.slice()) : zeros(fleet);
  const freeze = frozen ? (12 - START) / STEP : 0;
  const source = 0, firstSlot = 1, firstVan = firstSlot + SLOTS, sink = firstVan + fleet.length;
  const graph = Array.from({ length: sink + 1 }, () => []), edges = [];
  function edge(from, to, capacity, price) {
    const forward = { to, capacity, price, reverse: graph[to].length, initial: capacity };
    const backward = { to: from, capacity: 0, price: -price, reverse: graph[from].length };
    graph[from].push(forward); graph[to].push(backward); return forward;
  }
  let required = 0;
  fleet.forEach((van, i) => {
    const delivered = power[i].slice(0, freeze).reduce((sum, p) => sum + p * STEP, 0);
    const remaining = Math.max(0, van.energy / EFFICIENCY - delivered);
    required += remaining; edge(firstVan + i, sink, remaining, 0);
  });
  for (let slot = freeze; slot < SLOTS; slot++) {
    edge(source, firstSlot + slot, cap * STEP, cost ? prices[slot] : 0);
    fleet.forEach((van, i) => {
      if (available(van, slot, outage)) edges.push({ slot, i, edge: edge(firstSlot + slot, firstVan + i, van.maxPower * STEP, 0) });
    });
  }
  let sent = 0;
  while (sent + 1e-8 < required) {
    const distance = Array(graph.length).fill(Infinity), previous = Array(graph.length), queued = Array(graph.length).fill(false);
    const queue = [source]; distance[source] = 0; queued[source] = true;
    for (let index = 0; index < queue.length; index++) {
      const node = queue[index]; queued[node] = false;
      graph[node].forEach((link, e) => {
        if (link.capacity > 1e-9 && distance[link.to] > distance[node] + link.price + 1e-10) {
          distance[link.to] = distance[node] + link.price; previous[link.to] = [node, e];
          if (!queued[link.to]) { queue.push(link.to); queued[link.to] = true; }
        }
      });
    }
    if (!previous[sink]) break;
    let amount = required - sent;
    for (let node = sink; node !== source;) { const [from, e] = previous[node]; amount = Math.min(amount, graph[from][e].capacity); node = from; }
    for (let node = sink; node !== source;) {
      const [from, e] = previous[node], link = graph[from][e];
      link.capacity -= amount; graph[node][link.reverse].capacity += amount; node = from;
    }
    sent += amount;
  }
  for (const { slot, i, edge: link } of edges) power[i][slot] = Math.max(0, (link.initial - link.capacity) / STEP);
  return { power, feasible: required - sent < 1e-6 };
}
export function optimize(fleet, cap, options = {}) {
  checkInputs(fleet, cap);
  if (options.objective === 'energy') return { ...flowPlan(fleet, cap, options), limit: cap };
  const possible = flowPlan(fleet, cap, { ...options, cost: false });
  if (!possible.feasible) return { ...possible, limit: cap };
  let low = options.frozen ? Math.max(0, ...Array.from({ length: 24 }, (_, s) => options.frozen.reduce((sum, row) => sum + row[s], 0))) : 0;
  let high = cap;
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2;
    if (flowPlan(fleet, mid, { ...options, cost: false }).feasible) high = mid; else low = mid;
  }
  const limit = Math.min(cap, high + 1e-7);
  return { ...flowPlan(fleet, limit, options), limit };
}
export function greedy(fleet, cap, outage = null, frozen = null) {
  const power = frozen ? frozen.map(row => row.slice()) : zeros(fleet), freeze = frozen ? 24 : 0;
  const remaining = fleet.map((van, i) => van.energy / EFFICIENCY - power[i].slice(0, freeze).reduce((sum, p) => sum + p * STEP, 0));
  for (let slot = freeze; slot < SLOTS; slot++) {
    let spare = cap;
    fleet.forEach((van, i) => {
      if (available(van, slot, outage)) {
        const p = Math.max(0, Math.min(van.maxPower, spare, remaining[i] / STEP));
        power[i][slot] = p; spare -= p; remaining[i] -= p * STEP;
      }
    });
  }
  return power;
}
/* Separate allocation audit: recompute energy, occupancy, ratings, site power
   and immutable delivered history from the resulting matrix, not solver flags. */
export function audit(fleet, power, cap, { outage = null, frozen = null } = {}) {
  const errors = [], delivered = fleet.map(() => 0), total = Array(SLOTS).fill(0);
  if (!Array.isArray(power) || power.length !== fleet.length || power.some(row => !Array.isArray(row) || row.length !== SLOTS))
    return { valid: false, errors: ['Invalid schedule dimensions.'], delivered, total, peak: 0, energyCost: 0, unserved: Infinity, met: 0 };
  fleet.forEach((van, i) => {
    power[i].forEach((p, slot) => {
      if (!Number.isFinite(p) || p < -1e-6 || p > van.maxPower + 1e-5 || (p > 1e-5 && !available(van, slot, outage))) errors.push('Plug, availability or power limit violated.');
      if (frozen && slot < 24 && Math.abs(p - frozen[i][slot]) > 1e-6) errors.push('Already delivered energy changed.');
      delivered[i] += p * STEP * EFFICIENCY; total[slot] += p;
    });
    if (Math.abs(delivered[i] - van.energy) > 1e-4) errors.push(van.name + ' energy target not met.');
  });
  if (total.some(p => p > cap + 1e-5)) errors.push('Shared connection exceeded.');
  return { valid: !errors.length, errors: [...new Set(errors)], delivered, total,
    peak: Math.max(0, ...total), energyCost: total.reduce((sum, p, slot) => sum + p * STEP * prices[slot], 0),
    unserved: delivered.reduce((sum, energy, i) => sum + Math.max(0, fleet[i].energy - energy), 0),
    met: delivered.filter((energy, i) => Math.abs(energy - fleet[i].energy) < 1e-4).length };
}
