/* Inline bio explanations: hover/focus previews, click/tap pins the card. */
(function () {
  'use strict';
  const terms = Array.from(document.querySelectorAll('[data-bio-topic]'));
  const card = document.getElementById('bio-popover');
  const template = document.getElementById('bio-explanations');
  if (!terms.length || !card || !template) return;
  const heading = document.getElementById('bio-popover-title');
  const body = document.getElementById('bio-popover-body');
  const native = typeof card.showPopover === 'function';
  let active = null, pinned = false, restoringFocus = false;
  let openTimer, closeTimer;

  function clearTimers() { clearTimeout(openTimer); clearTimeout(closeTimer); }
  function position() {
    if (!active) return;
    const margin = 16, gap = 10;
    const rect = active.getBoundingClientRect();
    card.style.width = Math.min(340, innerWidth - margin * 2) + 'px';
    card.style.maxHeight = Math.max(120, innerHeight - margin * 2) + 'px';
    const height = card.offsetHeight, width = card.offsetWidth;
    const left = Math.max(margin, Math.min(innerWidth - width - margin, rect.left));
    let top = rect.bottom + gap;
    if (top + height > innerHeight - margin) top = rect.top - height - gap;
    top = Math.max(margin, Math.min(innerHeight - height - margin, top));
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }
  function show(term, pin = false) {
    clearTimers();
    const content = template.content.querySelector('[data-bio-card="' + term.dataset.bioTopic + '"]');
    if (!content) return;
    if (active !== term) {
      active?.setAttribute('aria-expanded', 'false');
      heading.textContent = content.dataset.title;
      body.replaceChildren(content.cloneNode(true));
    }
    active = term; pinned = pin;
    term.setAttribute('aria-expanded', 'true');
    const wasOpen = card.dataset.open === 'true';
    card.dataset.open = 'true'; card.dataset.pinned = String(pinned);
    if (native && !wasOpen) card.showPopover();
    position();
  }
  function close(returnFocus = false) {
    clearTimers();
    if (!active) return;
    const previous = active;
    previous.setAttribute('aria-expanded', 'false');
    active = null; pinned = false;
    if (native) card.hidePopover();
    delete card.dataset.open; delete card.dataset.pinned;
    if (returnFocus) {
      restoringFocus = true; previous.focus({ preventScroll: true }); restoringFocus = false;
    }
  }
  function scheduleClose() {
    clearTimeout(openTimer); clearTimeout(closeTimer);
    if (pinned) return;
    closeTimer = setTimeout(() => {
      if (!active || pinned) return;
      if (active.matches(':hover') || card.matches(':hover') || active === document.activeElement || card.contains(document.activeElement)) return;
      close();
    }, 220);
  }
  terms.forEach(term => {
    term.disabled = false;
    term.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || pinned) return;
      clearTimers(); openTimer = setTimeout(() => show(term), 140);
    });
    term.addEventListener('pointerleave', scheduleClose);
    term.addEventListener('focus', () => {
      if (!restoringFocus && term.matches(':focus-visible')) show(term);
    });
    term.addEventListener('blur', scheduleClose);
    term.addEventListener('click', event => {
      if (active === term && pinned) { close(); return; }
      show(term, true);
      if (event.detail === 0) card.focus({ preventScroll: true });
    });
    term.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault(); show(term, true); card.focus({ preventScroll: true });
    });
  });
  card.addEventListener('pointerenter', clearTimers);
  card.addEventListener('pointerleave', scheduleClose);
  card.addEventListener('focusout', scheduleClose);
  card.querySelector('.bio-close').addEventListener('click', () => close(true));
  card.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('pointerdown', event => {
    if (!card.contains(event.target) && !event.target.closest('[data-bio-topic]')) close();
  });
  document.addEventListener('focusin', event => {
    if (!card.contains(event.target) && !event.target.closest('[data-bio-topic]')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) { event.preventDefault(); close(true); }
  });
  window.addEventListener('resize', position, { passive: true });
  window.addEventListener('scroll', event => {
    if (active && !card.contains(event.target)) close();
  }, { capture: true, passive: true });
})();
