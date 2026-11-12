/* A compact control strip backed by ordinary streamed audio; no audio preload. */
(function () {
  'use strict';
  var section = document.querySelector('.post-listen');
  if (!section) return;
  var bar = section.querySelector('[data-listen-bar]');
  var button = section.querySelector('[data-listen]'), label = section.querySelector('[data-listen-label]');
  var audio = section.querySelector('audio[data-narration-src]'), status = section.querySelector('[data-listen-status]');
  var transport = section.querySelector('[data-listen-transport]'), seek = section.querySelector('[data-listen-seek]');
  var time = section.querySelector('[data-listen-time]'), duration = section.querySelector('[data-listen-duration]');
  var mute = section.querySelector('[data-listen-mute]'), speed = section.querySelector('[data-listen-speed-control]');
  var loaded = false, started = false, seeking = false;
  var initialDuration = Number(audio.dataset.narrationSeconds);
  bar.hidden = false;
  function clock(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }
  function total() { return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : initialDuration; }
  function paint() {
    label.textContent = audio.paused ? (started ? 'Play' : 'Listen') : 'Pause';
    button.setAttribute('aria-pressed', String(!audio.paused));
    button.setAttribute('aria-label', audio.paused ? 'Play article narration' : 'Pause article narration');
    bar.dataset.playing = String(!audio.paused);
  }
  function update() {
    var length = total(), current = Math.min(audio.currentTime || 0, length);
    time.textContent = clock(current) + ' / ' + clock(length);
    seek.max = String(Math.ceil(length));
    if (!seeking) seek.value = String(current);
    seek.style.setProperty('--seek-progress', (length ? current / length * 100 : 0).toFixed(2) + '%');
    seek.setAttribute('aria-valuetext', clock(current) + ' of ' + clock(length));
  }
  function expand() {
    bar.dataset.expanded = 'true';
    duration.hidden = true; transport.hidden = false; mute.hidden = false; speed.hidden = false;
  }
  function clearStatus() { status.textContent = ''; status.removeAttribute('data-error'); }
  function fail(message) { status.textContent = message; status.setAttribute('data-error', ''); paint(); }
  function play() {
    expand(); clearStatus();
    if (!loaded) { audio.src = audio.dataset.narrationSrc; loaded = true; }
    if (audio.ended || audio.currentTime >= total()) audio.currentTime = 0;
    status.textContent = 'Loading narration…';
    audio.play().then(clearStatus).catch(function (failure) {
      if (failure.name !== 'AbortError') fail('The narration could not start. Please try Listen again.');
    });
    paint();
  }
  button.addEventListener('click', function () { if (audio.paused) play(); else audio.pause(); });
  section.querySelector('[data-listen-speed]').addEventListener('change', function (event) { audio.playbackRate = Number(event.target.value); });
  seek.addEventListener('pointerdown', function () { seeking = true; });
  ['pointerup', 'pointercancel', 'blur'].forEach(function (event) { seek.addEventListener(event, function () { seeking = false; update(); }); });
  seek.addEventListener('input', function () {
    if (audio.readyState < 1) return;
    audio.currentTime = Math.min(Number(seek.value), total()); update();
  });
  mute.addEventListener('click', function () { audio.muted = !audio.muted; });
  audio.addEventListener('volumechange', function () {
    mute.setAttribute('aria-pressed', String(audio.muted));
    mute.setAttribute('aria-label', audio.muted ? 'Unmute narration' : 'Mute narration');
  });
  audio.addEventListener('loadedmetadata', function () { seek.disabled = false; update(); });
  ['durationchange', 'timeupdate', 'seeked'].forEach(function (event) { audio.addEventListener(event, update); });
  audio.addEventListener('play', paint);
  audio.addEventListener('playing', function () { started = true; clearStatus(); paint(); });
  audio.addEventListener('pause', function () { if (!audio.error) clearStatus(); paint(); });
  audio.addEventListener('ended', function () { started = false; paint(); update(); });
  audio.addEventListener('waiting', function () { if (!audio.paused) status.textContent = 'Buffering…'; });
  audio.addEventListener('error', function () {
    loaded = false; started = false; seek.disabled = true;
    fail('The narration could not load. Please try Listen again.');
  });
  document.addEventListener('play', function (event) {
    if (event.target !== audio) { audio.pause(); return; }
    document.querySelectorAll('audio, video').forEach(function (other) { if (other !== audio) other.pause(); });
  }, true);
  if ('mediaSession' in navigator && 'MediaMetadata' in window) {
    audio.addEventListener('play', function () {
      navigator.mediaSession.metadata = new MediaMetadata({ title: document.querySelector('h1').textContent.trim(), artist: 'Julius Störk', album: 'Research notes · AI narration' });
    });
  }
  update(); paint();
})();
