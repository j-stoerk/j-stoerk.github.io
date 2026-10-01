/* Inline contact form, with an editable name from this browser's Cactus identity. */
(function () {
  'use strict';
  const panel = document.getElementById('contact-message');
  if (!panel) return;
  const links = [...document.querySelectorAll('[data-open-message]')];
  const name = panel.querySelector('[name="name"]');
  const server = panel.dataset.commentHomeserver.replace(/\/$/, '');
  let nameEdited = false;
  name.addEventListener('input', () => { nameEdited = true; });

  function prefillName() {
    if (nameEdited || name.value) return;
    try {
      const identity = JSON.parse(localStorage.getItem('portfolio-comment-identity:' + server));
      if (identity?.homeserver === server && typeof identity.displayName === 'string') {
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
