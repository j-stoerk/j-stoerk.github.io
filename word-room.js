/* Native text wraps around a movable exclusion circle. Drawing idles at rest. */
(function () {
  'use strict';
  var room = document.querySelector('[data-word-room]');
  if (!room) return;
  var world = room.querySelector('[data-word-world]'), canvas = world.querySelector('canvas');
  var ctx = canvas.getContext('2d'), reset = document.querySelector('[data-world-reset]');
  if (!ctx) return;
  var x, y, radius, width, dragging, last, rotation = -.35, scheduled = false;
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function layout(home) {
    width = room.clientWidth; radius = width < 600 ? 64 : 104;
    if (home || x === undefined) { x = width - radius - 12; y = width < 600 ? 80 : 140; }
    x = clamp(x, Math.max(radius, width * .46), width - radius);
    y = clamp(y, radius, 340 - radius);
    room.style.setProperty('--world-radius', radius + 'px');
    room.style.setProperty('--world-space', (width - x + radius) + 'px');
    room.style.setProperty('--world-top', (y - radius) + 'px');
    canvas.style.width = canvas.style.height = (2 * radius) + 'px';
    draw();
  }
  function draw() {
    var size = radius * 2, dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.height = Math.round(size * dpr); ctx.scale(dpr, dpr);
    var ink = getComputedStyle(room).getPropertyValue('--color-primary').trim(), r = radius - 10;
    ctx.clearRect(0, 0, size, size); ctx.translate(radius, radius);
    function project(lat, lon) { var a = lon + rotation, c = Math.cos(lat); return [r * c * Math.sin(a), r * Math.sin(lat), c * Math.cos(a)]; }
    function trace(points) {
      ctx.beginPath(); var active = false;
      points.forEach(function (p) {
        if (p[2] < 0) { active = false; return; }
        if (active) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
        active = true;
      }); ctx.stroke();
    }
    ctx.lineWidth = .7; ctx.strokeStyle = ink; ctx.globalAlpha = .35;
    for (var lat = -1.2; lat <= 1.21; lat += .3) {
      var pts = []; for (var lon = -Math.PI; lon <= Math.PI + .03; lon += .035) pts.push(project(lat, lon)); trace(pts);
    }
    for (var meridian = -Math.PI; meridian < Math.PI; meridian += Math.PI / 9) {
      var line = []; for (var t = -Math.PI / 2; t <= Math.PI / 2 + .03; t += .035) line.push(project(t, meridian)); trace(line);
    }
    ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    for (var i = 0; i < 44; i++) {
      var p = project(Math.asin(1 - 2 * (i + .5) / 44), i * 2.39996);
      if (p[2] < 0) continue;
      ctx.globalAlpha = .3 + .6 * p[2]; ctx.fillStyle = i % 5 ? ink : '#b88942';
      ctx.beginPath(); ctx.arc(p[0], p[1], i % 5 ? 1.3 : 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(function () { scheduled = false; layout(false); }); }
  canvas.addEventListener('pointerdown', function (event) {
    if (event.button) return;
    dragging = event.pointerId; last = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId); canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', function (event) {
    if (dragging !== event.pointerId) return;
    var dx = event.clientX - last[0], dy = event.clientY - last[1];
    x += dx; y += dy; rotation += dx * .008; last = [event.clientX, event.clientY]; schedule();
  });
  function release() { dragging = undefined; canvas.classList.remove('is-dragging'); }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release); canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('keydown', function (event) {
    var deltas = { ArrowLeft: [-16,0], ArrowRight: [16,0], ArrowUp: [0,-16], ArrowDown: [0,16] }, d = deltas[event.key];
    if (!d) return; event.preventDefault(); x += d[0]; y += d[1]; rotation += d[0] * .008; schedule();
  });
  reset.hidden = false; reset.addEventListener('click', function () { layout(true); });
  new ResizeObserver(function () { schedule(); }).observe(room);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  layout(true);
})();
