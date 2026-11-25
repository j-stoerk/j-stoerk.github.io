/* Saved least-squares fits, loaded only when the figure approaches the viewport.
   No animation loop, plotting library or model inference runs in the browser. */
(() => {
  'use strict';
  const figure = document.querySelector('[data-backbone-experiment]');
  if (!figure) return;
  const ns = 'http://www.w3.org/2000/svg';
  const kinds = ['narrow', 'nonlinear', 'expanded'];
  function node(tag, attributes, content) {
    const el = document.createElementNS(ns, tag);
    Object.entries(attributes || {}).forEach(([key, value]) => el.setAttribute(key, value));
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function path(x, y, sx, sy) {
    return x.map((v, i) => `${i ? 'L' : 'M'}${sx(v).toFixed(2)},${sy(y[i]).toFixed(2)}`).join('');
  }
  function axes(svg, xTicks, yTicks, sx, sy, title, xLabel, yLabel) {
    svg.replaceChildren();
    svg.append(node('text', {x: 100, y: 27, class: 'chart-title'}, title));
    yTicks.forEach(tick => {
      svg.append(node('line', {x1: 100, x2: 598, y1: sy(tick), y2: sy(tick), class: 'chart-grid'}));
      svg.append(node('text', {x: 87, y: sy(tick) + 6, 'text-anchor': 'end'}, Number(tick.toFixed(2)).toString()));
    });
    xTicks.forEach(tick => svg.append(node('text', {x: sx(tick), y: 365, 'text-anchor': 'middle'}, tick.toString())));
    svg.append(node('path', {d: 'M100 49V342H598', class: 'chart-axis'}));
    svg.append(node('text', {x: 340, y: 402, 'text-anchor': 'middle'}, xLabel));
    svg.append(node('text', {transform: 'translate(22 198) rotate(-90)', 'text-anchor': 'middle'}, yLabel));
  }
  async function load() {
    try {
      const response = await fetch('figures/backbone/results.json');
      if (!response.ok) throw new Error('Figure data unavailable');
      const data = await response.json();
      const target = figure.querySelector('[data-backbone-target]');
      const samples = figure.querySelector('[data-backbone-samples]');
      const fit = figure.querySelector('[data-backbone-fit]');
      const learning = figure.querySelector('[data-backbone-learning]');
      const count = figure.querySelector('[data-backbone-count]');
      const readout = figure.querySelector('[data-backbone-readout]');
      function update() {
        const n = data.sizes[Number(samples.value)];
        const scenario = data.scenarios[target.value];
        const x = data.x.map(v => v * 100);
        const maxX = x[x.length - 1];
        const curves = kinds.map(kind => scenario.models[kind].curves.find(row => row.n === n).prediction);
        const allY = [scenario.truth, ...curves].flat();
        const minY = Math.max(0, Math.floor(Math.min(...allY) * 2) / 2 - .1);
        const maxY = Math.ceil(Math.max(...allY) * 2) / 2 + .1;
        const sx = v => 100 + 498 * v / maxX;
        const sy = v => 342 - 293 * (v - minY) / (maxY - minY);
        const yTicks = Array.from({length: 4}, (_, i) => minY + (maxY - minY) * i / 3);
        axes(fit, [0, 10, 20, 30, 40], yTicks, sx, sy, `${n} measurements · first seed`, 'Compression [%]', 'λeff [W/(m K)]');
        // SVG text can carry a true subscript without changing the axis layout.
        const yLabel = fit.lastElementChild;
        yLabel.replaceChildren(node('tspan', {}, 'λ'), node('tspan', {'baseline-shift': 'sub', 'font-size': '13'}, 'eff'), node('tspan', {}, ' [W/(m K)]'));
        fit.append(node('path', {d: path(x, scenario.truth, sx, sy), 'data-series': 'truth'}));
        kinds.forEach((kind, i) => fit.append(node('path', {d: path(x, curves[i], sx, sy), 'data-series': kind})));
        const highest = Math.max(...kinds.flatMap(kind => scenario.models[kind].learning.map(row => row.median)));
        const ceiling = Math.max(.02, Math.ceil(highest * 50) / 50);
        const lx = v => 100 + 498 * Math.log2(v / 6) / 4;
        const ly = v => 342 - 293 * v / ceiling;
        const lTicks = Array.from({length: 4}, (_, i) => ceiling * i / 3);
        axes(learning, data.sizes, lTicks, lx, ly, 'Median over 100 repeats', 'Simulated measurements', 'RMSE [W/(m K)]');
        kinds.forEach(kind => {
          const rows = scenario.models[kind].learning;
          learning.append(node('path', {d: path(data.sizes, rows.map(row => row.median), lx, ly), 'data-series': kind}));
          const row = rows.find(row => row.n === n);
          learning.append(node('circle', {cx: lx(n), cy: ly(row.median), r: 5, 'data-series': kind, fill: 'var(--color-bg)', 'stroke-width': 2.5}));
        });
        count.value = n;
        samples.setAttribute('aria-valuetext', `${n} measurements`);
        const errors = kinds.map(kind => scenario.models[kind].learning.find(row => row.n === n).median.toFixed(3));
        readout.textContent = `Median RMSE: linear head ${errors[0]}, polynomial head ${errors[1]}, expanded features ${errors[2]} W/(m K).`;
      }
      update();
      target.addEventListener('change', update);
      samples.addEventListener('input', update);
      figure.querySelector('.backbone-fallback').hidden = true;
      figure.querySelector('.backbone-controls').hidden = false;
      figure.querySelector('.backbone-charts').hidden = false;
    } catch (_) {
      // The standalone SVG and reproduction links remain usable on a failed fetch.
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, {rootMargin: '300px'});
    observer.observe(figure);
  } else load();
})();
