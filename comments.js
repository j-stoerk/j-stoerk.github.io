/* Public comments live in the portfolio's Cloudflare Worker + D1. */
(function () {
  'use strict';
  const section = document.querySelector('[data-comments]');
  if (!section) return;
  const config = JSON.parse(document.getElementById('comments-config').textContent);
  if (!config.endpoint || !config.turnstileSiteKey) return;
  const service = config.endpoint;
  const identities = window.PortfolioCommentIdentity;
  let identity = identities.read(service), cursor = null, loading = false, posting = false, pending = null, connected = false;
  const comments = new Map();
  const form = section.querySelector('[data-comment-form]');
  const text = form.elements.comment;
  const post = form.querySelector('[type="submit"]');
  const status = section.querySelector('[data-comments-status]');
  const list = section.querySelector('[data-comments-list]');
  const more = section.querySelector('[data-comments-more]');
  const refresh = section.querySelector('[data-comments-refresh]');
  const label = section.querySelector('[data-comment-identity]');
  const tools = section.querySelector('[data-identity-tools]');
  const challengeNode = section.querySelector('[data-comment-challenge]');

  function remember() {
    if (identity) identities.write(identity);
    label.textContent = identity?.displayName ? 'Posting as ' + identity.displayName : '';
    label.hidden = !identity?.displayName;
    tools.hidden = false;
    buttons();
  }
  function buttons() {
    const busy = loading || posting;
    post.disabled = busy || !connected; more.disabled = busy; refresh.disabled = busy;
    section.querySelector('[data-identity-save]').disabled = busy || !identity?.confirmed;
    section.querySelector('[data-identity-restore]').disabled = busy || !connected;
  }
  remember(); buttons(); refresh.hidden = false;

  async function api(path, method = 'GET', body, token) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(service + path, { method, headers, credentials: 'omit', cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error(result.message || 'Comments are temporarily unavailable. Your draft is still here.');
    return result;
  }
  function fail(error) {
    status.textContent = error instanceof TypeError || error.name === 'TimeoutError'
      ? 'Couldn’t connect. Your draft is still here; please try again.' : error.message;
  }
  function validComment(value) {
    return value && Number.isSafeInteger(value.id) && value.id > 0 && value.page === config.sectionId
      && typeof value.displayName === 'string' && typeof value.body === 'string'
      && Number.isFinite(value.createdAt) && Math.abs(value.createdAt) <= 8640000000000000;
  }
  function render() {
    const fragment = document.createDocumentFragment();
    for (const value of [...comments.values()].sort((a, b) => a.id - b.id)) {
      const article = document.createElement('article'); article.className = 'comment-entry';
      const meta = document.createElement('div'); meta.className = 'comment-meta';
      const name = document.createElement('strong'); name.textContent = value.displayName;
      const time = document.createElement('time'); const date = new Date(value.createdAt);
      time.dateTime = date.toISOString(); time.textContent = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      const body = document.createElement('p'); body.className = 'comment-body'; body.textContent = value.body;
      meta.append(name, time); article.append(meta, body); fragment.append(article);
    }
    list.replaceChildren(fragment);
  }
  async function load(older = false) {
    if (loading || posting) return;
    loading = true; buttons(); status.textContent = 'Loading…';
    try {
      const query = new URLSearchParams({ page: config.sectionId });
      if (older && cursor) query.set('cursor', cursor);
      const data = await api('/comments?' + query);
      // An older Worker may still be deployed while the owner completes setup.
      // It cannot accept this editor's submissions, so don't show an unusable form.
      if (!Object.hasOwn(data, 'nextCursor')) { section.hidden = true; return; }
      if (!Array.isArray(data.comments) || !data.comments.every(validComment)
        || (data.nextCursor !== null && (!Number.isSafeInteger(data.nextCursor) || data.nextCursor < 1))) throw new Error('Couldn’t load this discussion. Please try again.');
      if (!older) comments.clear();
      data.comments.forEach(comment => comments.set(comment.id, comment));
      cursor = data.nextCursor; more.hidden = !cursor; render(); status.textContent = '';
      connected = true;
    } catch (error) { fail(error); }
    finally { loading = false; buttons(); }
  }
  refresh.addEventListener('click', () => load()); more.addEventListener('click', () => load(true));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: '300px' }); observer.observe(section);
  } else load();

  const nameDialog = section.querySelector('[data-comment-name-dialog]');
  const nameForm = section.querySelector('[data-comment-name-form]');
  function askName() {
    return new Promise(resolve => {
      nameForm.reset(); nameDialog.returnValue = '';
      const submit = event => {
        event.preventDefault();
        const name = nameForm.elements.displayName.value.trim().replace(/[\u0000-\u001f\u007f]/g, '');
        if (name) nameDialog.close(name); else nameForm.elements.displayName.focus();
      };
      nameForm.addEventListener('submit', submit);
      nameDialog.addEventListener('close', () => {
        nameForm.removeEventListener('submit', submit); resolve(nameDialog.returnValue || null);
      }, { once: true }); nameDialog.showModal();
    });
  }

  let widget = null, scriptPromise = null, challengeWait = null;
  function finishChallenge(error, token) {
    if (!challengeWait) return;
    const waiting = challengeWait; challengeWait = null; clearTimeout(waiting.timer);
    if (error) waiting.reject(new Error(error)); else waiting.resolve(token);
  }
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.async = true;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      const timer = setTimeout(() => { script.remove(); reject(new Error('Verification couldn’t load. Your draft is still here.')); }, 15000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Verification couldn’t load. Please try again.')); };
      document.head.append(script);
    }).catch(error => { scriptPromise = null; throw error; });
    return scriptPromise;
  }
  async function verifyVisitor() {
    await loadTurnstile();
    return new Promise((resolve, reject) => {
      challengeWait = { resolve, reject, timer: setTimeout(() => finishChallenge('Verification timed out. Your draft is still here; please try again.'), 90000) };
      try {
        if (widget === null) widget = window.turnstile.render(challengeNode, {
          sitekey: config.turnstileSiteKey, action: 'comment', execution: 'execute', appearance: 'interaction-only',
          theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', size: 'flexible',
          callback: token => finishChallenge(null, token),
          'error-callback': () => { finishChallenge('Verification failed. Please try again.'); return true; },
          'expired-callback': () => finishChallenge('Verification expired. Please try again.'),
          'timeout-callback': () => finishChallenge('Verification timed out. Please try again.'),
        });
        else window.turnstile.reset(widget);
        window.turnstile.execute(widget);
      } catch (_) { finishChallenge('Verification couldn’t start. Your draft is still here; please try again.'); }
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const body = text.value.trim();
    if (posting || loading || !connected || !body) return;
    posting = true; buttons();
    try {
      if (!identity) {
        const displayName = await askName(); if (!displayName) return;
        const token = [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, '0')).join('');
        identity = { service, token, displayName, confirmed: false }; remember();
      }
      status.textContent = 'Verifying…';
      const turnstileToken = await verifyVisitor();
      if (!pending || pending.body !== body || pending.token !== identity.token) pending = { body, token: identity.token, id: crypto.randomUUID() };
      status.textContent = 'Posting…';
      const data = await api('/comments', 'POST', { page: config.sectionId, body, displayName: identity.displayName,
        requestId: pending.id, turnstileToken, website: form.elements.website.value }, identity.token);
      if (!validComment(data.comment)) throw new Error('Couldn’t confirm your comment. Your draft is still here; please try again.');
      identity.displayName = data.comment.displayName; identity.confirmed = true; remember();
      comments.set(data.comment.id, data.comment); render(); text.value = ''; pending = null; status.textContent = 'Your comment is posted.';
    } catch (error) { fail(error); }
    finally { posting = false; buttons(); }
  });

  section.querySelectorAll('[data-dialog-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  const identityDialog = section.querySelector('[data-identity-dialog]');
  const identityForm = section.querySelector('[data-identity-form]');
  const identityStatus = section.querySelector('[data-identity-status]');
  const fileInput = document.getElementById('identity-file');
  const passphrase = document.getElementById('identity-passphrase');
  let mode = 'save';
  function openIdentity(value) {
    mode = value; identityForm.reset(); identityStatus.textContent = '';
    section.querySelector('[data-identity-file-field]').hidden = mode !== 'restore'; fileInput.required = mode === 'restore';
    passphrase.autocomplete = mode === 'save' ? 'new-password' : 'current-password';
    section.querySelector('[data-identity-confirm]').textContent = mode === 'save' ? 'Save identity' : 'Restore identity';
    section.querySelector('[data-identity-help]').textContent = mode === 'save'
      ? 'Use at least 12 characters. You’ll need this passphrase to restore the file.' : 'Enter the passphrase you chose when saving this file.';
    identityDialog.showModal();
  }
  section.querySelector('[data-identity-save]').addEventListener('click', () => openIdentity('save'));
  section.querySelector('[data-identity-restore]').addEventListener('click', () => openIdentity('restore'));
  const encode = bytes => btoa(String.fromCharCode(...bytes));
  const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  async function keyFor(password, salt) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: 210000, salt }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  identityForm.addEventListener('submit', async event => {
    event.preventDefault(); const button = section.querySelector('[data-identity-confirm]');
    if (button.disabled) return; button.disabled = true; identityStatus.textContent = 'Working…';
    try {
      if (mode === 'save') {
        if (!identity?.confirmed) throw new Error('Post a comment before saving your identity.');
        const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
        const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(passphrase.value, salt), new TextEncoder().encode(JSON.stringify(identity)));
        const blob = new Blob([JSON.stringify({ version: 2, salt: encode(salt), iv: encode(iv), cipher: encode(new Uint8Array(cipher)) })], { type: 'application/json' });
        const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'portfolio-comment-identity.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); identityStatus.textContent = 'Identity saved. Keep the file and passphrase private.';
      } else {
        const file = fileInput.files[0]; if (!file || file.size > 16384) throw new Error('Choose a saved identity file.');
        const data = JSON.parse(await file.text()); if (data.version !== 2) throw new Error('This identity file isn’t supported.');
        const salt = decode(data.salt), iv = decode(data.iv); if (salt.length !== 16 || iv.length !== 12) throw new Error('This identity file isn’t valid.');
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await keyFor(passphrase.value, salt), decode(data.cipher));
        const restored = JSON.parse(new TextDecoder().decode(plain));
        if (!identities.valid(restored, service)) throw new Error('This identity belongs to a different comment service.');
        const verified = await api('/identity', 'GET', undefined, restored.token);
        if (typeof verified.identity?.displayName !== 'string' || !verified.identity.displayName.trim() || verified.identity.displayName.length > 40) throw new Error('This commenting identity could not be verified.');
        restored.displayName = verified.identity.displayName; restored.confirmed = true;
        identity = restored; pending = null; remember(); identityDialog.close(); status.textContent = 'Your commenting identity is restored.';
      }
    } catch (error) {
      identityStatus.textContent = error.name === 'OperationError' ? 'The passphrase is incorrect, or the file is damaged.'
        : error instanceof SyntaxError ? 'Choose a valid identity file.' : error.message;
    } finally { button.disabled = false; passphrase.value = ''; }
  });
})();
