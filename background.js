/* Pointer-reactive electrode microstructure.
   Decorative canvas only: platelets reorient and conductive paths emerge
   around the pointer. Reduced-motion visitors receive one static frame. */
(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.className = 'microstructure-field';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var particles = [];
  var pointer = { x: -1000, y: -1000, active: false };
  var raf = 0;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var last = 0;
  var seed = 92821;
  var palette = null;

  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function shortestTurn(from, to) {
    var delta = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
    return from + delta;
  }

  function buildParticles() {
    particles = [];
    seed = 92821;
    var area = width * height;
    var count = Math.max(30, Math.min(76, Math.round(area / 23000)));
    var cols = Math.max(5, Math.round(Math.sqrt(count * width / height)));
    var rows = Math.ceil(count / cols);

    for (var i = 0; i < count; i += 1) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var x = ((col + 0.5 + (random() - 0.5) * 0.72) / cols) * width;
      var y = ((row + 0.5 + (random() - 0.5) * 0.72) / rows) * height;
      var angle = (random() - 0.5) * 1.45;
      particles.push({
        x: x,
        y: y,
        baseX: x,
        baseY: y,
        angle: angle,
        baseAngle: angle,
        length: 17 + random() * 27,
        width: 2.1 + random() * 2.6,
        phase: random() * Math.PI * 2,
        accent: random() > 0.82
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
    buildParticles();
    palette = colors();
    draw(0, true);
  }

  function colors() {
    var styles = getComputedStyle(document.documentElement);
    return {
      particle: styles.getPropertyValue('--field-particle').trim() || 'rgba(40, 86, 112, .22)',
      accent: styles.getPropertyValue('--field-accent').trim() || 'rgba(18, 86, 184, .3)',
      path: styles.getPropertyValue('--field-path').trim() || 'rgba(18, 86, 184, .12)',
      glow: styles.getPropertyValue('--field-glow').trim() || 'rgba(57, 132, 180, .08)'
    };
  }

  function draw(time, still) {
    if (!palette) palette = colors();
    var t = time * 0.00022;
    ctx.clearRect(0, 0, width, height);

    if (pointer.active) {
      var gradient = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 245);
      gradient.addColorStop(0, palette.glow);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(pointer.x - 245, pointer.y - 245, 490, 490);
    }

    for (var i = 0; i < particles.length; i += 1) {
      var p = particles[i];
      var dx = pointer.x - p.baseX;
      var dy = pointer.y - p.baseY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var influence = pointer.active ? Math.max(0, 1 - distance / 245) : 0;
      influence *= influence;

      var idleAngle = p.baseAngle + Math.sin(t + p.phase) * 0.07;
      var target = influence > 0 ? Math.atan2(dy, dx) : idleAngle;
      target = shortestTurn(p.angle, target);
      p.angle += (target - p.angle) * (still ? 1 : 0.075);

      var pressure = influence * 10;
      p.x += (p.baseX - Math.cos(p.angle) * pressure - p.x) * (still ? 1 : 0.08);
      p.y += (p.baseY - Math.sin(p.angle) * pressure - p.y) * (still ? 1 : 0.08);

      if (influence > 0.12) {
        var nearest = null;
        var nearestDistance = 118;
        for (var j = i + 1; j < particles.length; j += 1) {
          var q = particles[j];
          var qdx = q.x - p.x;
          var qdy = q.y - p.y;
          var separation = Math.sqrt(qdx * qdx + qdy * qdy);
          if (separation < nearestDistance) {
            nearestDistance = separation;
            nearest = q;
          }
        }
        if (nearest) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(nearest.x, nearest.y);
          ctx.strokeStyle = palette.path;
          ctx.lineWidth = 0.7 + influence * 0.8;
          ctx.stroke();
        }
      }
    }

    for (var k = 0; k < particles.length; k += 1) {
      var particle = particles[k];
      var pdx = pointer.x - particle.x;
      var pdy = pointer.y - particle.y;
      var pdistance = Math.sqrt(pdx * pdx + pdy * pdy);
      var active = pointer.active ? Math.max(0, 1 - pdistance / 245) : 0;
      var half = particle.length * (0.5 + active * 0.12);

      ctx.beginPath();
      ctx.moveTo(particle.x - Math.cos(particle.angle) * half, particle.y - Math.sin(particle.angle) * half);
      ctx.lineTo(particle.x + Math.cos(particle.angle) * half, particle.y + Math.sin(particle.angle) * half);
      ctx.strokeStyle = particle.accent || active > 0.45 ? palette.accent : palette.particle;
      ctx.lineWidth = particle.width + active * 1.2;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (particle.accent && particle.length > 30) {
        var nx = -Math.sin(particle.angle) * 3.5;
        var ny = Math.cos(particle.angle) * 3.5;
        ctx.beginPath();
        ctx.moveTo(particle.x - Math.cos(particle.angle) * half * 0.7 + nx, particle.y - Math.sin(particle.angle) * half * 0.7 + ny);
        ctx.lineTo(particle.x + Math.cos(particle.angle) * half * 0.7 + nx, particle.y + Math.sin(particle.angle) * half * 0.7 + ny);
        ctx.strokeStyle = palette.particle;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }

  function frame(time) {
    if (document.hidden || motionQuery.matches) {
      raf = 0;
      return;
    }
    if (!last || time - last > 20) {
      draw(time, false);
      last = time;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf && !motionQuery.matches) raf = requestAnimationFrame(frame);
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

  document.addEventListener('visibilitychange', start);
  window.addEventListener('resize', resize, { passive: true });
  new MutationObserver(function () {
    palette = colors();
    if (motionQuery.matches) draw(0, true);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  motionQuery.addEventListener && motionQuery.addEventListener('change', function () {
    if (motionQuery.matches && raf) cancelAnimationFrame(raf);
    raf = 0;
    draw(0, true);
    start();
  });

  resize();
  start();
})();
