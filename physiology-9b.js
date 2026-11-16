/* Two explicit mathematical constructions. No patient data or model calls. */
(() => {
  'use strict';
  const selection = document.querySelector('[data-selection-lab]');
  if (selection) {
    const input = selection.querySelector('input');
    // Normal CDF approximation; constants are the demo.py simulation assumptions.
    const erf = x => {
      const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + .3275911 * a);
      return s * (1 - (((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-a*a));
    };
    const update = () => {
      const r = Number(input.value)/100, mu = .2, variance = .3**2 + .5**2;
      const sd = Math.sqrt(variance), z = mu/sd;
      const positive = .5*(1+erf(z/Math.SQRT2));
      const density = Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
      const keep = positive + r*(1-positive);
      const reported = mu + (1-r)*sd*density/keep;
      const truth = mu + (1-r)*.3**2/sd*density/keep;
      selection.querySelector('[data-retention-label]').textContent = `${input.value}%`;
      selection.querySelector('[data-positive]').textContent = `${(100*positive/keep).toFixed(1)}%`;
      selection.querySelector('[data-reported]').textContent = reported.toFixed(3);
      selection.querySelector('[data-true]').textContent = truth.toFixed(3);
      selection.querySelector('[data-reported-bar]').setAttribute('width',String(reported/.7*595));
      selection.querySelector('[data-true-bar]').setAttribute('width',String(truth/.7*595));
    };
    input.addEventListener('input', update); update();
  }
  const compression = document.querySelector('[data-compression-lab]');
  if (compression) {
    const input = compression.querySelector('input');
    const update = () => {
      const k = Number(input.value), d = 23030;
      const flat = k/d, concentrated = -Math.expm1(-k/200)/-Math.expm1(-d/200);
      compression.querySelector('[data-coordinate-label]').textContent = String(k);
      for (const [name,value] of [['flat',flat],['concentrated',concentrated]]) {
        compression.querySelector(`[data-${name}]`).textContent = `${(100*value).toFixed(2)}%`;
        compression.querySelector(`[data-${name}-bar]`).style.width = `${100*value}%`;
      }
    };
    input.addEventListener('input',update); update();
  }
})();
