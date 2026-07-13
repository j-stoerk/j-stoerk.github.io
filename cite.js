/* Copy-to-clipboard for the BibTeX blocks in the publication index. */
(function () {
  'use strict';

  var panels = document.querySelectorAll('.bibtex');

  Array.prototype.forEach.call(panels, function (details) {
    var btn = details.querySelector('.bibtex-copy');
    var pre = details.querySelector('pre');
    if (!btn || !pre) return;

    function feedback(ok) {
      btn.textContent = ok ? 'Copied ✓' : 'Copy failed';
      btn.classList.toggle('copied', ok);
      setTimeout(function () {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 1600);
    }

    btn.addEventListener('click', function () {
      var text = pre.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { feedback(true); },
          function () { feedback(false); }
        );
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { }
        document.body.removeChild(ta);
        feedback(ok);
      }
    });
  });
})();
