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
  function applyPause() {
    root.classList.toggle('motion-paused', paused);
    document.dispatchEvent(new Event('motionchange'));
    wake();
  }
  reduced.addEventListener('change', () => { paused = reduced.matches; applyPause(); });
  document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake(); });
  window.addEventListener('resize', wake, { passive: true });
  new MutationObserver(() => { readPalette(); wake(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // Recent notes and topic trails share the same blog explorer.
  (function atlas() {
    const buttons = $$('[data-topic]'), panels = $$('.atlas-panel');
    if (!buttons.length) return;
    const stories = panels.filter(panel => panel.id !== 'atlas-latest').flatMap(panel => $$('.atlas-story', panel));
    let lastPick;
    function select(button) {
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      panels.forEach(panel => {
        panel.dataset.active = String(panel.id === button.getAttribute('aria-controls'));
        delete panel.dataset.featured;
        $$('.atlas-story', panel).forEach(story => { story.hidden = false; });
      });
      $('#atlas-trail').textContent = $('strong', button).textContent + ' / ' + $('small', button).textContent;
    }
    buttons.forEach(button => button.addEventListener('click', () => select(button)));
    $('[data-atlas-surprise]')?.addEventListener('click', () => {
      const pool = stories.filter(story => story.dataset.post !== lastPick);
      if (!pool.length) return;
      const pick = pool[Math.floor(Math.random() * pool.length)], panel = pick.closest('.atlas-panel');
      const button = buttons.find(b => b.getAttribute('aria-controls') === panel.id);
      select(button);
      lastPick = pick.dataset.post;
      panel.dataset.featured = 'true';
      $$('.atlas-story', panel).forEach(story => { story.hidden = story !== pick; });
      $('#atlas-trail').textContent = $('span', button).textContent + ' / ' + $('strong', button).textContent + ' / A lucky find: ' + $('strong', pick).textContent;
    });
  })();

  // Section-local vector art preserves its aspect ratio on every viewport.
  (function sketches() {
    const old = $('.portfolio-page .page-art');
    if (!old) return;
    const groups = Array.from($('svg', old).children).filter(e => e.tagName.toLowerCase() === 'g' && e.hasAttribute('transform'));
    const targets = ['home', 'experience', 'research', 'publications', 'writing', 'software', 'contributions'];
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

  // A changing scientific object accompanies the active career milestone.
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
