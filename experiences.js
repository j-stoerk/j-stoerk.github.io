/* Independent, dependency-free research experiences. All animation shares one
   visibility-aware frame loop; controls remain usable with motion paused. */
(function () {
  'use strict';
  const root = document.documentElement;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => Array.from(scope.querySelectorAll(s));
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  try { if (localStorage.getItem('portfolio-motion') === 'paused') paused = true; } catch (_) { }
  let palette;
  function readPalette() {
    const css = getComputedStyle(root);
    palette = { ink: css.getPropertyValue('--color-text').trim(), muted: css.getPropertyValue('--color-text-muted').trim(), blue: css.getPropertyValue('--color-primary').trim(), surface: css.getPropertyValue('--color-surface').trim(), grid: css.getPropertyValue('--color-border').trim(), gold: css.getPropertyValue('--color-warn').trim() };
  }
  readPalette();
  const scenes = [];
  let frame = 0, last = 0, elapsed = 0;
  function wake() { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
  function tick(now) {
    frame = 0;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016);
    last = now;
    if (!paused) elapsed += dt;
    let running = false;
    scenes.forEach(scene => {
      if (!scene.visible || !scene.canvas.isConnected) return;
      const rect = scene.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
      if (scene.canvas.width !== width || scene.canvas.height !== height) { scene.canvas.width = width; scene.canvas.height = height; }
      scene.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.ctx.clearRect(0, 0, rect.width, rect.height);
      scene.ctx.save();
      scene.draw(scene.ctx, rect.width, rect.height, elapsed, dt);
      scene.ctx.restore();
      if (scene.animate()) running = true;
    });
    if (running && !paused) wake();
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { const scene = scenes.find(s => s.canvas === entry.target); if (scene) scene.visible = entry.isIntersecting; });
    wake();
  }, { rootMargin: '80px' }) : null;
  function scene(canvas, draw, animate = () => true) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const entry = { canvas, ctx, draw, animate, visible: !observer };
    scenes.push(entry);
    if (observer) observer.observe(canvas);
    wake();
  }
  function fit(ctx, w, h, vw, vh) {
    const scale = Math.min(w / vw, h / vh);
    ctx.translate((w - vw * scale) / 2, (h - vh * scale) / 2);
    ctx.scale(scale, scale);
  }
  function line(ctx, a, b, color, width = 1) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function dot(ctx, x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function text(ctx, value, x, y, color = palette.muted, size = 14) { ctx.font = size + 'px "Noto Sans", sans-serif'; ctx.fillStyle = color; ctx.fillText(value, x, y); }
  function applyPause() {
    root.classList.toggle('motion-paused', paused);
    $$('[data-motion-toggle]').forEach(button => { button.textContent = paused ? 'Resume motion' : 'Pause motion'; button.setAttribute('aria-pressed', String(paused)); });
    document.dispatchEvent(new Event('motionchange'));
    wake();
  }
  $('[data-motion-toggle]')?.addEventListener('click', () => { paused = !paused; try { localStorage.setItem('portfolio-motion', paused ? 'paused' : 'running'); } catch (_) { } applyPause(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; applyPause(); });
  document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake(); });
  window.addEventListener('resize', wake, { passive: true });
  new MutationObserver(() => { readPalette(); wake(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // 01. A projected 3D electrode, with selectable solid, pore and transport views.
  (function electrode() {
    const canvas = $('#electrode-canvas');
    if (!canvas) return;
    const particles = Array.from({ length: 96 }, (_, i) => ({ x: ((i % 8) - 3.5) * 39, y: (Math.floor(i / 8) % 4 - 1.5) * 38, z: (Math.floor(i / 32) - 1) * 45 }));
    let layer = 'particles', angle = 0, pointerX = 0, pointerY = 0;
    const captions = {
      particles: 'Active particles store lithium. Move across the structure or use the rotation control to change your view.',
      pores: 'The spaces between particles form the pore network. Electrolyte fills these paths through the electrode.',
      transport: 'Moving points trace illustrative ion pathways through the pore space. This is a schematic, not a transport simulation.'
    };
    $$('[data-layer]').forEach(button => button.addEventListener('click', () => {
      layer = button.dataset.layer;
      $$('[data-layer]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      $('#electrode-caption').textContent = captions[layer]; wake();
    }));
    $('#electrode-angle').addEventListener('input', e => { angle = Number(e.target.value) * Math.PI / 180; wake(); });
    canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || paused) return; const r = canvas.getBoundingClientRect(); pointerX = (e.clientX - r.left) / r.width - .5; pointerY = (e.clientY - r.top) / r.height - .5; wake(); });
    canvas.addEventListener('pointerleave', () => { pointerX = pointerY = 0; wake(); });
    scene(canvas, (ctx, w, h, t) => {
      fit(ctx, w, h, 900, 380);
      const yaw = -.27 + angle + pointerX * .5 + Math.sin(t * .2) * .04;
      const pitch = .4 + pointerY * .3;
      function project(p) {
        const x = p.x * Math.cos(yaw) + p.z * Math.sin(yaw), z = -p.x * Math.sin(yaw) + p.z * Math.cos(yaw);
        const y = p.y * Math.cos(pitch) - z * Math.sin(pitch), depth = p.y * Math.sin(pitch) + z * Math.cos(pitch);
        const s = 550 / (550 + depth);
        return { x: 450 + x * 1.65 * s, y: 185 + y * 1.65 * s, z: depth, s };
      }
      for (let y = 35; y < 380; y += 35) line(ctx, [45, y], [855, y], '#1b2c3d');
      particles.map(project).sort((a, b) => b.z - a.z).forEach(p => {
        ctx.globalAlpha = layer === 'particles' ? .9 : .22;
        const g = ctx.createRadialGradient(p.x - 6, p.y - 7, 1, p.x, p.y, 23 * p.s);
        g.addColorStop(0, '#a5d1f2'); g.addColorStop(.4, '#5b93c0'); g.addColorStop(1, '#263f66');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, 23 * p.s, 17 * p.s, -.25, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (layer !== 'particles') {
        for (let row = 0; row < 3; row++) {
          const route = Array.from({ length: 8 }, (_, i) => project({ x: (i - 3.5) * 39, y: (row - 1) * 38 + 19, z: Math.sin(i * 1.6 + row) * 24 }));
          route.forEach((p, i) => { if (i) line(ctx, [route[i - 1].x, route[i - 1].y], [p.x, p.y], '#e5b46b', 2); dot(ctx, p.x, p.y, 4, '#e5b46b'); });
          if (layer === 'transport') { const position = (t * .7 + row * 2) % 7, i = Math.floor(position), f = position - i; dot(ctx, mix(route[i].x, route[i + 1].x, f), mix(route[i].y, route[i + 1].y, f), 7, '#fff4d1'); }
        }
      }
      text(ctx, 'SOLID / VOID / CONNECTION', 45, 355, '#8ba8c4', 12);
      text(ctx, 'ILLUSTRATIVE STRUCTURE', 685, 355, '#8ba8c4', 12);
    });
  })();

  // 02. Material particles reorganise into a network as this panel enters view.
  (function bridge() {
    const canvas = $('#bridge-canvas'), range = $('#bridge-mix'), follow = $('#bridge-follow');
    if (!canvas || !range || !follow) return;
    let automatic = true, progress = 0;
    const update = () => {
      if (automatic && !paused) { const r = canvas.getBoundingClientRect(); progress = clamp((innerHeight * .88 - r.top) / (innerHeight * .7)); range.value = Math.round(progress * 100); }
      wake();
    };
    range.addEventListener('input', () => { automatic = false; progress = Number(range.value) / 100; follow.setAttribute('aria-pressed', 'false'); wake(); });
    follow.addEventListener('click', () => { automatic = !automatic; follow.setAttribute('aria-pressed', String(automatic)); update(); });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    document.addEventListener('motionchange', update);
    scene(canvas, (ctx, w, h, t) => {
      fit(ctx, w, h, 900, 280);
      const p = progress * progress * (3 - 2 * progress);
      const points = Array.from({ length: 60 }, (_, i) => {
        const a = i * 2.39996, r = Math.sqrt(i / 60) * 110;
        return [mix(450 + Math.cos(a) * r * 1.8, 150 + (i % 6) * 120, p), mix(140 + Math.sin(a) * r, 32 + Math.floor(i / 6) * 24, p) + (paused ? 0 : Math.sin(t + i) * 1.5)];
      });
      ctx.globalAlpha = .18 + p * .25;
      points.forEach((a, i) => { [i + 1, i + 6].forEach(j => { if (points[j] && (j !== i + 1 || i % 6 !== 5)) line(ctx, a, points[j], palette.blue, 1); }); });
      ctx.globalAlpha = 1;
      points.forEach((a, i) => dot(ctx, a[0], a[1], mix(8, 3.5, p), i % 7 ? palette.blue : palette.gold));
    });
    update();
  })();

  // 03. Magnification of the same vector sample, with touch and button controls.
  (function microscope() {
    if (!$('.microscope-stage')) return;
    const ns = 'http://www.w3.org/2000/svg';
    const sample = $('.sample-particles'), lensSample = $('.lens-sample');
    const stage = $('.microscope-stage'), lens = $('.microscope-lens');
    function svg(tag, attrs) { const e = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; }
    for (let i = 0; i < 21; i++) {
      const x = 35 + (i % 7) * 88, y = 54 + Math.floor(i / 7) * 110 + Math.sin(i * 4) * 18, rotation = Math.sin(i * 3) * 32;
      const group = svg('g', { transform: `translate(${x} ${y}) rotate(${rotation})` });
      group.appendChild(svg('ellipse', { rx: 42, ry: 25, fill: 'var(--color-primary-highlight)', stroke: 'var(--color-primary)', 'stroke-width': 1.5 }));
      for (let j = -2; j <= 2; j++) group.appendChild(svg('path', { d: `M-30 ${j * 7} H30`, fill: 'none', stroke: 'var(--color-primary)', 'stroke-opacity': .4 }));
      sample.appendChild(group);
      sample.appendChild(svg('path', { d: `M${x + 34} ${y + 14} q14 20 29 8`, fill: 'none', stroke: 'var(--color-warn)', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    }
    lensSample.appendChild($('.microscope-sample rect').cloneNode(true));
    lensSample.appendChild(sample.cloneNode(true));
    let point = [211, 155];
    function inspect(x, y) {
      point = [clamp(x, 0, 600), clamp(y, 0, 330)];
      const r = stage.getBoundingClientRect(), size = parseFloat(getComputedStyle(lens).width) || 128;
      const view = size / Math.max(.1, r.width / 600) / 2.5;
      $('svg', lens).setAttribute('viewBox', `${point[0] - view / 2} ${point[1] - view / 2} ${view} ${view}`);
      lens.style.left = clamp(point[0] / 600 * r.width - size / 2, 0, Math.max(0, r.width - size)) + 'px';
      lens.style.top = clamp(point[1] / 330 * r.height - size / 2, 0, Math.max(0, r.height - size)) + 'px';
    }
    function pointer(e) { const r = stage.getBoundingClientRect(); inspect((e.clientX - r.left) / r.width * 600, (e.clientY - r.top) / r.height * 330); }
    stage.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') pointer(e); });
    stage.addEventListener('pointerdown', pointer);
    const features = {
      particle: [211, 155, 'Graphite: the parallel lines represent layers within a particle. Heat transport depends on their orientation.'],
      pore: [255, 106, 'Pore: the open space between particles. Compression changes the geometry and connectivity of these spaces.'],
      binder: [245, 181, 'Binder: the gold connections illustrate material holding the particle network together.']
    };
    $$('[data-inspect]').forEach(button => button.addEventListener('click', () => { const p = features[button.dataset.inspect]; inspect(p[0], p[1]); $('#microscope-note').textContent = p[2]; $$('[data-inspect]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); }));
    window.addEventListener('resize', () => inspect(...point), { passive: true });
    inspect(...point);
  })();

  // 04. Hold/release compression; a range also allows stable, precise inspection.
  (function compression() {
    const button = $('#compress-hold'), range = $('#compression-range');
    if (!button || !range) return;
    let amount = 0, held = false, fixed = true;
    function sync() { range.value = Math.round(amount * 100); $('#compression-value').value = Math.round(amount * 100) + '%'; }
    function start() { held = true; fixed = false; if (paused) amount = 1; sync(); wake(); }
    function stop() { held = false; if (paused && !fixed) amount = 0; sync(); wake(); }
    button.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); button.focus({ preventScroll: true }); button.setPointerCapture(e.pointerId); start(); });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(type => button.addEventListener(type, stop));
    button.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); } });
    button.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(); } });
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    range.addEventListener('input', () => { held = false; fixed = true; amount = Number(range.value) / 100; sync(); wake(); });
    $('#compress-reset').addEventListener('click', () => { held = false; fixed = true; amount = 0; sync(); wake(); });
    scene($('#compression-canvas'), (ctx, w, h, t, dt) => {
      if (!fixed && !paused) { amount = clamp(amount + dt * (held ? .42 : -.9)); sync(); }
      fit(ctx, w, h, 600, 330);
      const gap = 54 - amount * 27;
      const top = 175 - gap * 1.5 - 27, bottom = 175 + gap * 1.5 + 27;
      line(ctx, [25, top], [325, top], palette.ink, 6); line(ctx, [25, bottom], [325, bottom], palette.ink, 6);
      for (let i = 0; i < 20; i++) {
        const x = 58 + i % 5 * 57, y = 175 + (Math.floor(i / 5) - 1.5) * gap;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(i * 3.1) * .65 * (1 - amount));
        ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2); ctx.fillStyle = palette.blue; ctx.globalAlpha = .65; ctx.fill(); ctx.globalAlpha = 1;
        line(ctx, [-18, 0], [18, 0], palette.surface); ctx.restore();
      }
      line(ctx, [375, 70], [375, 265], palette.grid); line(ctx, [375, 265], [575, 265], palette.grid);
      const curve = q => [375 + q * 200, 240 - (.4 + 2 * Math.pow(q - .35, 2)) * 120];
      for (let i = 1; i <= 50; i++) line(ctx, curve((i - 1) / 50), curve(i / 50), i / 50 <= amount ? palette.blue : palette.grid, 3);
      const p = curve(amount); dot(ctx, ...p, 6, palette.gold);
      text(ctx, 'Relative λ', 385, 45, palette.muted, 18);
      text(ctx, 'Compaction →', 390, 295, palette.muted, 18);
    }, () => held || (!fixed && amount > 0));
  })();

  // 05. Three small experiments with explicit assumptions and paper links.
  (function playground() {
    const range = $('#experiment-range'), canvas = $('#playground-canvas');
    if (!range || !canvas) return;
    let mode = 'geometry';
    const experiments = {
      geometry: { title: 'Protect an earlier task', description: 'Rotate the update relative to a protected direction. The squared projection gives a simple illustration of interference.', control: 'Update angle', max: 90, value: 35, assumption: 'Unit update, one protected direction. This geometric toy is not a prediction of model forgetting.', href: 'post-geometry-of-forgetting.html', link: 'Read the geometry of forgetting →', result: 'Squared projection onto the protected direction' },
      packing: { title: 'Bring particles together', description: 'A fixed set of particles moves into a smaller area. Compare the open spacing with the increasingly connected structure.', control: 'Packing', max: 100, value: 40, assumption: 'Schematic particles with prescribed spacing. The percentage is a control setting, not a measured density or porosity.', href: 'post-calendering-u-shape.html', link: 'Read about electrode structure →', result: 'Illustrative packing setting' },
      thermal: { title: 'Turn the graphite layers', description: 'Rotate the particle layers relative to vertical heat flow. Anisotropy makes the direction of a particle matter.', control: 'Layer angle', max: 90, value: 35, assumption: 'Toy anisotropy ratio 10:1. Relative conductivity = cos² θ + 10 sin² θ; contacts and pores are omitted.', href: 'post-calendering-u-shape.html', link: 'Read the thermal conductivity paper →', result: 'Relative through-plane conductivity' }
    };
    function update() {
      const value = Number(range.value), angle = value * Math.PI / 180;
      $('#experiment-setting').value = value + (mode === 'packing' ? '%' : '°');
      $('#experiment-result').value = mode === 'geometry' ? Math.round(Math.cos(angle) ** 2 * 100) + '%' : mode === 'packing' ? value + '%' : (Math.cos(angle) ** 2 + 10 * Math.sin(angle) ** 2).toFixed(2) + '×';
      wake();
    }
    $$('[data-experiment]').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.experiment; const data = experiments[mode];
      $$('[data-experiment]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      $('#experiment-title').textContent = data.title; $('#experiment-description').textContent = data.description;
      $('#experiment-control-label').textContent = data.control; $('#experiment-assumption').textContent = data.assumption;
      $('#experiment-paper').href = data.href; $('#experiment-paper').textContent = data.link;
      $('#experiment-result-label').textContent = data.result;
      range.max = data.max; range.value = data.value;
      canvas.setAttribute('aria-label', data.description); update();
    }));
    range.addEventListener('input', update);
    scene(canvas, (ctx, w, h) => {
      fit(ctx, w, h, 600, 360);
      const value = Number(range.value), theta = value * Math.PI / 180;
      if (mode === 'geometry') {
        const origin = [140, 270], tip = [140 + Math.cos(theta) * 225, 270 - Math.sin(theta) * 225];
        for (let i = 0; i < 5; i++) { line(ctx, [100, 65 + i * 50], [480, 65 + i * 50], palette.grid); }
        line(ctx, origin, [465, 270], palette.gold, 3);
        line(ctx, origin, tip, palette.blue, 5);
        ctx.setLineDash([5, 5]); line(ctx, tip, [tip[0], 270], palette.muted, 2); ctx.setLineDash([]);
        line(ctx, origin, [tip[0], 270], palette.gold, 8); dot(ctx, ...tip, 10, palette.blue);
        text(ctx, 'Protected direction', 300, 305); text(ctx, 'Update', tip[0] + 15, Math.max(40, tip[1] - 12), palette.blue);
      } else if (mode === 'packing') {
        const spacing = 64 - value * .25;
        for (let i = 0; i < 35; i++) { const x = 300 + (i % 7 - 3) * spacing + (Math.floor(i / 7) % 2 ? spacing / 3 : 0), y = 180 + (Math.floor(i / 7) - 2) * spacing; dot(ctx, x, y, 20, i % 4 ? palette.blue : palette.gold); }
      } else {
        for (let i = 0; i < 9; i++) {
          const x = 160 + i % 3 * 125, y = 90 + Math.floor(i / 3) * 85;
          ctx.save(); ctx.translate(x, y); ctx.rotate(theta); ctx.strokeStyle = palette.blue; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(0, 0, 48, 22, 0, 0, Math.PI * 2); ctx.stroke();
          for (let j = -1; j <= 1; j++) line(ctx, [-36, j * 9], [36, j * 9], palette.blue, 2); ctx.restore();
        }
        line(ctx, [70, 60], [70, 290], palette.gold, 3); line(ctx, [70, 290], [62, 275], palette.gold, 3); line(ctx, [70, 290], [78, 275], palette.gold, 3);
        text(ctx, 'Heat flow ↓', 28, 325, palette.gold);
      }
    }, () => false);
    update();
  })();

  // 06. A semantic topic map: drag is optional; buttons work with keyboard/touch.
  (function constellation() {
    const map = $('.constellation'), group = $('.constellation-lines');
    if (!map || !group) return;
    const buttons = $$('[data-topic]', map);
    const positions = [[23, 24], [77, 24], [23, 76], [77, 76]];
    const content = {
      materials: ['Materials → process → performance', ['The calendering U-shape', 'post-calendering-u-shape.html'], ['Dendrites and dandelions', 'post-dendrites-dandelions.html']],
      learning: ['Learning → memory → adaptation', ['The geometry of forgetting', 'post-geometry-of-forgetting.html'], ['Reading ConvMem', 'post-convmem.html']],
      modelling: ['Physics → structure → prediction', ['Calendering-aware thermal conductivity', 'post-calendering-u-shape.html'], ['CausalPFN', 'post-causalpfn.html']],
      automation: ['Experiments → agents → discovery', ['Physical AI', 'post-physical-ai.html'], ['DisCo and reusable agent skills', 'post-disco-dry-run.html'], ['Research software', '#software']]
    };
    let active = 0;
    function redraw() {
      group.replaceChildren();
      positions.forEach((p, i) => {
        const e = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        e.setAttribute('x1', p[0]); e.setAttribute('y1', p[1]); e.setAttribute('x2', 50); e.setAttribute('y2', 50);
        e.classList.toggle('is-connected', i === active); group.appendChild(e);
        buttons[i].style.setProperty('--node-x', p[0] + '%'); buttons[i].style.setProperty('--node-y', p[1] + '%');
      });
    }
    function choose(index) {
      active = index; buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
      const data = content[buttons[index].dataset.topic], results = $('.constellation-results');
      const heading = document.createElement('h3'); heading.textContent = data[0]; const list = document.createElement('ul');
      data.slice(1).forEach(([label, url]) => { const li = document.createElement('li'), a = document.createElement('a'); a.href = url; a.textContent = label; li.appendChild(a); list.appendChild(li); });
      results.replaceChildren(heading, list); redraw();
    }
    buttons.forEach((button, i) => {
      let dragging = false, moved = false, startX, startY;
      button.addEventListener('click', () => { if (!moved) choose(i); moved = false; });
      button.addEventListener('pointerdown', e => { if (e.button !== 0) return; dragging = true; moved = false; startX = e.clientX; startY = e.clientY; button.setPointerCapture(e.pointerId); });
      button.addEventListener('pointermove', e => { if (!dragging) return; if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) moved = true; if (!moved) return; const r = map.getBoundingClientRect(); positions[i] = [clamp((e.clientX - r.left) / r.width * 100, 18, 82), clamp((e.clientY - r.top) / r.height * 100, 12, 88)]; redraw(); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => button.addEventListener(type, () => { dragging = false; }));
    });
    redraw();
  })();

  // 07. Section-local vector art preserves its aspect ratio on every viewport.
  (function sketches() {
    const old = $('.portfolio-page .page-art');
    if (!old) return;
    const groups = Array.from($('svg', old).children).filter(e => e.tagName.toLowerCase() === 'g' && e.hasAttribute('transform'));
    const targets = ['home', 'experience', 'research', 'publications', 'writing', 'software', 'contributions', 'contact'];
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(items => items.forEach(e => e.target.classList.toggle('sketch-visible', e.isIntersecting))) : null;
    groups.forEach((original, i) => {
      const section = document.getElementById(targets[i]); if (!section) return;
      const wrap = document.createElement('div'); wrap.className = 'section-sketch'; wrap.setAttribute('aria-hidden', 'true'); wrap.dataset.feature = 'responsive-art';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '-240 -210 700 560');
      const group = original.cloneNode(true); group.removeAttribute('transform'); svg.appendChild(group);
      const path = $('path', group); if (path) { const pulse = path.cloneNode(true); pulse.classList.add('sketch-signal'); group.appendChild(pulse); }
      wrap.appendChild(svg); section.prepend(wrap);
      if (io) io.observe(wrap); else wrap.classList.add('sketch-visible');
      section.addEventListener('pointermove', e => { if (paused || e.pointerType !== 'mouse') return; const r = section.getBoundingClientRect(); wrap.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 12}px, ${clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * 8}px)`; });
      section.addEventListener('pointerleave', () => { wrap.style.transform = ''; });
    });
    old.remove();
  })();

  // 08. Project miniatures play on hover, keyboard focus or an explicit button.
  (function previews() {
    const notes = ['An update enters a protected subspace.', 'Orientation and contacts shape a thermal response.', 'A schematic pump → scan → measure workflow.', 'A schematic observe → act → evaluate loop.'];
    $$('#software .item').forEach((item, index) => {
      const figure = document.createElement('figure'); figure.className = 'project-preview'; figure.dataset.feature = 'project-preview';
      const canvas = document.createElement('canvas'); canvas.width = 760; canvas.height = 130; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', notes[index]);
      const caption = document.createElement('figcaption'), note = document.createElement('span'), button = document.createElement('button'); note.textContent = notes[index]; button.type = 'button'; button.className = 'preview-button'; button.textContent = 'Play preview'; button.setAttribute('aria-pressed', 'false');
      caption.append(note, button); figure.append(canvas, caption); item.appendChild(figure);
      let hover = false, focus = false, pinned = false, progress = 0;
      const playing = () => hover || focus || pinned;
      item.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; wake(); } });
      item.addEventListener('pointerleave', () => { hover = false; wake(); });
      item.addEventListener('focusin', e => { focus = e.target !== button; wake(); });
      item.addEventListener('focusout', e => { if (!item.contains(e.relatedTarget)) focus = false; wake(); });
      button.addEventListener('click', () => { pinned = !pinned; if (pinned && paused) progress = (progress + .8) % 4; button.textContent = pinned ? 'Stop preview' : 'Play preview'; button.setAttribute('aria-pressed', String(pinned)); wake(); });
      scene(canvas, (ctx, w, h, t, dt) => {
        const compact = w < 500, vw = compact ? 400 : 760;
        fit(ctx, w, h, vw, 130);
        if (playing() && !paused) progress = (progress + dt * .75) % 4;
        if (index === 0) {
          const angle = .2 + (Math.sin(progress * 1.6) + 1) * .55;
          const x = compact ? 35 : 140, length = compact ? 140 : 200, labelX = compact ? 225 : 400;
          line(ctx, [x, 100], [compact ? 200 : 610, 100], palette.grid, 2);
          line(ctx, [x, 100], [x + Math.cos(angle) * length, 100 - Math.sin(angle) * 80], palette.blue, 4);
          line(ctx, [x, 100], [x + Math.cos(angle) * length, 100], palette.gold, 6);
          text(ctx, 'Update', labelX, 48, palette.blue, 18); text(ctx, compact ? 'Projection' : 'Protected projection', labelX, 78, palette.gold, 18);
        } else if (index === 1) {
          for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate((compact ? 30 : 110) + i * (compact ? 36 : 62), 65); ctx.rotate(Math.sin(progress) * .7); ctx.beginPath(); ctx.ellipse(0, 0, compact ? 16 : 25, 10, 0, 0, Math.PI * 2); ctx.fillStyle = palette.blue; ctx.fill(); ctx.restore(); }
          const start = compact ? 245 : 470, step = compact ? 3 : 5;
          for (let i = 1; i <= 40; i++) line(ctx, [start + (i - 1) * step, 45 + Math.sin((i - 1) / 40 * Math.PI) * 45], [start + i * step, 45 + Math.sin(i / 40 * Math.PI) * 45], palette.blue, 3);
          const p = (Math.sin(progress) + 1) / 2; dot(ctx, start + p * step * 40, 45 + Math.sin(p * Math.PI) * 45, 5, palette.gold);
        } else {
          const labels = index === 2 ? ['Pump', 'Scan', 'Measure'] : ['Observe', 'Act', 'Evaluate'];
          labels.forEach((label, i) => { const gap = compact ? 125 : 215, x = (compact ? 70 : 160) + i * gap; if (i < 2) line(ctx, [x + 18, 52], [x + gap - 18, 52], palette.grid, 2); dot(ctx, x, 52, 13, Math.floor(progress) % 3 === i ? palette.gold : palette.blue); text(ctx, label, x - 30, 95, palette.muted, 18); });
        }
      }, playing);
    });
  })();

  // 09. A changing scientific object accompanies the active career milestone.
  (function careerObject() {
    if (!$('#career-canvas') || !$('.career-timeline')) return;
    const descriptions = {
      'career-materials': ['Cathode materials', 'The chemistry of a solid.'],
      'career-scale': ['Fuel-cell production', 'From laboratory to process.'],
      'career-catalysis': ['Catalyst frameworks', 'Structure creates function.'],
      'career-batteries': ['AI & batteries', 'Manufacturing meets learning.']
    };
    let active = $('.career-timeline').dataset.activeCareer || 'career-batteries';
    function targets(id) {
      return Array.from({ length: 30 }, (_, i) => {
        if (id === 'career-materials') return [45 + i % 6 * 30, 55 + Math.floor(i / 6) * 30];
        if (id === 'career-scale') return [35 + i % 10 * 19, 65 + Math.floor(i / 10) * 52];
        if (id === 'career-catalysis') { const a = i % 6 * Math.PI / 3, radius = 25 + Math.floor(i / 6) * 15; return [120 + Math.cos(a) * radius, 120 + Math.sin(a) * radius]; }
        return i < 15 ? [35 + i % 3 * 23, 60 + Math.floor(i / 3) * 30] : [140 + i % 3 * 28, 50 + Math.floor((i - 15) / 3) * 32];
      });
    }
    let points = targets(active);
    function change(id) { if (!descriptions[id]) return; active = id; $('#career-scene-title').textContent = descriptions[id][0]; $('#career-scene-note').textContent = descriptions[id][1]; $('#career-canvas').setAttribute('aria-label', descriptions[id].join('. ')); wake(); }
    document.addEventListener('careerchange', e => change(e.detail));
    scene($('#career-canvas'), (ctx, w, h, t, dt) => {
      fit(ctx, w, h, 240, 240);
      const target = targets(active);
      points = points.map((p, i) => [mix(p[0], target[i][0], paused ? 1 : 1 - Math.exp(-dt * 6)), mix(p[1], target[i][1], paused ? 1 : 1 - Math.exp(-dt * 6))]);
      points.forEach((a, i) => { points.slice(i + 1).forEach(b => { if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 44) line(ctx, a, b, palette.grid, 1.5); }); });
      points.forEach((p, i) => dot(ctx, p[0], p[1], 4.5 + (paused ? 0 : Math.sin(t + i) * .5), i % 5 ? palette.blue : palette.gold));
    });
    change(active);
  })();

  root.classList.add('experiences-ready');
  applyPause();
  wake();
})();
