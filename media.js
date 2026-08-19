/* Autoplay muted background/feature videos only while visible, and never
   under reduced-motion (the poster frame stays). Keeps several looping
   clips cheap by pausing whatever is scrolled off-screen. */
(function () {
  'use strict';
  var vids = document.querySelectorAll('video[data-autoplay]');
  if (!vids.length) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // leave the poster shown, do not autoplay
  }

  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () { }); }

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(vids, play);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) play(e.target);
      else e.target.pause();
    });
  }, { threshold: 0.2 });

  Array.prototype.forEach.call(vids, function (v) { io.observe(v); });
})();
