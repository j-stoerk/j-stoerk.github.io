/* One set of articles, two layouts. Remember the reader's choice. */
(function () {
  'use strict';
  var posts = document.getElementById('blog-posts');
  var controls = document.querySelector('.blog-view-controls');
  if (!posts || !controls) return;
  var buttons = controls.querySelectorAll('[data-blog-view-button]');

  function setView(view) {
    view = view === 'list' ? 'list' : 'tiles';
    posts.setAttribute('data-blog-view', view);
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.blogViewButton === view));
    });
  }

  var saved;
  try { saved = localStorage.getItem('blog-view'); } catch (e) { }
  setView(saved);
  controls.hidden = false;
  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      var view = button.dataset.blogViewButton;
      setView(view);
      try { localStorage.setItem('blog-view', view); } catch (e) { }
    });
  });
})();
