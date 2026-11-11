/* A closed-form example; no charting library, network access or animation. */
(function () {
  'use strict';
  const lab = document.querySelector('[data-belief-lab]');
  if (!lab) return;
  const prior = lab.querySelector('#belief-prior');
  const reports = lab.querySelector('#belief-reports');
  function update() {
    const p = Number(prior.value) / 100;
    const n = Number(reports.value);
    const posterior = count => {
      const odds = p / (1 - p) * Math.pow(.9 / .05, count);
      return 100 * odds / (1 + odds);
    };
    lab.querySelector('#belief-prior-value').value = prior.value + '%';
    lab.querySelector('#belief-reports-value').value = reports.value;
    for (const [name, value] of [['independent', posterior(n)], ['copied', posterior(1)]]) {
      lab.querySelector('[data-' + name + ']').textContent = value.toFixed(1) + '%';
      lab.querySelector('[data-' + name + '-bar]').style.width = value + '%';
    }
    prior.setAttribute('aria-valuetext', prior.value + ' percent');
    reports.setAttribute('aria-valuetext', reports.value + ' positive reports');
  }
  lab.addEventListener('input', update);
  update();
})();
