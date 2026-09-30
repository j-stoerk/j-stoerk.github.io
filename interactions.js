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
  var bar = document.querySelector('.scroll-progress') || document.createElement('div');
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
  window.addEventListener('resize', barDraw, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(barDraw).observe(document.querySelector('main'));
  barDraw();

  /* ---- page chapters and the career timeline ---- */
  (function () {
    var chapterNav = document.querySelector('.chapter-nav');
    if (!chapterNav) return;
    var list = chapterNav.querySelector('.chapter-list');
    var chapterLinks = slice(list.querySelectorAll('a'));
    var chapters = chapterLinks.map(function (a) {
      return document.getElementById(a.hash.slice(1));
    });
    var primaryLinks = slice(document.querySelectorAll('.nav a[href^="#"], .site-title[href^="#"]'));
    var topbar = document.querySelector('.topbar');
    var timeline = document.querySelector('.career-timeline');
    var entries = slice(document.querySelectorAll('.career-entry[id]'));
    var milestones = slice(document.querySelectorAll('.career-milestones a'));
    var current = -1;
    var queued = false;
    var keepLinkVisible = false;
    var clamp = function (n) { return Math.max(0, Math.min(1, n)); };
    if (timeline) timeline.classList.add('is-tracking');

    function drawChapters() {
      queued = false;
      var headerHeight = topbar.getBoundingClientRect().height;
      var horizontal = getComputedStyle(chapterNav).position !== 'fixed';
      var chapterHeight = horizontal ? chapterNav.getBoundingClientRect().height : 0;
      document.body.style.setProperty('--site-header-height', headerHeight + 'px');
      document.body.style.setProperty('--chapter-height', chapterHeight + 'px');
      var readingLine = headerHeight + chapterHeight + Math.min(120, window.innerHeight * .18);
      var positions = chapters.map(function (section) { return section.getBoundingClientRect(); });
      var active = 0;
      positions.forEach(function (rect, i) { if (rect.top <= readingLine) active = i; });
      var atBottom = window.pageYOffset + window.innerHeight >= root.scrollHeight - 2;
      if (atBottom) active = chapters.length - 1;

      if (active !== current || keepLinkVisible) {
        chapterLinks.forEach(function (a, i) {
          if (i === active) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
        primaryLinks.forEach(function (a) {
          var selected = a.hash === chapterLinks[active].hash;
          a.classList.toggle('current', selected);
          if (selected) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
        // Move only the chapter strip; never move the document or keyboard focus.
        var keyboardFocus = list.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
        if (horizontal && !keyboardFocus) {
          var linkRect = chapterLinks[active].getBoundingClientRect();
          var listRect = list.getBoundingClientRect();
          if (linkRect.left < listRect.left || linkRect.right > listRect.right) {
            list.scrollLeft += linkRect.left - listRect.left - (listRect.width - linkRect.width) / 2;
          }
        }
        current = active;
        keepLinkVisible = false;
      }

      if (timeline && entries.length) {
        var rect = timeline.getBoundingClientRect();
        timeline.style.setProperty('--timeline-progress', clamp((readingLine - rect.top) / rect.height).toFixed(3));
        var activeEntry = 0;
        var entryPositions = entries.map(function (entry) { return entry.getBoundingClientRect().top; });
        entryPositions.forEach(function (top, i) { if (top <= readingLine) activeEntry = i; });
        entries.forEach(function (entry, i) {
          entry.classList.toggle('is-active', i === activeEntry);
          entry.classList.toggle('is-passed', i < activeEntry);
        });
        milestones.forEach(function (a) {
          if (a.hash === '#' + entries[activeEntry].id) a.setAttribute('aria-current', 'step');
          else a.removeAttribute('aria-current');
        });
        if (timeline.dataset.activeCareer !== entries[activeEntry].id) {
          timeline.dataset.activeCareer = entries[activeEntry].id;
          document.dispatchEvent(new CustomEvent('careerchange', { detail: entries[activeEntry].id }));
        }
      }
    }

    function schedule() {
      if (!queued) { queued = true; requestAnimationFrame(drawChapters); }
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', function () { keepLinkVisible = true; schedule(); }, { passive: true });
    window.addEventListener('hashchange', schedule);
    window.addEventListener('pageshow', schedule);
    window.addEventListener('load', schedule);
    if ('ResizeObserver' in window) {
      var layoutObserver = new ResizeObserver(schedule);
      layoutObserver.observe(document.querySelector('main'));
      layoutObserver.observe(topbar);
    }
    drawChapters();
  })();

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
