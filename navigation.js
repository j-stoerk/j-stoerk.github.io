/* Shared accessible mobile navigation. */
(function () {
  'use strict';
  var button = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');
  var mobile = window.matchMedia('(max-width: 760px)');
  if (!button || !nav) return;

  function close() {
    button.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    button.querySelector('.sr-only').textContent = 'Open navigation';
  }

  button.addEventListener('click', function () {
    if (!mobile.matches) return;
    var open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
    button.querySelector('.sr-only').textContent = open ? 'Open navigation' : 'Close navigation';
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && mobile.matches && button.getAttribute('aria-expanded') === 'true') {
      close();
      button.focus();
    }
  });

  function syncMode() {
    close();
    if (mobile.matches) {
      button.hidden = false;
      button.removeAttribute('aria-hidden');
    } else {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
    }
  }

  if (mobile.addEventListener) mobile.addEventListener('change', syncMode);
  else if (mobile.addListener) mobile.addListener(syncMode);
  syncMode();
})();
