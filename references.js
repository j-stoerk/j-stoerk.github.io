/* Citations reveal their reference before the browser follows the anchor. */
(function () {
  'use strict';
  function reveal(hash) {
    if (!hash) return null;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (_) { return null; }
    const target = document.getElementById(id);
    const fold = target?.closest('.references-more');
    if (!fold) return null;
    fold.open = true;
    return target;
  }
  function followHash() {
    const target = reveal(location.hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname) reveal(url.hash);
  });
  window.addEventListener('hashchange', followHash);
  followHash();

  // Printed articles include the complete bibliography, then restore the view.
  let closed = [];
  window.addEventListener('beforeprint', () => {
    closed = [...document.querySelectorAll('.references-more:not([open])')];
    closed.forEach(fold => { fold.open = true; });
  });
  window.addEventListener('afterprint', () => {
    closed.forEach(fold => { fold.open = false; });
    closed = [];
  });
})();
