/* Independent, dependency-free research experiences. All animation shares one
   visibility-aware frame loop; controls remain usable with motion paused. */
(function () {
  'use strict';
  const root = document.documentElement;
  // Select the compact layout before any geometry/style reads can lay out
  // the no-JavaScript fallback with every article preview expanded.
  root.classList.add('experiences-ready');
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
  let frame = 0, last = 0;
  function wake(changed = true) {
    if (changed !== false) scenes.forEach(scene => { scene.dirty = true; });
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016);
    last = now;
    let running = false;
    scenes.forEach(scene => {
      if (!scene.visible || !scene.canvas.isConnected) return;
      const animating = scene.animate();
      if (!scene.dirty && !animating) return;
      const fps = typeof scene.maxFps === 'function' ? scene.maxFps() : scene.maxFps;
      if (!scene.dirty && now - scene.lastDraw < 1000 / fps - .5) { running = animating || running; return; }
      const rect = scene.size;
      if (!rect.width || !rect.height) return;
      const maxDpr = typeof scene.maxDpr === 'function' ? scene.maxDpr() : scene.maxDpr;
      const maxPixels = typeof scene.maxPixels === 'function' ? scene.maxPixels() : scene.maxPixels;
      const dpr = Math.min(maxDpr, devicePixelRatio || 1, Math.sqrt(maxPixels / (rect.width * rect.height)));
      const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
      if (scene.canvas.width !== width || scene.canvas.height !== height) { scene.canvas.width = width; scene.canvas.height = height; }
      scene.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.ctx.clearRect(0, 0, rect.width, rect.height);
      scene.ctx.save();
      // Each scene keeps its own clock, so another animation cannot advance
      // an off-screen scene and make it jump when it is drawn again.
      const elapsed = Math.min(.05, scene.lastDraw ? (now - scene.lastDraw) / 1000 : dt);
      scene.lastDraw = now;
      if (!paused && animating) scene.time += elapsed;
      scene.draw(scene.ctx, rect.width, rect.height, scene.time, elapsed);
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
  function scene(canvas, draw, animate = () => true, maxDpr = 2, maxFps = 60, maxPixels = Infinity, context = null) {
    if (!canvas) return;
    const ctx = context || canvas.getContext('2d');
    if (!ctx) return;
    const entry = { canvas, ctx, draw, animate, maxDpr, maxFps, maxPixels, visible: !observer, dirty: true, time: 0, lastDraw: 0, size: { width: 0, height: 0 } };
    const measure = () => { entry.size = canvas.getBoundingClientRect(); entry.dirty = true; wake(false); };
    if ('ResizeObserver' in window) new ResizeObserver(entries => {
      entry.size = entries[0].contentRect; entry.dirty = true; wake(false);
    }).observe(canvas);
    else { measure(); window.addEventListener('resize', measure, { passive: true }); }
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

  /* Batch the opening's faces, wire strokes and circular points on the GPU.
     This small adapter preserves the same geometry and the Canvas 2D fallback;
     the browser receives two draw calls instead of repainting a large bitmap. */
  function meshContext(original) {
    const canvas = document.createElement('canvas');
    for (const { name, value } of original.attributes) canvas.setAttribute(name, value);
    const options = { alpha: true, premultipliedAlpha: true, antialias: true,
      depth: false, stencil: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext('webgl', options);
    if (!gl) return null;
    const release = () => gl.getExtension('WEBGL_lose_context')?.loseContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const device = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    if (/swiftshader|llvmpipe|software/i.test(device)) { release(); return null; }
    const program = gl.createProgram();
    function shader(type, source) {
      const result = gl.createShader(type);
      gl.shaderSource(result, source); gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('mesh shader');
      gl.attachShader(program, result); gl.deleteShader(result);
    }
    try {
      shader(gl.VERTEX_SHADER, `
        attribute vec2 position; attribute vec4 colour; attribute float diameter;
        uniform vec2 resolution; uniform float pixelRatio; varying vec4 ink;
        void main() {
          gl_Position=vec4(position/resolution*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
          gl_PointSize=diameter*pixelRatio; ink=colour;
        }`);
      shader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform float reveal; uniform float viewportWidth; uniform float points;
        varying vec4 ink;
        void main() {
          float x=gl_FragCoord.x/viewportWidth;
          float fade=x<.4?mix(.04,.07,x/.4):x<.66?mix(.07,.3,(x-.4)/.26):mix(.3,.85,(x-.66)/.34);
          float a=ink.a*mix(1.,fade,reveal);
          if(points>.5) a*=1.-smoothstep(.72,1.,length(gl_PointCoord*2.-1.));
          gl_FragColor=vec4(ink.rgb*a,a);
        }`);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('mesh program');
    } catch (_) {
      gl.deleteProgram(program);
      // Keep the original canvas available for 2D if GPU setup fails.
      release(); return null;
    }
    gl.useProgram(program); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const uniforms = Object.fromEntries(['resolution', 'pixelRatio', 'reveal', 'viewportWidth', 'points']
      .map(name => [name, gl.getUniformLocation(program, name)]));
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [name, size, offset] of [['position', 2, 0], ['colour', 4, 8], ['diameter', 1, 24]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 28, offset);
    }
    let triangles = new Float32Array(65536), points = new Float32Array(8192);
    let triangleCount = 0, pointCount = 0, ratio = 1;
    const path = [], starts = [], circles = [], colours = new Map();
    const ctx = { canvas, gpu: true, gl, globalAlpha: 1, lineWidth: 1, fillStyle: '#000000', strokeStyle: '#000000', reveal: 0 };
    function colour(value) {
      if (!colours.has(value)) {
        let parts;
        if (/^#[a-f0-9]{6}$/i.test(value)) parts = [1, 3, 5].map(at => parseInt(value.slice(at, at + 2), 16) / 255);
        else if (/^#[a-f0-9]{3}$/i.test(value)) parts = [1, 2, 3].map(at => parseInt(value[at] + value[at], 16) / 255);
        else parts = (value.match(/[\d.]+/g) || ['0', '0', '0']).slice(0, 3).map(n => Number(n) / 255);
        colours.set(value, parts);
      }
      return colours.get(value);
    }
    function vertex(isPoint, x, y, ink, diameter = 1) {
      let target = isPoint ? points : triangles;
      const at = isPoint ? pointCount : triangleCount;
      if (at + 7 > target.length) {
        const larger = new Float32Array(target.length * 2); larger.set(target);
        if (isPoint) points = target = larger; else triangles = target = larger;
      }
      target[at] = x; target[at + 1] = y;
      target[at + 2] = ink[0]; target[at + 3] = ink[1]; target[at + 4] = ink[2];
      target[at + 5] = ctx.globalAlpha; target[at + 6] = diameter;
      if (isPoint) pointCount += 7; else triangleCount += 7;
    }
    ctx.setTransform = dpr => { ratio = dpr; };
    ctx.clearRect = () => {
      triangleCount = pointCount = 0;
      gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    };
    ctx.save = () => {};
    ctx.restore = () => {
      gl.uniform2f(uniforms.resolution, canvas.width / ratio, canvas.height / ratio);
      gl.uniform1f(uniforms.pixelRatio, ratio); gl.uniform1f(uniforms.reveal, ctx.reveal);
      gl.uniform1f(uniforms.viewportWidth, canvas.width);
      for (const [array, count, primitive, round] of [[triangles, triangleCount, gl.TRIANGLES, 0], [points, pointCount, gl.POINTS, 1]]) {
        if (!count) continue;
        gl.uniform1f(uniforms.points, round);
        gl.bufferData(gl.ARRAY_BUFFER, array.subarray(0, count), gl.DYNAMIC_DRAW);
        gl.drawArrays(primitive, 0, count / 7);
      }
    };
    ctx.beginPath = () => { path.length = starts.length = circles.length = 0; };
    ctx.moveTo = (x, y) => { starts.push(path.length); path.push(x, y); };
    ctx.lineTo = (x, y) => path.push(x, y);
    ctx.closePath = () => {};
    ctx.arc = (x, y, radius) => circles.push(x, y, radius);
    ctx.fill = () => {
      const ink = colour(ctx.fillStyle);
      for (let s = 0; s < starts.length; s++) {
        const from = starts[s], end = starts[s + 1] ?? path.length;
        for (let at = from + 2; at + 2 < end; at += 2) {
          vertex(false, path[from], path[from + 1], ink);
          vertex(false, path[at], path[at + 1], ink);
          vertex(false, path[at + 2], path[at + 3], ink);
        }
      }
      for (let at = 0; at < circles.length; at += 3) vertex(true, circles[at], circles[at + 1], ink, circles[at + 2] * 2);
    };
    ctx.stroke = () => {
      const ink = colour(ctx.strokeStyle);
      for (let s = 0; s < starts.length; s++) {
        const end = starts[s + 1] ?? path.length;
        for (let at = starts[s]; at + 3 < end; at += 2) {
          const ax = path[at], ay = path[at + 1], bx = path[at + 2], by = path[at + 3];
          const distance = Math.hypot(bx - ax, by - ay);
          if (!distance) continue;
          const dx = -(by - ay) / distance * ctx.lineWidth / 2, dy = (bx - ax) / distance * ctx.lineWidth / 2;
          vertex(false, ax + dx, ay + dy, ink); vertex(false, ax - dx, ay - dy, ink); vertex(false, bx + dx, by + dy, ink);
          vertex(false, bx + dx, by + dy, ink); vertex(false, ax - dx, ay - dy, ink); vertex(false, bx - dx, by - dy, ink);
        }
      }
    };
    original.replaceWith(canvas);
    return ctx;
  }

  // The opening surface unfolds into the page's background without changing canvases.
  (function introduction() {
    const hero = $('#home'), stage = $('.portfolio-atmosphere');
    let canvas = $('#intro-canvas');
    if (!hero || !canvas || !stage) return;
    if (root.dataset.backgroundRenderer === 'fallback') return;
    const count = $('[data-intro-count]', stage);
    const progressBar = $('.intro-progress', stage);
    const revealTargets = $$('.hero-copy, .hero-portrait', hero);
    const compact = matchMedia('(max-width: 760px), (pointer: coarse)');
    let slowFrames = 0, economy = Boolean(navigator.connection?.saveData);
    const lightweight = () => compact.matches || economy;
    let fullScreen = root.classList.contains('intro-pending');
    let revealing = false, introStartedAt, heroVisible = true;
    let pulse = -100, surfaceTime = 0, meshTime = 0, settledClockOffset = 0;
    const countDelay = .03, countDuration = 2.55, revealDuration = 1.15;
    const countAcceleration = 3, countRange = Math.expm1(countAcceleration);
    const counterAt = elapsed => {
      const progress = clamp((elapsed - countDelay) / countDuration);
      return progress === 1 ? 100 : 100 * Math.expm1(countAcceleration * progress) / countRange;
    };
    // Mobile browsers resize while settling their viewport; the scene already adapts.
    const dismissEvents = ['pointerdown', 'wheel', 'touchstart', 'keydown', 'focusin', 'pagehide'];
    function setPhase(phase) {
      if (stage.dataset.introState !== phase) stage.dataset.introState = phase;
    }
    const reels = fullScreen ? $$('[data-intro-place]', stage).map(digit => {
      const place = Number(digit.dataset.introPlace), reel = $('.intro-reel', digit);
      // Repeated, pre-rendered digits roll through the wrap without repainting
      // text on every tick or creating a 101-row composited layer.
      reel.replaceChildren(...Array.from({ length: place === 100 ? 2 : 20 }, (_, i) => {
        const row = document.createElement('span'); row.dataset.digit = String(i % 10); return row;
      }));
      return { place, reel };
    }) : [];
    function setCounter(value) {
      const digits = String(Math.floor(value)).padStart(3, '0');
      if (count.dataset.value !== digits) count.dataset.value = digits;
      progressBar.style.setProperty('--intro-progress', value / 100);
      reels.forEach(({ place, reel }) => {
        // One continuous odometer position replaces overlapping/cancelled digit
        // animations. Carries roll only during the last unit of the lower place.
        const digit = Math.floor(value / place) % 10;
        const carry = clamp(value % place - (place - 1));
        reel.style.transform = `translateY(-${digit + carry}em)`;
      });
    }
    function setReveal(value) {
      // A custom property on <html> invalidates styles across the whole page.
      // Keep animated values local to the three elements that actually use them.
      stage.style.setProperty('--intro-reveal', value);
      revealTargets.forEach(target => {
        target.style.opacity = value;
        target.style.transform = `translateY(${(1 - value) * 18}px)`;
      });
    }
    function finishIntro() {
      if (!fullScreen) return;
      settledClockOffset = meshTime - surfaceTime;
      fullScreen = false; revealing = false;
      root.classList.remove('intro-pending', 'intro-active');
      setReveal(1);
      revealTargets.forEach(target => { target.style.removeProperty('opacity'); target.style.removeProperty('transform'); });
      clearTimeout(window.introFallback);
      setCounter(100);
      setPhase('settled');
      dismissEvents.forEach(event => window.removeEventListener(event, finishIntro));
      wake();
    }
    if (fullScreen) {
      clearTimeout(window.introFallback);
      window.introFallback = setTimeout(() => {
        if (root.dataset.backgroundRenderer === 'pending') root.dataset.backgroundRenderer = 'fallback';
        finishIntro();
      }, 6000);
      dismissEvents.forEach(event => window.addEventListener(event, finishIntro, { passive: true }));
      reduced.addEventListener('change', () => { if (reduced.matches) finishIntro(); });
    }
    let renderer;
    try { renderer = meshContext(canvas) || canvas.getContext('2d'); } catch (_) { renderer = canvas.getContext('2d'); }
    if (renderer?.canvas && renderer.gpu) canvas = renderer.canvas;
    if (!renderer) {
      root.dataset.backgroundRenderer = 'fallback';
      finishIntro();
      clearTimeout(window.introFallback);
      setPhase('settled');
      return;
    }
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); root.dataset.backgroundRenderer = 'fallback'; finishIntro();
      clearTimeout(window.introFallback); setPhase('settled');
    });
    const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
    let grids, gridLines, nodes, gridColumns = 0, mask, maskWidth = 0, maskPixels = 0, maskReveal = -1;
    const route = Array.from({ length: 80 }, () => ({}));
    hero.addEventListener('pointermove', event => {
      if (paused || fullScreen || event.pointerType !== 'mouse') return;
      const rect = stage.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -.9, .9);
      pointer.y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -.9, .9);
      wake(false);
    });
    hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = 0; wake(false); });
    hero.addEventListener('pointerdown', event => {
      if (paused || fullScreen) return;
      const rect = stage.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -.9, .9);
      pointer.y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -.9, .9);
      pulse = surfaceTime;
      wake();
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting; wake(false);
    }).observe(hero);
    else window.addEventListener('scroll', () => {
      const rect = hero.getBoundingClientRect();
      heroVisible = rect.bottom > 0 && rect.top < innerHeight; wake(false);
    }, { passive: true });
    scene(canvas, (ctx, width, height, time, dt) => {
      if (root.dataset.backgroundRenderer === 'fallback') return;
      const drawStarted = performance.now();
      surfaceTime = time;
      if (introStartedAt === undefined) introStartedAt = performance.now();
      const openingTime = (performance.now() - introStartedAt) / 1000;
      // Increasing velocity lets the early digits breathe before the final rush to 100.
      const value = counterAt(openingTime);
      const progress = value / 100;
      const entrance = fullScreen ? progress : 1;
      const assembled = entrance * entrance * (3 - 2 * entrance);
      // Movement begins on the frame that reaches 100, with no intervening hold.
      const revealTime = fullScreen ? clamp((openingTime - countDelay - countDuration) / revealDuration, 0, 1) : 1;
      const reveal = 1 - Math.pow(1 - revealTime, 3);
      if (fullScreen) {
        setCounter(value);
        if (revealTime > 0) setReveal(reveal);
        revealing = revealTime > 0;
        if (revealTime === 1) finishIntro();
      }
      setPhase(fullScreen ? revealing ? 'revealing' : 'forming' : 'settled');
      // The same continuous progress drives the counter and the surface. Rounding
      // is only for the readable number, never for the animation's geometry.
      time = fullScreen ? progress * 4.5 : time + settledClockOffset;
      meshTime = time;
      if (fullScreen || heroVisible) {
        eased.x = mix(eased.x, pointer.x, Math.min(1, dt * 5));
        eased.y = mix(eased.y, pointer.y, Math.min(1, dt * 5));
      }
      const yaw = mix(.42, .18, reveal) + eased.x * .12 + Math.sin(time * .18) * .055;
      const pitch = mix(-.65, -.16, reveal) + eased.y * .08;
      const roll = mix(-.22, -.58, reveal) + Math.sin(time * .13) * .035;
      const scale = mix(Math.min(width / 510, height / 580) * 1.15, Math.max(width / 780, height / 720), reveal);
      const cx = width * mix(.5, .9, reveal), cy = height * mix(.43, .46, reveal);
      const quiet = mix(1, .48, reveal);
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw), cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      const cosR = Math.cos(roll), sinR = Math.sin(roll);
      const columns = economy ? 13 : lightweight() ? 17 : 25, rows = economy ? 11 : lightweight() ? 13 : 19;
      const age = surfaceTime - pulse;
      function project(u, v, layer = 0, gather = 1, point = {}) {
        let x = u * 185, y = v * 195;
        let ripple = 0;
        if (age < 3) {
          const distance = Math.hypot(u - eased.x, v - eased.y);
          ripple = Math.sin(distance * 9 - age * 6) * Math.exp(-distance * 2.5 - age * 1.5) * 22;
        }
        let z = 78 * Math.sin(u * 2.5 + v * .7 + Math.sin(time * .24) * .25)
          + 38 * Math.sin(v * 2.2 + time * .2) + layer + ripple;
        const seed = Math.sin(u * 37 + v * 73);
        x += (1 - gather) * Math.sin(v * 9 + seed) * 110;
        y += (1 - gather) * Math.cos(u * 8 - seed) * 120;
        z += (1 - gather) * seed * 150;
        const rx = x * cosY + z * sinY, rz = z * cosY - x * sinY;
        const ry = y * cosP - rz * sinP, depth = y * sinP + rz * cosP;
        const perspective = 700 / (700 - depth);
        point.x = cx + (rx * cosR - ry * sinR) * scale * perspective;
        point.y = cy + (rx * sinR + ry * cosR) * scale * perspective;
        point.z = depth; point.p = perspective;
        return point;
      }
      function stroke(points, colour, alpha, lineWidth) {
        ctx.beginPath();
        points.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.strokeStyle = colour; ctx.globalAlpha = alpha; ctx.lineWidth = lineWidth; ctx.stroke();
      }
      // Grounded, quiet lighting rather than a neon or photographic backdrop.
      if (!ctx.gpu && reveal < 1 && assembled > 0) {
        const shadow = ctx.createRadialGradient(cx, height * .74, 0, cx, height * .74, width * .34);
        shadow.addColorStop(0, palette.grid); shadow.addColorStop(1, 'transparent');
        ctx.save(); ctx.translate(0, height * .74); ctx.scale(1, .18);
        ctx.fillStyle = shadow; ctx.globalAlpha = .26 * assembled * (1 - reveal);
        ctx.fillRect(0, -height * 4, width, height * 8); ctx.restore();
      }
      // Keep geometry buffers between frames instead of allocating hundreds of shapes.
      if (gridColumns !== columns) {
        gridColumns = columns;
        grids = [-24, 0].map(() => Array.from({ length: rows }, () =>
          Array.from({ length: columns }, () => ({}))));
        gridLines = grids.map(grid => Array.from({ length: columns }, (_, col) => grid.map(row => row[col])));
        nodes = grids[1].flat();
      }
      grids.forEach((grid, layer) => grid.forEach((row, r) => row.forEach((point, c) =>
        project(c / (columns - 1) * 2 - 1, r / (rows - 1) * 2 - 1, layer ? 0 : -24, assembled, point))));
      grids.forEach((grid, layer) => {
        if (layer) {
          // Three depth bands replace hundreds of individual fill operations.
          for (let band = 0; band < 3; band++) {
            ctx.beginPath();
            for (let row = 0; row < rows - 1; row++) for (let col = 0; col < columns - 1; col++) {
              const a = grid[row][col], b = grid[row][col + 1], c = grid[row + 1][col + 1], d = grid[row + 1][col];
              const depth = (a.z + b.z + c.z + d.z) / 4;
              if (Math.floor(clamp((depth + 260) / 520, 0, .999) * 3) !== band) continue;
              ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
              ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
            }
            ctx.fillStyle = palette.blue; ctx.globalAlpha = (.035 + band * .02) * assembled * quiet; ctx.fill();
          }
        }
        grid.forEach((line, row) => stroke(line, layer ? palette.blue : palette.ink,
          (layer ? .2 + row / rows * .24 : .1) * assembled * quiet, layer ? .75 : .5));
        for (let col = 0; col < columns; col += layer ? 1 : 3) {
          stroke(gridLines[layer][col], layer ? palette.blue : palette.ink, (layer ? .18 : .08) * assembled * quiet, .5);
        }
      });
      for (let highlight = 0; highlight < 2; highlight++) {
        ctx.beginPath();
        nodes.forEach((point, i) => {
          if (Number(i % 11 === 0) !== highlight) return;
          const radius = Math.max(.5, point.p * (highlight ? 1.6 : .65));
          ctx.moveTo(point.x + radius, point.y); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        });
        ctx.fillStyle = highlight ? palette.blue : palette.ink;
        ctx.globalAlpha = (highlight ? .6 : .38) * (.6 + .4 * assembled) * quiet; ctx.fill();
      }
      // A warm path follows the structure while the material breathes beneath it.
      route.forEach((point, i) => {
        const u = i / 79 * 2 - 1;
        project(u, .34 * Math.sin(u * 3 + time * .12), 3, 1, point);
        const along = i / 79;
        // The same gold curve unwinds into the line running behind the page artwork.
        point.x = mix(point.x, width * (.76 + .11 * Math.sin(along * 6 + time * .12)), reveal);
        point.y = mix(point.y, height * (-.12 + along * 1.37), reveal);
        point.p = mix(point.p, .7, reveal);
      });
      stroke(route, palette.gold, mix(.75, .32, reveal) * assembled, 1.35);
      for (let i = 0; i < 3; i++) {
        const at = ((time * .065 + i / 3) % 1) * 79, point = route[Math.floor(at)];
        ctx.beginPath(); ctx.arc(point.x, point.y, 2.8 * point.p, 0, Math.PI * 2);
        ctx.globalAlpha = .9 * assembled * quiet; ctx.fillStyle = palette.gold; ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Protect the reading column while keeping the larger mesh clear at the page edge.
      if (ctx.gpu) ctx.reveal = reveal;
      else if (reveal > 0) {
        if (maskWidth !== width || maskPixels !== canvas.width || maskReveal !== reveal) {
          maskWidth = width; maskPixels = canvas.width; maskReveal = reveal;
          mask = ctx.createLinearGradient(0, 0, width, 0);
          [[0, .04], [.4, .07], [.66, .3], [1, .85]].forEach(([at, alpha]) => {
            mask.addColorStop(at, `rgba(0,0,0,${mix(1, alpha, reveal)})`);
          });
        }
        ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = mask;
        ctx.fillRect(0, 0, width, height); ctx.globalCompositeOperation = 'source-over';
      }
      // Commit the canvas only after its complete first frame. The static
      // fallback is never cross-faded with a differently positioned surface.
      if (root.dataset.backgroundRenderer !== 'canvas') {
        root.dataset.backgroundRenderer = 'canvas';
        if (!fullScreen) clearTimeout(window.introFallback);
      }
      if (fullScreen && (performance.now() - drawStarted > 14 || dt > .029) && ++slowFrames >= 5) economy = true;
    }, () => root.dataset.backgroundRenderer !== 'fallback' && (fullScreen ||
      heroVisible && (surfaceTime - pulse < 3 || Math.hypot(pointer.x - eased.x, pointer.y - eased.y) > .002)),
    // Match the display's animation-frame cadence during the intro. A fractional
    // cap (e.g. 45 on 60 Hz) creates uneven frame intervals even on a fast device.
    () => economy ? .85 : lightweight() ? 1 : 1.5, () => fullScreen ? Infinity : 20,
    () => renderer.gpu ? fullScreen ? 1600000 : 1000000 : 700000, renderer);
  })();

  // Recent notes and topic trails share the same blog explorer.
  (function atlas() {
    const buttons = $$('[data-topic]'), panels = $$('.atlas-panel');
    if (!buttons.length) return;
    const intros = new Map($$('.atlas-intro').map(intro => [intro, intro.textContent.trim()]));
    let visible = false;
    function fitIntros() {
      if (!visible) return;
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
    let library;
    $('[data-atlas-surprise]')?.addEventListener('click', async event => {
      const trigger = event.currentTarget;
      trigger.disabled = true;
      try {
      if (!library) {
        const response = await fetch($('[data-post-library]').dataset.postLibrary);
        if (!response.ok) throw new Error('library');
        library = await response.json();
      }
      const pool = library.filter(post => post.file !== lastPick);
      if (!pool.length) return;
      const post = pool[Math.floor(Math.random() * pool.length)], panel = $('#atlas-' + post.trail);
      let pick = $$('.atlas-story', panel).find(story => story.dataset.post === post.file);
      if (!pick) {
        pick = document.createElement('a'); pick.className = 'atlas-story'; pick.href = post.file; pick.dataset.post = post.file; pick.dataset.preview = 'false';
        const art = document.createElement('img'); art.src = post.cover; art.alt = ''; art.width = 1200; art.height = 675;
        const copy = document.createElement('span'); copy.className = 'atlas-story-copy';
        for (const [tag, text, className] of [['small', post.display + ' · ' + post.category, ''], ['strong', post.title, ''], ['span', post.summary, 'atlas-intro'], ['em', 'Read the notes ↗', '']]) {
          const element = document.createElement(tag); element.textContent = text; element.className = className; copy.appendChild(element);
          if (className) intros.set(element, text);
        }
        pick.append(art, copy); panel.appendChild(pick);
      }
      const button = buttons.find(b => b.getAttribute('aria-controls') === panel.id);
      select(button);
      lastPick = pick.dataset.post;
      panel.dataset.featured = 'true';
      $$('.atlas-story', panel).forEach(story => { story.hidden = story !== pick; });
      $('#atlas-trail').textContent = $('span', button).textContent + ' / ' + $('strong', button).textContent + ' / A lucky find: ' + $('strong', pick).textContent;
      fitIntros();
      } catch (_) { $('#atlas-trail').textContent = 'Could not load a random note. Try a topic or browse the archive.'; }
      finally { trigger.disabled = false; }
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) fitIntros();
    }, { rootMargin: '150px' }).observe($('#atlas-work'));
    else { visible = true; requestAnimationFrame(fitIntros); }
    document.fonts?.ready.then(fitIntros);
    window.addEventListener('resize', fitIntros, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(fitIntros).observe($('#atlas-work'));
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
    let target = targets(active), points = target.map(p => [...p]);
    function change(id) { if (!descriptions[id]) return; active = id; target = targets(active); $('#career-scene-title').textContent = descriptions[id][0]; $('#career-scene-note').textContent = descriptions[id][1]; $('#career-canvas').setAttribute('aria-label', descriptions[id].join('. ')); wake(); }
    document.addEventListener('careerchange', e => change(e.detail));
    scene($('#career-canvas'), (ctx, w, h, t, dt) => {
      fit(ctx, w, h, 240, 240);
      const easing = paused ? 1 : 1 - Math.exp(-dt * 6);
      points.forEach((p, i) => { p[0] = mix(p[0], target[i][0], easing); p[1] = mix(p[1], target[i][1], easing); });
      points.forEach((a, i) => { for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        if ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 < 44 ** 2) line(ctx, a, b, palette.grid, 1.5);
      } });
      points.forEach((p, i) => dot(ctx, p[0], p[1], 4.5 + (paused ? 0 : Math.sin(t + i) * .5), i % 5 ? palette.blue : palette.gold));
    });
    change(active);
  })();

  root.classList.add('experiences-ready');
  applyPause();
  wake();
})();
