/* Native MP4 playback: one timeline, accessible controls, no animation library. */
(function () {
  'use strict';
  var video = document.getElementById('battery-map-video');
  if (!video) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var manuallyPaused = false;
  var automaticPause = false;
  var onScreen = true;

  function playWhenVisible() {
    if (reduced.matches || manuallyPaused || document.hidden || !onScreen) return;
    video.muted = true;
    var result = video.play();
    if (result && result.catch) result.catch(function () { /* Native controls remain available. */ });
  }
  function stopAutomatically() {
    if (video.paused) return;
    automaticPause = true;
    video.pause();
  }
  function motionPreference() {
    if (reduced.matches) {
      video.removeAttribute('autoplay');
      stopAutomatically();
      video.currentTime = 0;
    } else {
      playWhenVisible();
    }
  }
  video.addEventListener('pause', function () {
    if (automaticPause) automaticPause = false;
    else manuallyPaused = true;
  });
  video.addEventListener('play', function () { manuallyPaused = false; });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopAutomatically();
    else playWhenVisible();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) playWhenVisible();
      else stopAutomatically();
    }, { threshold: 0.15 }).observe(video);
  }
  reduced.addEventListener('change', motionPreference);
  motionPreference();
})();
