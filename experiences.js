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
  function wake(changed = true) {
    if (changed !== false) scenes.forEach(scene => { scene.dirty = true; });
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016);
    last = now;
    if (!paused) elapsed += dt;
    let running = false;
    scenes.forEach(scene => {
      if (!scene.visible || !scene.canvas.isConnected) return;
      if (!scene.dirty && !scene.animate()) return;
      const rect = scene.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(scene.maxDpr, devicePixelRatio || 1);
      const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
      if (scene.canvas.width !== width || scene.canvas.height !== height) { scene.canvas.width = width; scene.canvas.height = height; }
      scene.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.ctx.clearRect(0, 0, rect.width, rect.height);
      scene.ctx.save();
      scene.draw(scene.ctx, rect.width, rect.height, elapsed, dt);
      scene.ctx.restore();
      scene.dirty = false;
      if (scene.animate()) running = true;
    });
    if (running && !paused) wake(false);
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { const scene = scenes.find(s => s.canvas === entry.target); if (scene) scene.visible = entry.isIntersecting; });
    wake();
  }, { rootMargin: '80px' }) : null;
  function scene(canvas, draw, animate = () => true, maxDpr = 2) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const entry = { canvas, ctx, draw, animate, maxDpr, visible: !observer, dirty: true };
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

  // The opening surface unfolds into the page's background without changing canvases.
  (function introduction() {
    const hero = $('#home'), canvas = $('#intro-canvas'), stage = $('.portfolio-atmosphere');
    if (!hero || !canvas || !stage) return;
    const visual = $('.hero-visual', stage), count = $('[data-intro-count]', stage);
    let fullScreen = root.classList.contains('intro-pending');
    let revealing = false, introStartedAt, heroVisible = true;
    const countDelay = .12, countDuration = 2.55, revealDuration = 1.15;
    const dismissEvents = ['pointerdown', 'wheel', 'touchstart', 'keydown', 'focusin', 'resize', 'pagehide'];
    const reels = fullScreen ? $$('[data-intro-place]', stage).map(digit => {
      const place = Number(digit.dataset.introPlace), reel = $('.intro-reel', digit);
      // Long reels roll forward through 009 -> 010 and 099 -> 100 without snapping back.
      reel.replaceChildren(...Array.from({ length: Math.floor(100 / place) + 1 }, (_, value) => {
        const row = document.createElement('span'); row.textContent = String(value % 10); return row;
      }));
      return { place, reel };
    }) : [];
    function setCounter(value) {
      const digits = String(value).padStart(3, '0');
      if (count.textContent === digits) return;
      count.textContent = digits;
      reels.forEach(({ place, reel }) => { reel.style.transform = `translateY(-${Math.floor(value / place)}em)`; });
    }
    function finishIntro() {
      if (!fullScreen) return;
      fullScreen = false; revealing = false;
      root.classList.remove('intro-pending', 'intro-active');
      root.style.setProperty('--intro-reveal', 1);
      clearTimeout(window.introFallback);
      setCounter(100);
      stage.dataset.introState = 'settled';
      dismissEvents.forEach(event => window.removeEventListener(event, finishIntro));
      wake();
    }
    if (fullScreen) {
      clearTimeout(window.introFallback);
      window.introFallback = setTimeout(finishIntro, 6000);
      dismissEvents.forEach(event => window.addEventListener(event, finishIntro, { passive: true }));
      reduced.addEventListener('change', () => { if (reduced.matches) finishIntro(); });
      if (!canvas.getContext('2d')) finishIntro();
    }
    const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
    let pulse = -100;
    hero.addEventListener('pointermove', event => {
      if (paused || fullScreen || event.pointerType !== 'mouse') return;
      const rect = stage.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -.9, .9);
      pointer.y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -.9, .9);
      wake();
    });
    hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = 0; wake(); });
    hero.addEventListener('pointerdown', event => {
      if (paused || fullScreen) return;
      const rect = stage.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -.9, .9);
      pointer.y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -.9, .9);
      pulse = elapsed;
      wake();
    });
    window.addEventListener('scroll', () => { if (!paused) wake(); }, { passive: true });
    scene(canvas, (ctx, width, height, time, dt) => {
      stage.dataset.ready = 'true';
      if (introStartedAt === undefined) introStartedAt = performance.now();
      const openingTime = (performance.now() - introStartedAt) / 1000;
      const loading = clamp((openingTime - countDelay) / countDuration, 0, 1);
      // Increasing velocity lets the early digits breathe before the final rush to 100.
      const progress = Math.pow(loading, 3.4);
      const entrance = fullScreen ? loading : 1;
      const assembled = entrance * entrance * (3 - 2 * entrance);
      // Movement begins on the frame that reaches 100, with no intervening hold.
      const revealTime = fullScreen ? clamp((openingTime - countDelay - countDuration) / revealDuration, 0, 1) : 1;
      const reveal = 1 - Math.pow(1 - revealTime, 3);
      if (fullScreen) {
        setCounter(Math.floor(progress * 100));
        visual.style.setProperty('--intro-progress', progress);
        root.style.setProperty('--intro-reveal', reveal);
        revealing = revealTime > 0;
        if (revealTime === 1) finishIntro();
      }
      stage.dataset.introState = fullScreen ? revealing ? 'revealing' : 'forming' : 'settled';
      eased.x = mix(eased.x, pointer.x, Math.min(1, dt * 5));
      eased.y = mix(eased.y, pointer.y, Math.min(1, dt * 5));
      const heroRect = hero.getBoundingClientRect();
      heroVisible = heroRect.bottom > 0 && heroRect.top < height;
      const scroll = paused ? 0 : clamp(window.scrollY / Math.max(1, document.documentElement.scrollHeight - height));
      const yaw = mix(.42, .18 + scroll * .16, reveal) + eased.x * .12 + Math.sin(time * .18) * .055;
      const pitch = mix(-.65, -.16, reveal) + eased.y * .08;
      const roll = mix(-.22, -.58, reveal) + Math.sin(time * .13) * .035;
      const scale = mix(Math.min(width / 510, height / 580) * 1.15, Math.max(width / 780, height / 720), reveal);
      const cx = width * mix(.5, .9, reveal), cy = height * mix(.43, .46 - scroll * .12, reveal);
      const quiet = mix(1, .48, reveal);
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw), cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      const cosR = Math.cos(roll), sinR = Math.sin(roll);
      const columns = width < 330 ? 23 : 29, rows = width < 330 ? 17 : 23;
      function project(u, v, layer = 0, gather = 1) {
        let x = u * 185, y = v * 195;
        const distance = Math.hypot(u - eased.x, v - eased.y);
        const age = time - pulse;
        const ripple = age < 3 ? Math.sin(distance * 9 - age * 6) * Math.exp(-distance * 2.5 - age * 1.5) * 22 : 0;
        let z = 78 * Math.sin(u * 2.5 + v * .7 + Math.sin(time * .24) * .25)
          + 38 * Math.sin(v * 2.2 + time * .2) + layer + ripple;
        const seed = Math.sin(u * 37 + v * 73);
        x += (1 - gather) * Math.sin(v * 9 + seed) * 110;
        y += (1 - gather) * Math.cos(u * 8 - seed) * 120;
        z += (1 - gather) * seed * 150;
        const rx = x * cosY + z * sinY, rz = z * cosY - x * sinY;
        const ry = y * cosP - rz * sinP, depth = y * sinP + rz * cosP;
        const perspective = 700 / (700 - depth);
        return { x: cx + (rx * cosR - ry * sinR) * scale * perspective,
          y: cy + (rx * sinR + ry * cosR) * scale * perspective, z: depth, p: perspective };
      }
      function stroke(points, colour, alpha, lineWidth) {
        ctx.beginPath();
        points.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.strokeStyle = colour; ctx.globalAlpha = alpha; ctx.lineWidth = lineWidth; ctx.stroke();
      }
      // Grounded, quiet lighting rather than a neon or photographic backdrop.
      const shadow = ctx.createRadialGradient(cx, height * .74, 0, cx, height * .74, width * .34);
      shadow.addColorStop(0, palette.grid); shadow.addColorStop(1, 'transparent');
      ctx.save(); ctx.translate(0, height * .74); ctx.scale(1, .18);
      ctx.fillStyle = shadow; ctx.globalAlpha = .26 * assembled * (1 - reveal);
      ctx.fillRect(0, -height * 4, width, height * 8); ctx.restore();
      const grids = [-24, 0].map(layer => Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, col) => project(col / (columns - 1) * 2 - 1, row / (rows - 1) * 2 - 1, layer, assembled))));
      grids.forEach((grid, layer) => {
        if (layer) {
          const faces = [];
          for (let row = 0; row < rows - 1; row++) for (let col = 0; col < columns - 1; col++) {
            const points = [grid[row][col], grid[row][col + 1], grid[row + 1][col + 1], grid[row + 1][col]];
            faces.push({ points, depth: points.reduce((total, point) => total + point.z, 0) / 4 });
          }
          faces.sort((a, b) => a.depth - b.depth).forEach(face => {
            ctx.beginPath(); face.points.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
            ctx.closePath(); ctx.fillStyle = palette.blue;
            ctx.globalAlpha = (.025 + (face.depth + 260) / 520 * .06) * assembled * quiet; ctx.fill();
          });
        }
        grid.forEach((line, row) => stroke(line, layer ? palette.blue : palette.ink,
          (layer ? .2 + row / rows * .24 : .1) * assembled * quiet, layer ? .75 : .5));
        for (let col = 0; col < columns; col += layer ? 1 : 3) {
          stroke(grid.map(row => row[col]), layer ? palette.blue : palette.ink, (layer ? .18 : .08) * assembled * quiet, .5);
        }
      });
      const nodes = grids[1].flat().sort((a, b) => a.z - b.z);
      nodes.forEach((point, i) => {
        ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(.5, point.p * (i % 11 === 0 ? 1.6 : .65)), 0, Math.PI * 2);
        ctx.fillStyle = i % 11 === 0 ? palette.blue : palette.ink;
        ctx.globalAlpha = (.24 + (point.z + 250) / 500 * .4) * (.6 + .4 * assembled) * quiet; ctx.fill();
      });
      // A warm path follows the structure while the material breathes beneath it.
      const route = Array.from({ length: 80 }, (_, i) => {
        const u = i / 79 * 2 - 1;
        const point = project(u, .34 * Math.sin(u * 3 + time * .12), 3);
        const along = i / 79;
        // The same gold curve unwinds into the line running behind the page artwork.
        return { x: mix(point.x, width * (.76 + .11 * Math.sin(along * 6 + time * .12 + scroll * 2)), reveal),
          y: mix(point.y, height * (-.12 + along * 1.37), reveal), p: mix(point.p, .7, reveal) };
      });
      stroke(route, palette.gold, mix(.75, .32, reveal) * assembled, 1.35);
      for (let i = 0; i < 3; i++) {
        const at = ((time * .065 + i / 3) % 1) * 79, point = route[Math.floor(at)];
        ctx.beginPath(); ctx.arc(point.x, point.y, 2.8 * point.p, 0, Math.PI * 2);
        ctx.globalAlpha = .9 * assembled * quiet; ctx.fillStyle = palette.gold; ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Protect the reading column while keeping the larger mesh clear at the page edge.
      if (reveal > 0) {
        const mask = ctx.createLinearGradient(0, 0, width, 0);
        [[0, .04], [.4, .07], [.66, .3], [1, .85]].forEach(([at, alpha]) => {
          mask.addColorStop(at, `rgba(0,0,0,${mix(1, alpha, reveal)})`);
        });
        ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = mask;
        ctx.fillRect(0, 0, width, height); ctx.globalCompositeOperation = 'source-over';
      }
    }, () => fullScreen || heroVisible, 1.5);
  })();

  // Recent notes and topic trails share the same blog explorer.
  (function atlas() {
    const buttons = $$('[data-topic]'), panels = $$('.atlas-panel');
    if (!buttons.length) return;
    const stories = panels.filter(panel => panel.id !== 'atlas-latest').flatMap(panel => $$('.atlas-story', panel));
    const intros = new Map($$('.atlas-intro').map(intro => [intro, intro.textContent.trim()]));
    function fitIntros() {
      const panel = panels.find(p => p.dataset.active === 'true');
      if (!panel) return;
      $$('.atlas-story:not([hidden]) .atlas-intro', panel).forEach(intro => {
        const full = intros.get(intro);
        intro.textContent = full; delete intro.dataset.truncated;
        if (!intro.clientWidth || intro.scrollHeight <= intro.clientHeight + 1) return;
        const words = full.split(/\s+/);
        let lo = 0, hi = words.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          intro.textContent = words.slice(0, mid).join(' ') + ' [...]';
          if (intro.scrollHeight <= intro.clientHeight + 1) lo = mid; else hi = mid - 1;
        }
        intro.textContent = words.slice(0, lo).join(' ') + ' [...]';
        intro.dataset.truncated = 'true';
      });
    }
    let lastPick;
    function select(button) {
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      panels.forEach(panel => {
        panel.dataset.active = String(panel.id === button.getAttribute('aria-controls'));
        delete panel.dataset.featured;
        $$('.atlas-story', panel).forEach(story => { story.hidden = story.dataset.preview !== 'true'; });
      });
      $('#atlas-trail').textContent = $('strong', button).textContent + ' / ' + $('small', button).textContent;
      fitIntros();
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
      fitIntros();
    });
    requestAnimationFrame(fitIntros);
    document.fonts?.ready.then(fitIntros);
    window.addEventListener('resize', fitIntros, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(fitIntros).observe($('#atlas-work'));
  })();

  // Section-local vector art preserves its aspect ratio on every viewport.
  (function sketches() {
    const old = $('.portfolio-page .page-art');
    if (!old) return;
    const groups = Array.from($('svg', old).children).filter(e => e.tagName.toLowerCase() === 'g' && e.hasAttribute('transform'));
    const targets = [null, 'experience', null, 'publications', 'writing', 'software', 'contributions'];
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(items => items.forEach(e => e.target.classList.toggle('sketch-visible', e.isIntersecting))) : null;
    groups.forEach((original, i) => {
      if (!targets[i]) return;
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
