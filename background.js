/* Interactive electrochemical-cell background.
   Left/right pointer position controls migration direction and magnitude.
   Vertical position selects the most active flux channel. Near the centre,
   diffusion dominates. This is illustrative, not a transport simulation. */
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
  var pointer = { x: 0, y: 0, active: false };
  var ions = [];
  var width = 0;
  var height = 0;
  var dpr = 1;
  var leftEdge = 0;
  var rightEdge = 0;
  var electrodeWidth = 0;
  var raf = 0;
  var lastFrame = 0;
  var lastTime = 0;
  var palette = null;
  var seed = 73291;

  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(value) {
    value = clamp(value, 0, 1);
    return value * value * (3 - 2 * value);
  }

  function readPalette() {
    var styles = getComputedStyle(document.documentElement);
    return {
      anode: styles.getPropertyValue('--cell-anode').trim(),
      cathode: styles.getPropertyValue('--cell-cathode').trim(),
      separator: styles.getPropertyValue('--cell-separator').trim(),
      ion: styles.getPropertyValue('--cell-ion').trim(),
      flux: styles.getPropertyValue('--cell-flux').trim(),
      label: styles.getPropertyValue('--cell-label').trim(),
      surface: styles.getPropertyValue('--color-bg').trim()
    };
  }

  function buildIons() {
    ions = [];
    seed = 73291;
    var count = width < 620 ? 7 : clamp(Math.round(width * height / 76000), 14, 24);
    for (var i = 0; i < count; i += 1) {
      ions.push({
        u: (i + random() * 0.8) / count,
        y: 52 + random() * Math.max(1, height - 104),
        baseY: 52 + random() * Math.max(1, height - 104),
        radius: 5.5 + random() * 2,
        speed: 0.72 + random() * 0.62,
        phase: random() * Math.PI * 2,
        phase2: random() * Math.PI * 2,
        lane: random()
      });
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

    /* Keep both electrodes outside the 940px reading column where possible. */
    var sideSpace = Math.max(0, (width - 940) / 2);
    electrodeWidth = width < 620 ? 15 : clamp(sideSpace * 0.5, 34, 118);
    leftEdge = electrodeWidth + (width < 620 ? 12 : 34);
    rightEdge = width - leftEdge;
    pointer.x = pointer.active ? pointer.x : width / 2;
    pointer.y = pointer.active ? pointer.y : height / 2;
    palette = readPalette();
    buildIons();
    draw(0, true);
  }

  function state() {
    if (!pointer.active) return { bias: 0, strength: 0, channelY: height / 2 };
    var bias = clamp((pointer.x / width - 0.5) * 2, -1, 1);
    return {
      bias: bias,
      strength: smoothstep(Math.abs(bias)),
      channelY: pointer.y
    };
  }

  function drawElectrodes() {
    var layerGap = width < 620 ? 18 : 22;
    var y;

    /* Graphitic anode: stacked, slightly offset layers. */
    ctx.strokeStyle = palette.anode;
    ctx.lineWidth = width < 620 ? 2.2 : 3;
    ctx.lineCap = 'round';
    for (y = -8; y < height + layerGap; y += layerGap) {
      var inset = (Math.floor(y / layerGap) % 2) * 8;
      ctx.beginPath();
      ctx.moveTo(0, y + 5);
      ctx.lineTo(Math.max(8, electrodeWidth - inset), y - 4);
      ctx.stroke();
    }

    /* Layered-oxide cathode: interlocking chevrons rather than particles. */
    ctx.strokeStyle = palette.cathode;
    for (y = -10; y < height + layerGap; y += layerGap) {
      var outer = width - electrodeWidth;
      ctx.beginPath();
      ctx.moveTo(width, y - 3);
      ctx.lineTo(outer + 12, y + 5);
      ctx.lineTo(width, y + 11);
      ctx.stroke();
    }

    if (width >= 760) {
      ctx.save();
      ctx.fillStyle = palette.label;
      ctx.font = '600 9px system-ui, sans-serif';
      ctx.letterSpacing = '1.5px';
      ctx.textAlign = 'center';
      ctx.translate(Math.max(14, electrodeWidth * 0.38), height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('ANODE', 0, 0);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = palette.label;
      ctx.font = '600 9px system-ui, sans-serif';
      ctx.letterSpacing = '1.5px';
      ctx.textAlign = 'center';
      ctx.translate(width - Math.max(14, electrodeWidth * 0.38), height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText('CATHODE', 0, 0);
      ctx.restore();
    }
  }

  function drawSeparator() {
    var centre = width / 2;
    ctx.save();
    ctx.strokeStyle = palette.separator;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 9]);
    ctx.beginPath();
    ctx.moveTo(centre - 7, 0);
    ctx.lineTo(centre - 7, height);
    ctx.moveTo(centre + 7, 0);
    ctx.lineTo(centre + 7, height);
    ctx.stroke();
    ctx.restore();
  }

  function drawFieldLines(cellState, time) {
    if (cellState.strength < 0.035) return;
    var direction = cellState.bias > 0 ? 1 : -1;
    var lineCount = width < 620 ? 2 : 4;
    var span = rightEdge - leftEdge;

    ctx.save();
    ctx.strokeStyle = palette.flux;
    ctx.fillStyle = palette.flux;
    ctx.lineWidth = 1 + cellState.strength * 0.55;
    ctx.globalAlpha = 0.22 + cellState.strength * 0.3;

    for (var i = 0; i < lineCount; i += 1) {
      var baseY = height * ((i + 1) / (lineCount + 1));
      var channelPull = (cellState.channelY - baseY) * 0.2 * cellState.strength;
      var wave = Math.sin(time * 0.00045 + i * 1.7) * 5;
      var y = baseY + channelPull + wave;
      var startX = direction > 0 ? leftEdge : rightEdge;
      var endX = direction > 0 ? rightEdge : leftEdge;

      ctx.beginPath();
      ctx.moveTo(startX, baseY);
      ctx.bezierCurveTo(
        startX + span * 0.34 * direction, y,
        startX + span * 0.66 * direction, y,
        endX, baseY + channelPull * 0.24
      );
      ctx.stroke();

      var arrowX = startX + span * 0.62 * direction;
      var arrowY = y;
      ctx.beginPath();
      ctx.moveTo(arrowX + 5 * direction, arrowY);
      ctx.lineTo(arrowX - 3 * direction, arrowY - 3.5);
      ctx.lineTo(arrowX - 3 * direction, arrowY + 3.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function updateIons(cellState, time, delta, still) {
    var span = rightEdge - leftEdge;
    var directed = cellState.bias * (0.00055 + cellState.strength * 0.002);
    var diffusion = 1 - cellState.strength * 0.72;

    for (var i = 0; i < ions.length; i += 1) {
      var ion = ions[i];
      var channelDistance = Math.abs(ion.y - cellState.channelY);
      var channel = pointer.active ? smoothstep(1 - channelDistance / Math.max(160, height * 0.32)) : 0.35;
      var drift = directed * ion.speed * (0.3 + channel * 0.9);

      if (!still) ion.u += drift * delta;
      if (ion.u > 1.03) {
        ion.u = -0.03;
        ion.baseY = 45 + random() * Math.max(1, height - 90);
      } else if (ion.u < -0.03) {
        ion.u = 1.03;
        ion.baseY = 45 + random() * Math.max(1, height - 90);
      }

      var brownianY = Math.sin(time * 0.00065 * ion.speed + ion.phase) * (8 + diffusion * 13);
      brownianY += Math.sin(time * 0.0011 + ion.phase2) * 4 * diffusion;
      var channelPull = pointer.active ? (cellState.channelY - ion.baseY) * channel * cellState.strength * 0.035 : 0;
      ion.y += (ion.baseY + brownianY + channelPull - ion.y) * (still ? 1 : 0.075);
      ion.x = leftEdge + ion.u * span + Math.sin(time * 0.0005 + ion.phase2) * 5 * diffusion;
      ion.channel = channel;
    }
  }

  function drawIon(ion, cellState) {
    var radius = ion.radius;
    var direction = cellState.bias >= 0 ? 1 : -1;
    var trail = cellState.strength * ion.channel * 14;

    if (trail > 1) {
      ctx.beginPath();
      ctx.moveTo(ion.x - trail * direction, ion.y);
      ctx.lineTo(ion.x - radius * 1.25 * direction, ion.y);
      ctx.strokeStyle = palette.flux;
      ctx.globalAlpha = 0.18 + cellState.strength * 0.22;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(ion.x, ion.y);
    ctx.beginPath();
    for (var side = 0; side < 6; side += 1) {
      var angle = Math.PI / 3 * side - Math.PI / 6;
      var x = Math.cos(angle) * radius;
      var y = Math.sin(angle) * radius;
      if (side === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.strokeStyle = palette.ion;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.strokeStyle = palette.ion;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2.3, 0);
    ctx.lineTo(2.3, 0);
    ctx.moveTo(0, -2.3);
    ctx.lineTo(0, 2.3);
    ctx.stroke();
    ctx.restore();
  }

  function draw(time, still) {
    if (!palette) palette = readPalette();
    var cellState = state();
    var delta = lastTime ? Math.min(2, (time - lastTime) / 16.67) : 1;
    lastTime = time;

    ctx.clearRect(0, 0, width, height);
    drawElectrodes();
    drawSeparator();
    drawFieldLines(cellState, time);
    updateIons(cellState, time, delta, still);
    for (var i = 0; i < ions.length; i += 1) drawIon(ions[i], cellState);
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
