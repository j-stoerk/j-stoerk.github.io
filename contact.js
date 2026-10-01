/* Inline contact form, with an editable name from this browser's comment identity. */
(function () {
  'use strict';
  const panel = document.getElementById('contact-message');
  if (!panel) return;
  const links = [...document.querySelectorAll('[data-open-message]')];
  const name = panel.querySelector('[name="name"]');
  const service = panel.dataset.commentService;
  let nameEdited = false;
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
    links[0]?.focus({ preventScroll: true });
  }
  links.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    prefillName();
    panel.hidden = false;
    links.forEach(trigger => trigger.setAttribute('aria-expanded', 'true'));
    name.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }));
  panel.querySelector('[data-message-close]').addEventListener('click', close);
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  });
})();
