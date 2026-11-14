/* One selectable copy of the prose, wrapped on both sides of a movable globe.
   Word widths are cached; layout and drawing run only on input or resize. */
(function () {
  'use strict';
  var room = document.querySelector('[data-word-room]');
  if (!room) return;
  var world = room.querySelector('[data-word-world]'), canvas = world.querySelector('canvas');
  var measure = document.createElement('canvas').getContext('2d');
  if (!canvas.getContext('2d') || !window.PortfolioOrbit) return;
  var paragraphs = Array.from(room.querySelectorAll('p')).map(function (element) {
    return { element: element, words: element.textContent.trim().split(/\s+/) };
  });
  var x, y, radius, width, height, lineHeight, space, dragging, last, fontKey;
  var sky = document.createElement('canvas'); sky.className = 'word-sky'; sky.setAttribute('aria-hidden', 'true'); room.prepend(sky);
  var scene = new window.PortfolioOrbit(canvas, sky);
  var rotation = -.15, phase = 0, travel = 0, reveal = 0, holes = [], solar, scheduled = false;
  var visibility=1,restTimer=0,fadeTimer=0,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function state() { return { x:x, y:y, radius:radius, width:width, height:height, skyWidth:Math.max(width,window.innerWidth), rotation:rotation, phase:phase, travel:travel, reveal:reveal, visibility:visibility }; }
  function stopFade(){clearTimeout(restTimer);clearTimeout(fadeTimer);}
  function wake(){
    stopFade();visibility=1;
    sky.style.transition='none';sky.style.opacity='1';
    var progress=clamp(travel/150,0,1);reveal=progress*progress*(3-2*progress);schedule();
  }
  function sleep(){stopFade();visibility=0;reveal=0;sky.style.transition='none';sky.style.opacity='0';schedule();}
  function rest(){
    stopFade();
    restTimer=setTimeout(function(){
      if(reduced.matches){sleep();return;}
      // Fade the existing canvas as one composited layer, without repainting it.
      sky.style.transition='opacity 1s ease';sky.style.opacity='0';
      fadeTimer=setTimeout(sleep,1000);
    },450);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function flow(avoid) {
    var top = 0, layouts = [];
    paragraphs.forEach(function (paragraph) {
      var first = top, index = 0, parts = [];
      while (index < paragraph.words.length) {
        var intervals = [[0, width]];
        if (avoid) {
          var exclusions = [{ x:x, y:y, r:radius, pad:16, caption:68 }];
          if (solar && solar.sun.r > 1) exclusions.push({ x:solar.sun.x, y:solar.sun.y, r:solar.sun.r, pad:12, caption:26 });
          if (solar && solar.earthMoon.r > 1) exclusions.push({ x:solar.earthMoon.x, y:solar.earthMoon.y, r:solar.earthMoon.r, pad:10, caption:0 });
          exclusions.forEach(function (circle) {
            var limit=circle.r+circle.pad;
            var distance=circle.y<top?top-circle.y:(circle.y>top+lineHeight?circle.y-top-lineHeight:0);
            var extent=distance<limit?Math.sqrt(limit*limit-distance*distance):0;
            if(top<circle.y+circle.r+26&&top+lineHeight>circle.y+circle.r-2)extent=Math.max(extent,circle.caption);
            if(!extent)return;
            var next=[];
            intervals.forEach(function(interval){
              var left=circle.x-extent,right=circle.x+extent;
              if(right<=interval[0]||left>=interval[1])next.push(interval);
              else { if(left>interval[0])next.push([interval[0],left]); if(right<interval[1])next.push([right,interval[1]]); }
            });intervals=next;
          });
        }
        intervals.forEach(function (interval) {
          var begin = index, used = 0, available = interval[1] - interval[0];
          while (index < paragraph.words.length) {
            var next = paragraph.widths[index] + (index > begin ? space : 0);
            if (used + next > available && !(begin === index && available >= width - 1)) break;
            used += next; index++;
          }
          if (index > begin) parts.push({ left: interval[0], top: top - first, width:used, text: paragraph.words.slice(begin, index).join(' ') + (index < paragraph.words.length ? ' ' : '') });
        });
        top += lineHeight;
      }
      layouts.push({ top:first, height: top - first, parts: parts });
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
      height = flow(false).height + Math.ceil((Math.PI * Math.pow(radius + 16, 2) + Math.PI * 46 * 46 + 120 * 28) / width / lineHeight) * lineHeight + lineHeight * 2;
    }
    if (home || x === undefined) { x = width - radius - 12; y = radius + 24; }
    x = clamp(x, radius, width - radius);
    y = clamp(y, radius, height - radius - 30);
    solar = scene.geometry(state()); holes = [];
    var result = flow(true);
    result.paragraphs.forEach(function (paragraph, index) {
      var fragment = document.createDocumentFragment();
      paragraph.parts.forEach(function (part) {
        var span = document.createElement('span'); span.className = 'word-line'; span.textContent = part.text;
        span.style.left = part.left + 'px'; span.style.top = part.top + 'px'; fragment.appendChild(span);
        holes.push({ x:part.left, y:paragraph.top+part.top, width:part.width, height:lineHeight });
      });
      paragraphs[index].element.replaceChildren(fragment);
      paragraphs[index].element.style.height = paragraph.height + 'px';
    });
    room.dataset.ready = '';
    room.style.minHeight = Math.max(height, result.height) + 'px';
    room.style.setProperty('--world-radius', radius + 'px');
    world.style.transform = 'translate(' + (x - radius) + 'px,' + (y - radius) + 'px)';
    canvas.style.width = canvas.style.height = (2 * radius) + 'px';
    holes.push({x:x-68,y:y+radius+2,width:136,height:24});
    sky.style.height = height + 'px';
    sky.style.width = Math.max(width,window.innerWidth) + 'px';
    sky.style.left = (width-Math.max(width,window.innerWidth))/2 + 'px';
    draw();
  }
  function draw() { if(radius) scene.draw(state(),holes); }
  function move(dx,dy) {
    x+=dx;y+=dy;rotation+=dx*.011;phase+=dx*.007-dy*.0035;travel+=Math.hypot(dx,dy);
    var progress=clamp(travel/150,0,1);reveal=progress*progress*(3-2*progress);schedule();
  }
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(function () { scheduled = false; layout(false); }); }
  canvas.addEventListener('pointerdown', function (event) {
    if (event.button) return;
    wake();
    dragging = event.pointerId; last = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId); canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', function (event) {
    if (dragging !== event.pointerId) return;
    var dx = event.clientX - last[0], dy = event.clientY - last[1];
    last = [event.clientX, event.clientY]; move(dx,dy);
  });
  function release() { if(dragging===undefined)return;dragging = undefined; canvas.classList.remove('is-dragging'); rest(); }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release); canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('keydown', function (event) {
    var deltas = { ArrowLeft: [-16,0], ArrowRight: [16,0], ArrowUp: [0,-16], ArrowDown: [0,16] }, d = deltas[event.key];
    if (!d) return; event.preventDefault(); wake();move(d[0],d[1]);rest();
  });
  new ResizeObserver(function (entries) { if (Math.abs(entries[0].contentRect.width - width) > .5) schedule(); }).observe(room);
  new MutationObserver(function(){draw();}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('visibilitychange',function(){if(document.hidden)sleep();});
  reduced.addEventListener('change',function(){if(reduced.matches)sleep();});
  layout(true);
  if (document.fonts) document.fonts.ready.then(function () { fontKey = null; schedule(); });
})();
