/* Keep final values as real text. Only an aria-hidden, empty visual layer counts. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  var active = [], frame = 0;
  function finish(item) {
    item.overlay.remove(); item.element.removeAttribute('data-counting');
    item.element.style.removeProperty('--count-ink');
  }
  function tick(now) {
    frame = 0;
    active = active.filter(function (item) {
      var progress = Math.min(1, (now - item.start) / 1050);
      item.overlay.dataset.value = (item.value * (1 - Math.pow(1 - progress, 3))).toFixed(item.decimals);
      if (progress < 1) return true;
      finish(item); return false;
    });
    if (active.length) frame = requestAnimationFrame(tick);
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      var element = entry.target, text = element.textContent.trim(), value = Number(text);
      if (!Number.isFinite(value)) return;
      var overlay = document.createElement('span'); overlay.className = 'metric-count-visual';
      overlay.setAttribute('aria-hidden', 'true'); overlay.dataset.value = '0';
      element.style.setProperty('--count-ink', getComputedStyle(element).color);
      element.appendChild(overlay); element.setAttribute('data-counting', '');
      active.push({ element: element, overlay: overlay, value: value, decimals: (text.split('.')[1] || '').length, start: performance.now() });
    });
    if (active.length && !frame) frame = requestAnimationFrame(tick);
  }, { threshold: .65 });
  document.querySelectorAll('.exp-stats .num').forEach(function (element) { observer.observe(element); });
  function settle() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; active.forEach(finish); active = [];
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) settle(); });
  reduced.addEventListener('change', function () { if (reduced.matches) { observer.disconnect(); settle(); } });
})();
