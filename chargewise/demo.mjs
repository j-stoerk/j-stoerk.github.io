import { fixture, optimize, greedy, audit, START, END, SLOTS, STEP } from './planner.mjs';

const $ = id => document.getElementById(id);
const money = number => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(number);
const formatTime = hour => String(Math.floor(hour)).padStart(2, '0') + ':' + String(Math.round(hour % 1 * 60)).padStart(2, '0');
const parseTime = text => { const [h, m] = text.split(':').map(Number); return h + m / 60; };
let result, view = 'planned';

function renderFleet() {
  $('fleet').replaceChildren();
  fixture().forEach((van, i) => {
    const row = document.createElement('tr');
    const identity = document.createElement('td');
    identity.textContent = van.name; identity.className = 'van-' + i;
    const port = document.createElement('small'); port.textContent = 'CH-0' + (van.port + 1); identity.append(port); row.append(identity);
    for (const field of ['arrival', 'departure', 'energy']) {
      const cell = document.createElement('td'), input = document.createElement('input'), time = field !== 'energy';
      input.type = time ? 'time' : 'number'; input.value = time ? formatTime(van[field]) : van[field];
      input.min = time ? '06:00' : '1'; input.max = time ? '20:00' : '60'; input.step = time ? '900' : '.5'; input.required = true;
      input.id = field + '-' + i; input.setAttribute('form', 'settings');
      input.setAttribute('aria-label', van.name + ' ' + (time ? field + ' time' : 'required battery energy in kWh'));
      cell.append(input); row.append(cell);
    }
    const delivered = document.createElement('td'); delivered.id = 'delivered-' + i; row.append(delivered); $('fleet').append(row);
  });
}
function getFleet() {
  return fixture().map((van, i) => ({ ...van, arrival: parseTime($('arrival-' + i).value), departure: parseTime($('departure-' + i).value), energy: Number($('energy-' + i).value) }));
}
function outageFor(incident) {
  return incident === 'morning' ? { port: 0, start: 6, end: 10 } : incident === 'afternoon' ? { port: 1, start: 16, end: 18 } : null;
}
function draw() {
  if (!result) return;
  const svg = $('schedule'), NS = 'http://www.w3.org/2000/svg'; svg.replaceChildren();
  const desc = document.createElementNS(NS, 'desc'); desc.id = 'chart-description';
  const selected = view === 'greedy' ? result.greedy : result.planned;
  desc.textContent = `${view === 'greedy' ? 'Greedy' : 'Planned'} schedule. Peak ${selected.audit.peak.toFixed(2)} kW, ${selected.audit.met} of 4 departures ready. Dashed line shows greedy site load.`;
  svg.append(desc);
  const L = 46, R = 850, T = 28, B = 265, max = Math.max(24, result.cap + 2);
  const x = hour => L + (hour - START) / (END - START) * (R - L), y = power => B - power / max * (B - T);
  function add(tag, attrs, text) {
    const element = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    if (text) element.textContent = text; svg.append(element); return element;
  }
  if (result.outage) {
    const { start, end, port } = result.outage;
    add('rect', { x: x(start), y: T, width: x(end) - x(start), height: B - T, fill: 'var(--ink)', opacity: '.045' });
    add('text', { x: (x(start) + x(end)) / 2, y: T - 10, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 10 }, 'CH-0' + (port + 1) + ' offline');
  }
  for (let p = 0; p <= 22; p += 5) {
    add('line', { x1: L, x2: R, y1: y(p), y2: y(p), stroke: 'var(--line)' });
    add('text', { x: L - 12, y: y(p) + 4, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 11 }, p);
  }
  add('text', { x: L - 12, y: 13, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 10 }, 'kW');
  for (let h = START; h <= END; h += 2) add('text', { x: x(h), y: B + 24, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 }, formatTime(h));
  for (let slot = 0; slot < SLOTS; slot++) {
    let base = 0;
    selected.power.forEach((row, i) => {
      const p = row[slot]; if (p <= 1e-6) return;
      const rect = add('rect', { x: x(START + slot * STEP), y: y(base + p), width: (R - L) / SLOTS + .25, height: y(base) - y(base + p), fill: 'var(--v' + i + ')' });
      const title = document.createElementNS(NS, 'title'); title.textContent = `${result.fleet[i].name} at ${formatTime(START + slot * STEP)}: ${p.toFixed(2)} kW`; rect.append(title); base += p;
    });
  }
  const line = result.greedy.audit.total.map((p, i) => `${i ? 'L' : 'M'}${x(START + i * STEP)},${y(p)}H${x(START + (i + 1) * STEP)}`).join('');
  add('path', { d: line, stroke: 'var(--ink)', 'stroke-width': 1.3, 'stroke-dasharray': '4 4', opacity: '.5', fill: 'none' });
  add('line', { x1: L, x2: R, y1: y(result.cap), y2: y(result.cap), stroke: 'var(--muted)', 'stroke-dasharray': '2 5' });
  add('text', { x: R, y: y(result.cap) - 6, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 10 }, result.cap + ' kW connection');
  if (result.frozen) {
    add('line', { x1: x(12), x2: x(12), y1: T, y2: B, stroke: 'var(--ink)', 'stroke-dasharray': '3 3' });
    add('text', { x: x(12) - 6, y: B + 45, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 10 }, 'Before noon: delivered energy frozen');
  }
}
function showMetrics() {
  const chosen = view === 'greedy' ? result.greedy : result.planned, audit = chosen.audit;
  const tariff = Number($('tariff').value), prior = Number($('prior').value);
  const demand = Math.max(prior, audit.peak) * tariff;
  $('peak').textContent = audit.peak.toFixed(2) + ' kW';
  const reduction = result.greedy.audit.peak ? (1 - audit.peak / result.greedy.audit.peak) * 100 : 0;
  $('peak-comparison').textContent = view === 'planned' ? Math.round(reduction) + '% below greedy peak' : 'Charge immediately when possible';
  $('ready').textContent = audit.met + ' / 4';
  $('energy-total').textContent = audit.delivered.reduce((s, e) => s + e, 0).toFixed(1) + ' battery kWh delivered';
  $('cost').textContent = money(audit.energyCost + demand);
  $('cost-breakdown').textContent = money(audit.energyCost) + ' energy + ' + money(demand) + ' demand';
  audit.delivered.forEach((value, i) => { $('delivered-' + i).textContent = value.toFixed(2) + ' kWh'; });
  $('validation').classList.toggle('invalid', !audit.valid);
  $('validation').textContent = audit.valid ? 'Checked: departure energy, plug availability, power limits' + (result.frozen ? ', unchanged delivered history.' : '.') : 'Not feasible: ' + audit.errors.join(' ') + (audit.unserved > 1e-4 ? ' Missing ' + audit.unserved.toFixed(2) + ' battery kWh.' : '');
  if (!audit.valid && view === 'greedy' && result.planned.audit.valid) $('explanation').textContent = 'Charging immediately misses a departure target under these constraints. Switch to the planned schedule: allocating the same available power differently meets every target.';
  else if (!audit.valid) $('explanation').textContent = 'This roster cannot be served by the displayed schedule. Increase the connection, extend a parking window or reduce an energy request. An outage can make one van impossible to serve even when other plugs have spare capacity.';
  else if (prior >= audit.peak) $('explanation').textContent = 'The billing period already reached ' + prior.toFixed(1) + ' kW. The displayed schedule stays below that peak, so lowering its peak further would not reduce this period\'s established demand charge. Energy timing still changes the bill.';
  else if (result.outage) $('explanation').textContent = result.incident === 'morning'
    ? 'CH-01 is unavailable until 10:00. VAN-01 must receive its energy in the remaining two hours. That tight departure window sets the new power requirement; spare time on the other plug cannot replace it.'
    : 'CH-02 is unavailable from 16:00 to 18:00. The replan moves VAN-04 charging into its remaining parking window and preserves every allocation before noon. Compare the revised peak with the original 8.89 kW fixture.';
  else if (result.objective === 'energy') $('explanation').textContent = 'The energy-only plan can concentrate charging into cheaper slots. Its electricity component may fall while the demand charge rises. Switch to lowest peak to compare the entire scenario bill.';
  else $('explanation').textContent = 'The planner spreads charging inside each van\'s parking window. The afternoon pair needs 48 battery kWh in six hours; with 90% efficiency, 8.89 kW is the lowest shared peak for the original roster. Edit their departures or energy needs to change that constraint.';
  draw();
}
function run(event) {
  event?.preventDefault(); const began = performance.now();
  try {
    const fleet = getFleet(), cap = Number($('connection').value), incident = $('incident').value;
    const outage = outageFor(incident), objective = $('objective').value;
    let frozen = null;
    if (incident === 'afternoon') {
      const base = optimize(fleet, cap, { objective });
      if (!base.feasible) throw new Error('This roster is infeasible even before the afternoon outage. Adjust it first, or select both chargers available.');
      frozen = base.power.map(row => row.map((p, slot) => slot < 24 ? p : 0));
    }
    const options = { outage, frozen, objective }, planned = optimize(fleet, cap, options);
    const greedyPower = greedy(fleet, cap, outage, frozen);
    result = { fleet, cap, incident, outage, frozen, objective,
      planned: { power: planned.power, audit: audit(fleet, planned.power, cap, options) },
      greedy: { power: greedyPower, audit: audit(fleet, greedyPower, cap, options) } };
    showMetrics(); $('timing').textContent = 'Computed locally in ' + Math.max(1, Math.round(performance.now() - began)) + ' ms.';
  } catch (error) {
    result = null; $('schedule').replaceChildren();
    for (const id of ['peak', 'ready', 'cost']) $(id).textContent = 'Unavailable';
    for (const id of ['peak-comparison', 'energy-total', 'cost-breakdown', 'timing', 'explanation']) $(id).textContent = '';
    for (let i = 0; i < 4; i++) $('delivered-' + i).textContent = '';
    $('validation').classList.add('invalid'); $('validation').textContent = error.message;
  }
}
$('settings').addEventListener('submit', run);
$('settings').addEventListener('reset', () => setTimeout(() => { renderFleet(); view = 'planned'; updateTabs(); updateControls(); run(); }, 0));
function updateTabs() { document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view))); }
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view; updateTabs(); if (result) showMetrics(); }));
function updateControls() {
  $('connection-value').textContent = Number($('connection').value).toFixed(2) + ' kW';
  $('incident-note').textContent = $('incident').value === 'afternoon' ? 'Replans from noon; past allocations stay frozen.' : $('incident').value === 'morning' ? 'One morning van loses four hours on its assigned plug.' : 'Change an outage to trigger a replan.';
}
for (const id of ['connection', 'incident', 'objective', 'tariff', 'prior']) {
  $(id).addEventListener('input', updateControls);
  $(id).addEventListener('change', () => { if ($('settings').reportValidity()) run(); });
}
document.addEventListener('dragstart', event => { if (event.target.closest('a,img,button')) event.preventDefault(); });
$('architecture').addEventListener('toggle', () => {
  const host = document.querySelector('[data-film]');
  if ($('architecture').open && !host.firstChild) {
    const frame = document.createElement('iframe'); frame.src = 'film.html'; frame.title = 'Recorded ChargeWise architecture walkthrough'; frame.allowFullscreen = true; host.append(frame);
  }
  if (!$('architecture').open) host.replaceChildren();
});
Object.defineProperty(window, 'chargewiseDemo', { value: Object.freeze({ get result() { return result; } }) });
renderFleet(); updateControls(); run();
