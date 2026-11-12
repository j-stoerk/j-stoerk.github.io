/* Ordinary streamed audio. No synthesizer, voice model or audio preload. */
(function () {
  'use strict';
  var section = document.querySelector('.post-listen');
  if (!section) return;
  var button = section.querySelector('[data-listen]'), label = section.querySelector('[data-listen-label]');
  var audio = section.querySelector('audio[data-narration-src]'), controls = section.querySelector('.listen-controls');
  var status = section.querySelector('[data-listen-status]');
  var loaded = false, started = false;
  button.hidden = false;
  function paint() {
    label.textContent = audio.paused ? (started ? 'Resume' : 'Listen') : 'Pause';
    button.setAttribute('aria-pressed', String(!audio.paused));
  }
  button.addEventListener('click', function () {
    controls.hidden = false; button.setAttribute('aria-expanded', 'true');
    if (!loaded) { audio.src = audio.dataset.narrationSrc; loaded = true; }
    if (!audio.paused) { audio.pause(); return; }
    status.textContent = 'Loading narration…';
    audio.play().then(function () { status.textContent = ''; }).catch(function (failure) {
      if (failure.name === 'AbortError') return;
      status.textContent = 'The audio could not start. Please try Listen again or use the player controls.';
      paint();
    });
  });
  section.querySelector('[data-listen-speed]').addEventListener('change', function (event) { audio.playbackRate = Number(event.target.value); });
  audio.addEventListener('playing', function () { started = true; status.textContent = ''; paint(); });
  audio.addEventListener('pause', function () { if (!audio.error) status.textContent = ''; paint(); });
  audio.addEventListener('ended', function () { started = false; paint(); });
  audio.addEventListener('waiting', function () { if (!audio.paused) status.textContent = 'Buffering…'; });
  audio.addEventListener('error', function () { status.textContent = 'The narration could not load. Please try again.'; loaded = false; paint(); });
  document.addEventListener('play', function (event) {
    if (event.target !== audio) { audio.pause(); return; }
    document.querySelectorAll('audio, video').forEach(function (other) { if (other !== audio) other.pause(); });
  }, true);
  if ('mediaSession' in navigator && 'MediaMetadata' in window) {
    audio.addEventListener('play', function () {
      navigator.mediaSession.metadata = new MediaMetadata({ title: document.querySelector('h1').textContent.trim(), artist: 'Julius Störk', album: 'Research notes · AI narration' });
    });
  }
})();
