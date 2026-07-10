/* Shared accessible mobile navigation. */
(function () {
  'use strict';
  var button = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');
  if (!button || !nav) return;

  function close() {
    button.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    button.querySelector('.sr-only').textContent = 'Open navigation';
  }

  button.addEventListener('click', function () {
    var open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
    button.querySelector('.sr-only').textContent = open ? 'Open navigation' : 'Close navigation';
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      close();
      button.focus();
    }
  });

  window.matchMedia('(min-width: 761px)').addEventListener('change', close);
})();
