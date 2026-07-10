/* Pointer-reactive electrode microstructure.
   Graphite-like platelets locally align and compact around the pointer,
   revealing a few conductive bridges. No spotlight or cursor glow. */
(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.className = 'microstructure-field';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var pointer = { x: -1000, y: -1000, active: false };
  var flakes = [];
  var rows = [];
  var width = 0;
  var height = 0;
  var dpr = 1;
  var raf = 0;
  var lastFrame = 0;
  var palette = null;
  var seed = 41027;

  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function readPalette() {
    var styles = getComputedStyle(document.documentElement);
    return {
      flake: styles.getPropertyValue('--field-particle').trim(),
      accent: styles.getPropertyValue('--field-accent').trim(),
      bridge: styles.getPropertyValue('--field-path').trim(),
      detail: styles.getPropertyValue('--field-detail').trim()
    };
  }

  function smoothstep(value) {
    value = Math.max(0, Math.min(1, value));
    return value * value * (3 - 2 * value);
  }

  function buildField() {
    flakes = [];
    rows = [];
    seed = 41027;

    var spacingX = width < 620 ? 112 : 132;
    var spacingY = width < 620 ? 98 : 112;
    var columns = Math.ceil(width / spacingX) + 2;
    var rowCount = Math.ceil(height / spacingY) + 2;

    for (var row = -1; row < rowCount; row += 1) {
      var rowFlakes = [];
      for (var column = -1; column < columns; column += 1) {
        var offset = row % 2 === 0 ? spacingX * 0.48 : 0;
        var x = column * spacingX + offset + (random() - 0.5) * 20;
        var y = row * spacingY + (random() - 0.5) * 12;
        var angle = (random() - 0.5) * 0.24;
        var flake = {
          x: x,
          y: y,
          baseX: x,
          baseY: y,
          angle: angle,
          baseAngle: angle,
          length: 48 + random() * 37,
          thickness: 5.2 + random() * 2.6,
          phase: random() * Math.PI * 2,
          accent: random() > 0.94,
          influence: 0
        };
        flakes.push(flake);
        rowFlakes.push(flake);
      }
      rows.push(rowFlakes);
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    palette = readPalette();
    buildField();
    draw(0, true);
  }

  function updateFlakes(time, still) {
    var ambient = time * 0.00018;
    var radius = 230;

    for (var i = 0; i < flakes.length; i += 1) {
      var flake = flakes[i];
      var dx = pointer.x - flake.baseX;
      var dy = pointer.y - flake.baseY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var influence = pointer.active ? smoothstep(1 - distance / radius) : 0;
      flake.influence += (influence - flake.influence) * (still ? 1 : 0.11);

      var idleAngle = flake.baseAngle + Math.sin(ambient + flake.phase) * 0.018;
      var targetAngle = idleAngle * (1 - flake.influence);
      flake.angle += (targetAngle - flake.angle) * (still ? 1 : 0.1);

      var layerPull = pointer.active ? (pointer.y - flake.baseY) * flake.influence * 0.055 : 0;
      var targetX = flake.baseX;
      var targetY = flake.baseY + layerPull;
      flake.x += (targetX - flake.x) * (still ? 1 : 0.09);
      flake.y += (targetY - flake.y) * (still ? 1 : 0.09);
    }
  }

  function drawBridges() {
    ctx.lineCap = 'round';
    for (var r = 0; r < rows.length; r += 1) {
      var row = rows[r];
      for (var i = 0; i < row.length - 1; i += 1) {
        var a = row[i];
        var b = row[i + 1];
        var strength = Math.min(a.influence, b.influence);
        if (strength < 0.2) continue;

        var gap = b.x - a.x;
        if (gap > 150 || gap < 35) continue;

        ctx.beginPath();
        ctx.moveTo(a.x + Math.cos(a.angle) * a.length * 0.5, a.y + Math.sin(a.angle) * a.length * 0.5);
        ctx.bezierCurveTo(
          a.x + gap * 0.42, a.y,
          b.x - gap * 0.42, b.y,
          b.x - Math.cos(b.angle) * b.length * 0.5, b.y - Math.sin(b.angle) * b.length * 0.5
        );
        ctx.strokeStyle = palette.bridge;
        ctx.globalAlpha = Math.min(0.72, strength);
        ctx.lineWidth = 1 + strength;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFlake(flake) {
    var length = flake.length * (1 + flake.influence * 0.18);
    var thickness = flake.thickness * (1 - flake.influence * 0.22);
    var half = length / 2;
    var cos = Math.cos(flake.angle);
    var sin = Math.sin(flake.angle);

    ctx.save();
    ctx.translate(flake.x, flake.y);
    ctx.rotate(flake.angle);

    ctx.beginPath();
    ctx.roundRect(-half, -thickness / 2, length, thickness, thickness / 2);
    ctx.fillStyle = flake.accent || flake.influence > 0.55 ? palette.accent : palette.flake;
    ctx.fill();

    if (length > 40) {
      ctx.beginPath();
      ctx.moveTo(-half * 0.64, 0);
      ctx.lineTo(half * 0.64, 0);
      ctx.strokeStyle = palette.detail;
      ctx.globalAlpha = 0.42 + flake.influence * 0.18;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    /* A faint offset lamella makes larger flakes read as layered graphite. */
    if (flake.accent && length > 43) {
      var normalX = -sin * (thickness + 3.5);
      var normalY = cos * (thickness + 3.5);
      ctx.beginPath();
      ctx.moveTo(flake.x - cos * half * 0.72 + normalX, flake.y - sin * half * 0.72 + normalY);
      ctx.lineTo(flake.x + cos * half * 0.72 + normalX, flake.y + sin * half * 0.72 + normalY);
      ctx.strokeStyle = palette.detail;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  function draw(time, still) {
    if (!palette) palette = readPalette();
    ctx.clearRect(0, 0, width, height);
    updateFlakes(time, still);
    drawBridges();
    for (var i = 0; i < flakes.length; i += 1) drawFlake(flakes[i]);
  }

  function frame(time) {
    if (document.hidden || reduceMotion.matches) {
      raf = 0;
      return;
    }
    if (!lastFrame || time - lastFrame >= 22) {
      draw(time, false);
      lastFrame = time;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf && !reduceMotion.matches) raf = requestAnimationFrame(frame);
  }

  if (finePointer) {
    window.addEventListener('pointermove', function (event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      start();
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', function () {
      pointer.active = false;
    });
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', start);

  new MutationObserver(function () {
    palette = readPalette();
    draw(0, reduceMotion.matches);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () {
      if (reduceMotion.matches && raf) cancelAnimationFrame(raf);
      raf = 0;
      draw(0, true);
      start();
    });
  }

  resize();
  start();
})();
