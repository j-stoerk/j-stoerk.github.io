/* A precise dot and softly following ring, coloured by the current theme.
   Draw only while moving; native pointers remain available on touch and forms. */
(function () {
  'use strict';
  const capability = matchMedia('(hover: hover) and (pointer: fine)');
  if (!capability.matches) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ring = document.createElement('div');
  const dot = document.createElement('div');
  ring.className = 'portfolio-cursor-ring';
  dot.className = 'portfolio-cursor-dot';
  ring.setAttribute('aria-hidden', 'true');
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);
  let x = 0, y = 0, rx = 0, ry = 0, frame = 0, previous = 0, active = false;
  const place = (node, px, py) => {
    node.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
  };
  function hide() {
    root.classList.remove('has-portfolio-cursor');
    cancelAnimationFrame(frame);
    frame = previous = 0;
    active = false;
  }
  function draw(time) {
    frame = 0;
    if (!active) return;
    const elapsed = previous ? Math.min(time - previous, 32) : 16;
    previous = time;
    const ease = reduced.matches ? 1 : 1 - Math.exp(-elapsed / 80);
    rx += (x - rx) * ease;
    ry += (y - ry) * ease;
    if (Math.hypot(x - rx, y - ry) < .1) {
      rx = x; ry = y; previous = 0;
    } else frame = requestAnimationFrame(draw);
    place(ring, rx, ry);
  }
  function nativeTarget(target) {
    return target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog[open], iframe');
  }
  function hover(target) {
    const control = target.closest('a, button, summary, [role="button"], [data-hot]');
    const hot = !!control && !control.matches(':disabled, [aria-disabled="true"]');
    ring.classList.toggle('is-hot', hot);
    dot.classList.toggle('is-hot', hot);
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !capability.matches || nativeTarget(event.target)) {
      hide(); return;
    }
    x = event.clientX; y = event.clientY;
    if (!active) {
      rx = x; ry = y;
      place(ring, rx, ry);
      active = true;
    }
    place(dot, x, y);
    hover(event.target);
    root.classList.add('has-portfolio-cursor');
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });
  document.addEventListener('pointerover', event => {
    if (nativeTarget(event.target)) hide();
    else hover(event.target);
  }, { passive: true });
  document.addEventListener('pointerleave', hide);
  document.addEventListener('pointercancel', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
  capability.addEventListener('change', () => { if (!capability.matches) hide(); });
})();
