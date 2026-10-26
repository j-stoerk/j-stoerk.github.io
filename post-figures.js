/* Local figures resize to their content and follow the reader's theme. */
(function () {
  'use strict';
  const frames = [...document.querySelectorAll('iframe[data-autoheight]')];
  const documents = new Set();
  function applyTheme(doc) { doc.documentElement.dataset.theme = document.documentElement.dataset.theme || 'light'; }
  frames.forEach(frame => {
    let observer;
    function attach() {
      const doc = frame.contentDocument;
      if (!doc?.body || doc.URL === 'about:blank') return;
      observer?.disconnect(); documents.add(doc); applyTheme(doc);
      let queued = false;
      function resize() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          const height = Math.ceil(doc.body.getBoundingClientRect().height) + 2;
          if (height > 40 && frame.style.height !== height + 'px') frame.style.height = height + 'px';
        });
      }
      if ('ResizeObserver' in window) { observer = new ResizeObserver(resize); observer.observe(doc.body); }
      else window.addEventListener('resize', resize, { passive: true });
      doc.fonts?.ready.then(resize); resize();
    }
    frame.addEventListener('load', attach);
    if (frame.contentDocument?.readyState === 'complete') attach();
  });
  if (frames.length) new MutationObserver(() => documents.forEach(applyTheme))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const control = document.getElementById('capacity-limit');
  if (!control) return;
  function capacity() {
    const power = Number(control.value), energy = power * 6 * .9;
    document.getElementById('capacity-power').textContent = power.toFixed(2) + ' kW';
    document.getElementById('capacity-fill').style.width = power / 22 * 100 + '%';
    document.getElementById('capacity-result').textContent = energy < 48
      ? `${energy.toFixed(2)} battery kWh available: ${(48 - energy).toFixed(2)} kWh short of the afternoon target.`
      : `${energy.toFixed(2)} battery kWh available. The 48 kWh energy requirement is met; plug availability and taper still need checking in the planner.`;
  }
  control.addEventListener('input', capacity); capacity();
})();
