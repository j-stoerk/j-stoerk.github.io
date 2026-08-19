/* Scroll interactions: reveal-on-scroll, live nav scrollspy, and a
   contained parallax on feature media. All degrade to fully-visible,
   static content, and none of it runs under prefers-reduced-motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('reveal-ready');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var slice = function (n) { return Array.prototype.slice.call(n); };

  /* ---- reveal on scroll ---- */
  var revealSel = '.media-band, .section-media, .rcard, ' +
    '.career-entry, .publication-record, .journal-entry, .pub-list .item, ' +
    '.section-head, .interactive';
  var reveals = slice(document.querySelectorAll(revealSel));
  reveals.forEach(function (el) {
    el.classList.add('reveal');
    var group = el.parentNode ? slice(el.parentNode.children).filter(function (c) {
      return c.classList && c.classList.contains('reveal');
    }) : [];
    var i = group.indexOf(el);
    if (i > 0) el.style.transitionDelay = Math.min(i, 5) * 45 + 'ms';
  });
  if (reduce || !hasIO) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 8% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  }

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
      return { w: w, inner: inner };
    }).filter(function (o) { return o.inner; });
    if (px.length) {
      var ticking = false;
      var draw = function () {
        var vh = window.innerHeight;
        px.forEach(function (o) {
          var r = o.w.getBoundingClientRect();
          if (r.bottom < -60 || r.top > vh + 60) return;
          var prog = (vh - r.top) / (vh + r.height);          // 0 (below) .. 1 (above)
          o.inner.style.transform = 'translateY(' + ((prog - 0.5) * -44).toFixed(1) + 'px)';
        });
        ticking = false;
      };
      var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(draw); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      draw();
    }
  }
})();
