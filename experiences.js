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
  function labViewport(canvas, w, h) {
    const stage = canvas.closest('.lab-stage');
    const top = $('.lab-toolbar', stage).offsetHeight + 28;
    const bottom = $('.lab-hud', stage).offsetHeight + 28;
    const scale = Math.min(w / 600, Math.max(1, h - top - bottom) / 440);
    return { scale, x: (w - 600 * scale) / 2, y: top + (h - top - bottom - 440 * scale) / 2 };
  }
  function fitLab(ctx, canvas, w, h) {
    const view = labViewport(canvas, w, h);
    ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale);
  }
  function labPoint(canvas, e) {
    const rect = canvas.getBoundingClientRect(), view = labViewport(canvas, rect.width, rect.height);
    return [(e.clientX - rect.left - view.x) / view.scale, (e.clientY - rect.top - view.y) / view.scale];
  }
  function line(ctx, a, b, color, width = 1) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function dot(ctx, x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function text(ctx, value, x, y, color = palette.muted, size = 14) { ctx.font = size + 'px "Noto Sans", sans-serif'; ctx.fillStyle = color; ctx.fillText(value, x, y); }
  function applyPause() {
    root.classList.toggle('motion-paused', paused);
    document.dispatchEvent(new Event('motionchange'));
    wake();
  }
  reduced.addEventListener('change', () => { paused = reduced.matches; applyPause(); });
  document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake(); });
  window.addEventListener('resize', wake, { passive: true });
  new MutationObserver(() => { readPalette(); wake(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // Particle geometry for the electrode interaction.
  function particles(compaction) {
    return Array.from({ length: 30 }, (_, i) => ({
      x: 84 + i % 6 * 84 + (Math.floor(i / 6) % 2 ? 13 : -4) + Math.sin(i * 7) * 12,
      y: 215 + (Math.floor(i / 6) - 2) * (65 - compaction * 11) + Math.sin(i * 3) * 9,
      angle: Math.sin(i * 5.7) * (.7 - compaction * .27),
      rx: 35 + Math.sin(i * 2.1) * 5, ry: 19 + Math.cos(i * 4) * 3
    }));
  }
  function grain(ctx, p, highlight = false) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * Math.PI * 2, r = 1 + .08 * Math.cos(a * 3 + p.rx) + .05 * Math.sin(a * 5 + p.ry);
      const x = Math.cos(a) * p.rx * r, y = Math.sin(a) * p.ry * r;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const fill = ctx.createLinearGradient(-p.rx, -p.ry, p.rx, p.ry);
    fill.addColorStop(0, palette.surface); fill.addColorStop(1, palette.blue);
    ctx.fillStyle = fill; ctx.globalAlpha = highlight ? 1 : .75; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = highlight ? palette.gold : palette.blue; ctx.lineWidth = highlight ? 2.5 : 1; ctx.stroke();
    ctx.clip(); ctx.globalAlpha = .35;
    for (let y = -24; y < 25; y += 5) line(ctx, [-42, y], [42, y + 3], palette.ink, .8);
    ctx.globalAlpha = .12;
    for (let i = 0; i < 28; i++) dot(ctx, Math.sin(i * 12.3 + p.rx) * 38, Math.cos(i * 7.9 + p.ry) * 22, .65, palette.ink);
    ctx.restore();
  }
  function contours(ctx, x, y, rotation, color, count = 8) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    for (let i = count; i > 0; i--) {
      ctx.beginPath(); ctx.ellipse(0, 0, i * 37, i * 12, 0, 0, Math.PI * 2);
      ctx.globalAlpha = .035; ctx.fillStyle = color; ctx.fill();
      ctx.globalAlpha = .12 + (count - i) * .035; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }
  function arrow(ctx, a, b, color, width = 2) {
    line(ctx, a, b, color, width);
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    line(ctx, b, [b[0] - 10 * Math.cos(angle - .4), b[1] - 10 * Math.sin(angle - .4)], color, width);
    line(ctx, b, [b[0] - 10 * Math.cos(angle + .4), b[1] - 10 * Math.sin(angle + .4)], color, width);
  }
  function plotGrid(ctx, width, height) {
    ctx.save(); ctx.globalAlpha = .45;
    for (let x = 30; x < width; x += 30) for (let y = 30; y < height; y += 30) dot(ctx, x, y, .7, palette.muted);
    ctx.restore();
  }

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

  // Drag in the landscape itself. A fixed quadratic makes every readout explicit.
  (function taskLandscape() {
    const canvas = $('#landscape-canvas'), protect = $('#landscape-protect');
    if (!canvas || !protect) return;
    const origin = [240, 220], rotation = -.4, c = Math.cos(rotation), s = Math.sin(rotation);
    let target = [380, 75], protectedTask = true, dragging = false;
    function geometry() {
      const dx = target[0] - origin[0], dy = target[1] - origin[1];
      const u = dx * c + dy * s, v = -dx * s + dy * c, factor = protectedTask ? .2 : 1;
      return { u, v, point: [origin[0] + u * c - v * factor * s, origin[1] + u * s + v * factor * c],
        ratio: (u * u + 9 * (v * factor) ** 2) / Math.max(.001, u * u + 9 * v * v) };
    }
    function update() {
      const { u, v, ratio } = geometry();
      const cost = u * u + v * v < 1 ? 0 : Math.round(ratio * 100);
      $('#landscape-cost').textContent = cost + '%';
      $('#landscape-meter-fill').style.width = cost + '%';
      protect.textContent = protectedTask ? 'Protection on' : 'Protection off';
      wake();
    }
    function move(e) {
      const [x, y] = labPoint(canvas, e);
      target = [clamp(x, 50, 550), clamp(y, 55, 355)]; update();
    }
    canvas.addEventListener('pointerdown', e => { if (e.button !== 0) return; dragging = true; canvas.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true }); move(e); });
    canvas.addEventListener('pointermove', e => { if (dragging) move(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, () => { dragging = false; }));
    canvas.addEventListener('keydown', e => {
      const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key];
      if (!delta) return; e.preventDefault(); target = [clamp(target[0] + delta[0], 50, 550), clamp(target[1] + delta[1], 55, 355)]; update();
    });
    protect.addEventListener('click', () => { protectedTask = !protectedTask; protect.setAttribute('aria-pressed', String(protectedTask)); update(); });
    $('#landscape-reset').addEventListener('click', () => { target = [380, 75]; update(); });
    scene(canvas, (ctx, w, h, t) => {
      fitLab(ctx, canvas, w, h); plotGrid(ctx, 600, 400);
      contours(ctx, ...origin, rotation, palette.blue, 10);
      const { point } = geometry();
      ctx.save(); ctx.setLineDash([3, 6]); line(ctx, origin, target, palette.gold, 1.5); line(ctx, point, target, palette.gold, 1); ctx.restore();
      arrow(ctx, origin, point, palette.blue, 3);
      if (!paused) { const f = t * .35 % 1; dot(ctx, mix(origin[0], point[0], f), mix(origin[1], point[1], f), 3, palette.blue); }
      dot(ctx, ...origin, 5, palette.ink); dot(ctx, ...point, 7, palette.blue);
      ctx.beginPath(); ctx.arc(...target, 17, 0, Math.PI * 2); ctx.fillStyle = palette.surface; ctx.fill(); ctx.strokeStyle = palette.gold; ctx.lineWidth = 2; ctx.stroke();
      dot(ctx, ...target, 5, palette.gold);
      text(ctx, 'NEW TASK', clamp(target[0] - 35, 20, 490), target[1] - 27, palette.gold, 12);
      text(ctx, 'earlier task', origin[0] - 33, origin[1] + 30, palette.muted, 13);
      dot(ctx, 36, 414, 4, palette.blue); text(ctx, protectedTask ? 'Protected update' : 'Unprotected update', 48, 419, palette.blue, 13);
      dot(ctx, 347, 414, 4, palette.gold); text(ctx, 'New-task target', 359, 419, palette.gold, 13);
    });
    update();
  })();

  // The selected grain exposes its contact neighbourhood as structure changes.
  (function transport() {
    const canvas = $('#transport-canvas');
    if (!canvas) return;
    let state = 0, current = 0, selected = 16;
    const notes = ['Open pores interrupt the contact network.', 'Layers turn toward the plane of the electrode.', 'Closer particles create additional contact paths.'];
    function radius(p, angle) { const a = angle - p.angle; return 1 / Math.sqrt((Math.cos(a) / p.rx) ** 2 + (Math.sin(a) / p.ry) ** 2); }
    function contacts(points) {
      const edges = [];
      points.forEach((p, i) => points.slice(i + 1).forEach((q, k) => {
        const angle = Math.atan2(q.y - p.y, q.x - p.x);
        if (Math.hypot(q.x - p.x, q.y - p.y) - radius(p, angle) - radius(q, angle) < 15) edges.push([i, i + k + 1]);
      }));
      return edges;
    }
    function update() {
      const edges = contacts(particles(state)), count = edges.filter(edge => edge.includes(selected)).length;
      $('#transport-note').textContent = notes[state];
      $('#transport-count').textContent = count;
      $('#transport-contact-label').textContent = `schematic contact${count === 1 ? '' : 's'} at particle ${selected + 1}`;
      wake();
    }
    $$('[data-compaction]').forEach(button => button.addEventListener('click', () => {
      state = Number(button.dataset.compaction);
      $$('[data-compaction]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); update();
    }));
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const [x, y] = labPoint(canvas, e);
      selected = particles(current).reduce((best, p, i, all) => Math.hypot(p.x - x, p.y - y) < Math.hypot(all[best].x - x, all[best].y - y) ? i : best, 0);
      canvas.focus({ preventScroll: true }); update();
    });
    canvas.addEventListener('keydown', e => {
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -6, ArrowDown: 6 }[e.key];
      if (!delta) return; e.preventDefault(); selected = (selected + delta + 30) % 30; update();
    });
    scene(canvas, (ctx, w, h, t, dt) => {
      fitLab(ctx, canvas, w, h); current = paused ? state : mix(current, state, 1 - Math.exp(-dt * 5));
      plotGrid(ctx, 600, 400);
      const points = particles(current), edges = contacts(points), neighbours = new Set([selected]);
      edges.forEach(([i, j]) => { if (i === selected) neighbours.add(j); if (j === selected) neighbours.add(i); });
      // A warm-to-cool field gives context to the cross-section without claiming a solution.
      const glow = ctx.createLinearGradient(0, 50, 0, 385); glow.addColorStop(0, palette.gold); glow.addColorStop(1, palette.blue);
      ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = glow; ctx.fillRect(28, 52, 544, 328); ctx.restore();
      edges.forEach(([i, j]) => { ctx.save(); ctx.globalAlpha = .25; line(ctx, [points[i].x, points[i].y], [points[j].x, points[j].y], palette.blue, 5); ctx.restore(); });
      points.forEach((p, i) => grain(ctx, p, neighbours.has(i)));
      edges.filter(edge => edge.includes(selected)).forEach(([i, j]) => {
        const p = points[i], q = points[j];
        line(ctx, [p.x, p.y], [q.x, q.y], palette.gold, 2);
        const f = paused ? .5 : (t * .45 + i * .13) % 1;
        dot(ctx, mix(p.x, q.x, f), mix(p.y, q.y, f), 4, palette.gold);
      });
      const p = points[selected]; dot(ctx, p.x, p.y, 5, palette.gold);
      text(ctx, 'WARM FACE', 30, 36, palette.gold, 12); text(ctx, 'COOL FACE', 30, 401, palette.blue, 12);
      text(ctx, 'PARTICLE ' + String(selected + 1).padStart(2, '0'), 430, 419, palette.muted, 12);
    });
    update();
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
