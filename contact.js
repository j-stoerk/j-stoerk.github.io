/* Open the contact dialog; its HTML form posts directly to Formspree. */
(function () {
  'use strict';
  const dialog = document.getElementById('contact-message');
  if (!dialog) return;
  document.querySelectorAll('[data-open-message]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (!dialog.open) dialog.showModal();
  }));
  dialog.querySelector('[data-message-close]').addEventListener('click', () => dialog.close());
})();
