/* One selectable copy of the prose, wrapped on both sides of a movable globe.
   Word widths are cached; layout and drawing run only on input or resize. */
(function () {
  'use strict';
  var room = document.querySelector('[data-word-room]');
  if (!room) return;
  var world = room.querySelector('[data-word-world]'), canvas = world.querySelector('canvas');
  var ctx = canvas.getContext('2d'), measure = document.createElement('canvas').getContext('2d');
  if (!ctx) return;
  var paragraphs = Array.from(room.querySelectorAll('p')).map(function (element) {
    return { element: element, words: element.textContent.trim().split(/\s+/) };
  });
  var x, y, radius, width, height, lineHeight, space, dragging, last, fontKey;
  var rotation = -.35, scheduled = false;
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function flow(avoid) {
    var top = 0, layouts = [], padding = radius + 16;
    paragraphs.forEach(function (paragraph) {
      var first = top, index = 0, parts = [];
      while (index < paragraph.words.length) {
        var intervals = [[0, width]];
        if (avoid) {
          var distance = y < top ? top - y : (y > top + lineHeight ? y - top - lineHeight : 0);
          var extent = distance < padding ? Math.sqrt(padding * padding - distance * distance) : 0;
          if (top < y + radius + 26 && top + lineHeight > y + radius - 2) extent = Math.max(extent, 68);
          if (extent > 0) {
            intervals = [[0, Math.max(0, x - extent)], [Math.min(width, x + extent), width]];
          }
        }
        intervals.forEach(function (interval) {
          var begin = index, used = 0, available = interval[1] - interval[0];
          while (index < paragraph.words.length) {
            var next = paragraph.widths[index] + (index > begin ? space : 0);
            if (used + next > available && !(begin === index && available >= width - 1)) break;
            used += next; index++;
          }
          if (index > begin) parts.push({ left: interval[0], top: top - first, text: paragraph.words.slice(begin, index).join(' ') + (index < paragraph.words.length ? ' ' : '') });
        });
        top += lineHeight;
      }
      layouts.push({ height: top - first, parts: parts });
      top += 22;
    });
    return { height: top - 22, paragraphs: layouts };
  }
  function layout(home) {
    var nextWidth = room.clientWidth, style = getComputedStyle(paragraphs[0].element);
    var key = [nextWidth, style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight].join('|');
    width = nextWidth; radius = width < 600 ? 64 : 104;
    if (fontKey !== key) {
      fontKey = key; lineHeight = parseFloat(style.lineHeight);
      measure.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
      space = measure.measureText(' ').width;
      paragraphs.forEach(function (paragraph) { paragraph.widths = paragraph.words.map(function (word) { return measure.measureText(word).width; }); });
      height = flow(false).height + Math.ceil((Math.PI * Math.pow(radius + 16, 2) + 120 * 28) / width / lineHeight) * lineHeight + lineHeight * 2;
    }
    if (home || x === undefined) { x = width - radius - 12; y = radius + 24; }
    x = clamp(x, radius, width - radius);
    y = clamp(y, radius, height - radius - 30);
    var result = flow(true);
    result.paragraphs.forEach(function (paragraph, index) {
      var fragment = document.createDocumentFragment();
      paragraph.parts.forEach(function (part) {
        var span = document.createElement('span'); span.className = 'word-line'; span.textContent = part.text;
        span.style.left = part.left + 'px'; span.style.top = part.top + 'px'; fragment.appendChild(span);
      });
      paragraphs[index].element.replaceChildren(fragment);
      paragraphs[index].element.style.height = paragraph.height + 'px';
    });
    room.dataset.ready = '';
    room.style.minHeight = Math.max(height, result.height) + 'px';
    room.style.setProperty('--world-radius', radius + 'px');
    world.style.transform = 'translate(' + (x - radius) + 'px,' + (y - radius) + 'px)';
    canvas.style.width = canvas.style.height = (2 * radius) + 'px';
    draw();
  }
  function draw() {
    var size = radius * 2, dpr = Math.min(devicePixelRatio || 1, 2);
    var pixels = Math.round(size * dpr);
    if (canvas.width !== pixels || canvas.height !== pixels) canvas.width = canvas.height = pixels;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  new ResizeObserver(function (entries) { if (Math.abs(entries[0].contentRect.width - width) > .5) schedule(); }).observe(room);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  layout(true);
  if (document.fonts) document.fonts.ready.then(function () { fontKey = null; schedule(); });
})();
