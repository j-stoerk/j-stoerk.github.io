/* Theme toggle. The initial value is applied by an inline script in <head>
   (see index.html) so the page never flashes the wrong theme. */
(function () {
  var root = document.documentElement;
  var btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;

  function paint() {
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.textContent = dark ? '☼' : '◐';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.setAttribute('aria-pressed', String(dark));
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#101214' : '#fdfdfc');
  }

  paint();

  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    paint();
  });

  // Light is the standard: the site does not follow the OS theme. Dark applies
  // only when the visitor explicitly toggles it (persisted in localStorage).
})();
