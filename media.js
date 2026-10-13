/* Autoplay muted background/feature videos only while visible, and never
   under reduced-motion (the poster frame stays). Keeps several looping
   clips cheap by pausing whatever is scrolled off-screen. */
(function () {
  'use strict';
  // Prevent native image/linked-image drag previews, including dynamic images.
  // Clicks and pointer-based interactions keep their normal behaviour.
  document.addEventListener('dragstart', function (event) {
    var target = event.target;
    if (target.closest('img, picture') || target.closest('a')?.querySelector('img')) {
      event.preventDefault();
    }
  });
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
