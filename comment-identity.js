/* One browser identity for blog comments and editable contact-name prefill. */
(function () {
  'use strict';
  const key = 'portfolio-comment-identity-v2';
  let memory = null;
  function valid(value, service) {
    return value && value.service === service && typeof value.token === 'string'
      && /^[a-f0-9]{64}$/.test(value.token) && typeof value.displayName === 'string'
      && value.displayName.trim().length > 0 && value.displayName.length <= 40
      && typeof value.confirmed === 'boolean';
  }
  function read(service) {
    let saved = memory;
    try { const stored = localStorage.getItem(key); if (stored) saved = JSON.parse(stored); } catch (_) { }
    return valid(saved, service) ? saved : null;
  }
  function write(value) {
    if (!valid(value, value?.service)) return;
    memory = value;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { }
  }
  window.PortfolioCommentIdentity = { read, write, valid };
})();
