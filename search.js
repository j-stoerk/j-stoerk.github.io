/* Search downloads its index only after a query. */
(function () {
  'use strict';
  var script = document.querySelector('script[data-search-index]');
  var dialog = document.querySelector('[data-search-dialog]');
  var source, indexPromise;
  function index() {
    if (!indexPromise) indexPromise = fetch(script.dataset.searchIndex).then(function (response) {
      if (!response.ok) throw new Error('index');
      return response.json();
    }).catch(function (error) { indexPromise = null; throw error; });
    return indexPromise;
  }
  function normalize(value) { return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function snippet(doc, terms) {
    var text = doc.summary || doc.text;
    if (!terms.some(function (term) { return normalize(text).includes(term); })) {
      var at = normalize(doc.text).indexOf(terms[0]);
      if (at >= 0) text = (at > 65 ? '… ' : '') + doc.text.slice(Math.max(0, at - 65), at + 170);
    }
    return text.length > 240 ? text.slice(0, 237).replace(/\s+\S*$/, '') + '…' : text;
  }
  function highlight(element, text, terms) {
    var escaped = terms.map(function (term) { return term.replace(/[.*+?^{}()|[\]\\$]/g, '\\$&'); });
    var expression = new RegExp('(' + escaped.join('|') + ')', 'ig');
    text.split(expression).forEach(function (part) {
      var node = terms.includes(normalize(part)) ? document.createElement('mark') : document.createTextNode(part);
      if (node.nodeType === 1) node.textContent = part;
      element.appendChild(node);
    });
  }
  document.querySelectorAll('[data-site-search]').forEach(function (form) {
    var input = form.querySelector('[data-search-input]'), output = form.querySelector('[data-search-results]');
    var status = form.querySelector('[data-search-status]'), timer, request = 0;
    async function search() {
      var query = input.value.trim().slice(0, 160), ticket = ++request;
      output.replaceChildren();
      if (!query) { status.textContent = 'Search the full text of posts, papers and project notes.'; return; }
      status.textContent = 'Searching…';
      try {
        var docs = await index();
        if (ticket !== request) return;
        var terms = normalize(query).split(/\s+/).filter(Boolean);
        var matches = docs.map(function (doc) {
          var title = normalize(doc.title), summary = normalize(doc.summary), body = normalize(doc.text);
          if (!terms.every(function (term) { return (title + ' ' + summary + ' ' + body).includes(term); })) return null;
          return { doc: doc, score: terms.reduce(function (score, term) { return score + (title.includes(term) ? 12 : 0) + (summary.includes(term) ? 4 : 0) + (body.includes(term) ? 1 : 0); }, title.includes(normalize(query)) ? 20 : 0) };
        }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
        status.textContent = matches.length ? matches.length + ' result' + (matches.length === 1 ? '' : 's') + (matches.length > 12 ? ' · showing the first 12' : '') : 'No results. Try fewer words or another term.';
        matches.slice(0, 12).forEach(function (match) {
          var doc = match.doc, link = document.createElement('a');
          if (!/^[a-z0-9-]+\.html(?:#[a-z0-9-]+)?$/.test(doc.url)) return;
          link.href = doc.url; link.className = 'search-result';
          var kind = document.createElement('small'); kind.textContent = doc.kind;
          var title = document.createElement('strong'); highlight(title, doc.title, terms);
          var description = document.createElement('span'); highlight(description, snippet(doc, terms), terms);
          link.append(kind, title, description); output.appendChild(link);
        });
      } catch (_) { if (ticket === request) status.textContent = 'Search could not load. Please try again or browse the blog archive.'; }
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(search, 80); });
    form.addEventListener('submit', function (event) {
      event.preventDefault(); clearTimeout(timer); search();
      if (!form.closest('dialog')) { var url = new URL(location.href); url.searchParams.set('q', input.value.trim()); history.replaceState(null, '', url); }
    });
    if (!form.closest('dialog')) { input.value = new URLSearchParams(location.search).get('q') || ''; if (input.value) search(); }
  });
  function open(event) {
    if (!dialog || !dialog.showModal) return;
    if (event) event.preventDefault();
    source = document.activeElement;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('input').focus();
  }
  document.querySelectorAll('[data-search-open]').forEach(function (link) {
    link.addEventListener('click', function (event) { if (!(event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) open(event); });
  });
  if (!dialog) return;
  dialog.querySelector('[data-search-close]').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', function () { if (source) source.focus(); });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) {
    var rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  } });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && dialog.open) { event.preventDefault(); dialog.close(); return; }
    var editing = event.target.closest('input,textarea,select,[contenteditable="true"]');
    if ((event.key === '/' && !editing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) open(event);
  });
})();
