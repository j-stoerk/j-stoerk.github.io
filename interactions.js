/* Scroll interactions: live nav scrollspy, a contained parallax on feature
   media, count-up metrics, and self-drawing publication charts. Content is
   shown directly — there is no reveal-on-scroll and no image wipe. All of it
   degrades to fully-visible static content under prefers-reduced-motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('reveal-ready');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var slice = function (n) { return Array.prototype.slice.call(n); };

  /* ---- scroll-progress indicator ---- */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  var barTick = false;
  function barDraw() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.pageYOffset / max) * 100 : 0) + '%';
    barTick = false;
  }
  window.addEventListener('scroll', function () {
    if (!barTick) { barTick = true; requestAnimationFrame(barDraw); }
  }, { passive: true });
  barDraw();

  /* ---- scrollspy: highlight the nav link for the section in view ---- */
  var links = {};
  slice(document.querySelectorAll('.nav a[href^="#"], .site-title[href^="#"]')).forEach(function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });
  var spySections = slice(document.querySelectorAll('main [id]')).filter(function (s) {
    return links[s.id];
  });
  if (hasIO && spySections.length) {
    var current = null;
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) current = e.target.id; });
      Object.keys(links).forEach(function (id) {
        if (id !== current) links[id].classList.remove('current');
      });
      if (current && links[current]) links[current].classList.add('current');
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    spySections.forEach(function (s) { so.observe(s); });
  }

  /* ---- contained parallax on feature media ---- */
  if (!reduce) {
    var px = slice(document.querySelectorAll('.media-band, .section-media, .post-cover')).map(function (w) {
      var inner = w.querySelector('img, video');
      if (inner) inner.classList.add('parallax-media');
      return { frame: w.querySelector('.media') || w, inner: inner };
    }).filter(function (o) { return o.inner; });
    if (px.length) {
      var ticking = false;
      var draw = function () {
        var vh = window.innerHeight;
        px.forEach(function (o) {
          var r = o.frame.getBoundingClientRect();
          if (r.bottom < -60 || r.top > vh + 60) return;
          var extra = r.height * 0.24;                         // media is 124% tall
          var prog = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
          // keep the oversized media within [-extra, 0] so it always covers
          var y = -extra / 2 + (prog - 0.5) * extra * 0.7;
          o.inner.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
        });
        ticking = false;
      };
      var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(draw); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      draw();
    }
  }

  /* ---- count-up numbers ---- */
  /* Impact metrics count up when their stat block scrolls into view. */
  (function () {
    var nums = slice(document.querySelectorAll('.exp-stats .num[data-to]'));
    if (!nums.length) return;
    var dec = function (el) { return parseInt(el.getAttribute('data-dec') || '0', 10); };
    var fmt = function (v, d) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(d); };
    var run = function (el) {
      if (el.getAttribute('data-ran')) return;
      el.setAttribute('data-ran', '1');
      var to = parseFloat(el.getAttribute('data-to'));
      var d = dec(el);
      if (isNaN(to)) return;
      if (reduce) { el.textContent = fmt(to, d); return; }
      var dur = 950, t0 = null;
      var tick = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)), d);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(to, d);
      };
      requestAnimationFrame(tick);
    };
    if (!reduce) nums.forEach(function (el) { el.textContent = fmt(0, dec(el)); });
    var runIn = function (scope) {
      slice(scope.querySelectorAll('.num[data-to]')).forEach(run);
    };
    var figs = slice(document.querySelectorAll('.exp-stats'));
    if (hasIO && !reduce) {
      var no = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { runIn(e.target); no.unobserve(e.target); }
        });
      }, { threshold: 0.35 });
      figs.forEach(function (f) { no.observe(f); });
    } else {
      figs.forEach(runIn);
    }
  })();

  /* ---- self-drawing publication charts ---- */
  if (!reduce) {
    var solid = 'path[stroke]:not([stroke-dasharray])';
    var figures = slice(document.querySelectorAll('.pub-figure'));
    var animFigs = figures.filter(function (fig) {
      var lines = slice(fig.querySelectorAll(solid));
      if (!lines.length && !fig.querySelector('path[fill]:not([stroke])')) return false;
      fig.classList.add('animate');
      lines.forEach(function (p) {
        var len = 0;
        try { len = p.getTotalLength(); } catch (err) { return; }
        if (!len) return;
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.__len = len;
      });
      return true;
    });
    var drawFig = function (fig) {
      slice(fig.querySelectorAll(solid)).forEach(function (p, i) {
        if (!p.__len) return;
        p.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(.65,0,.35,1) ' + (i * 220) + 'ms';
        requestAnimationFrame(function () { p.style.strokeDashoffset = '0'; });
      });
      fig.classList.add('drawn');
    };
    if (animFigs.length && hasIO) {
      var fo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { fo.unobserve(e.target); drawFig(e.target); }
        });
      }, { threshold: 0.3 });
      animFigs.forEach(function (f) { fo.observe(f); });
    } else {
      animFigs.forEach(drawFig);
    }
  }
})();
