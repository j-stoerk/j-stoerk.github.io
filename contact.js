/* Inline contact form, with an editable name from this browser's comment identity. */
(function () {
  'use strict';
  const panel = document.getElementById('contact-message');
  if (!panel) return;
  const links = [...document.querySelectorAll('[data-open-message], a[href="#contact"]')];
  const section = document.getElementById('contact');
  links.forEach(link => {
    link.setAttribute('aria-controls', panel.id);
    link.setAttribute('aria-expanded', 'false');
  });
  const name = panel.querySelector('[name="name"]');
  const service = panel.dataset.commentService;
  let nameEdited = false;
  let trigger = document.querySelector('[data-open-message]');
  name.addEventListener('input', () => { nameEdited = true; });

  function prefillName() {
    if (nameEdited || name.value) return;
    try {
      const identity = window.PortfolioCommentIdentity.read(service);
      if (identity?.confirmed) {
        name.value = identity.displayName.trim().slice(0, name.maxLength);
      }
    } catch (_) { /* A missing identity or restricted storage leaves the name editable. */ }
  }
  function close() {
    panel.hidden = true;
    links.forEach(link => link.setAttribute('aria-expanded', 'false'));
    trigger?.focus({ preventScroll: true });
  }
  function open(scroll = true) {
    prefillName();
    panel.hidden = false;
    links.forEach(trigger => trigger.setAttribute('aria-expanded', 'true'));
    name.focus({ preventScroll: true });
    if (scroll) {
      const mobile = matchMedia('(max-width: 760px)').matches;
      (mobile ? panel : section).scrollIntoView({ block: mobile ? 'nearest' : 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }
  links.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    trigger = link;
    if (link.hash === '#contact' && location.hash !== '#contact') history.pushState(null, '', '#contact');
    open();
  }));
  window.addEventListener('hashchange', () => { if (location.hash === '#contact') open(); });
  // Cross-page Contact links arrive at the section with the form already open.
  if (location.hash === '#contact') {
    open(false);
    // Initial fragment navigation can reset focus after deferred scripts run.
    window.addEventListener('pageshow', () => requestAnimationFrame(() => {
      if (!panel.hidden && document.activeElement === document.body) {
        name.focus({ preventScroll: true });
        if (matchMedia('(max-width: 760px)').matches) panel.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    }), { once: true });
  }
  panel.querySelector('[data-message-close]').addEventListener('click', close);
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  });
})();
