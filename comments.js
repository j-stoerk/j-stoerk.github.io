/* A small Cactus-compatible Matrix frontend. No account is needed to post;
   guest credentials stay in this browser, and names are actual Matrix profiles. */
(function () {
  'use strict';
  const section = document.querySelector('[data-comments]');
  if (!section) return;
  const config = JSON.parse(document.getElementById('comments-config').textContent);
  const form = section.querySelector('[data-comment-form]');
  const text = form.elements.comment;
  const post = form.querySelector('[type="submit"]');
  const status = section.querySelector('[data-comments-status]');
  if (!config.siteName || !config.homeserverUrl || !config.serverName) return;

  const server = config.homeserverUrl.replace(/\/$/, '');
  const storageKey = 'portfolio-comment-identity:' + server;
  const list = section.querySelector('[data-comments-list]');
  const more = section.querySelector('[data-comments-more]');
  const refreshButton = section.querySelector('[data-comments-refresh]');
  const identityLabel = section.querySelector('[data-comment-identity]');
  const tools = section.querySelector('[data-identity-tools]');
  let session = null, sessionPromise = null, roomId = null, cursor = null;
  let loading = false, posting = false, pending = null;
  const events = new Map(), members = new Map();

  function validIdentity(value) {
    return value && value.homeserver === server && typeof value.accessToken === 'string'
      && value.accessToken.length > 0 && value.accessToken.length < 4096
      && typeof value.userId === 'string' && /^@[^\s:]+:.+$/.test(value.userId)
      && typeof value.displayName === 'string' && value.displayName.length <= 48;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (validIdentity(saved)) session = saved;
  } catch (_) { /* Storage can be unavailable; the current tab still works. */ }

  function remember() {
    try { localStorage.setItem(storageKey, JSON.stringify(session)); } catch (_) { }
    identityLabel.textContent = session?.displayName ? 'Posting as ' + session.displayName : '';
    identityLabel.hidden = !session?.displayName;
    tools.hidden = false;
    section.querySelector('[data-identity-save]').disabled = !session?.displayName;
  }
  remember();
  refreshButton.hidden = false;
  post.disabled = false;

  async function api(path, method = 'GET', body, token) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(server + '/_matrix/client/v3' + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) {
      if (data.errcode === 'M_UNKNOWN_TOKEN' && token === session?.accessToken) {
        session = null; sessionPromise = null; pending = null;
        try { localStorage.removeItem(storageKey); } catch (_) { }
        remember();
      }
      const error = new Error(data.errcode === 'M_LIMIT_EXCEEDED'
        ? 'Please wait a moment before trying again.'
        : data.errcode === 'M_UNKNOWN_TOKEN' ? 'Your commenting session expired. Please try again.'
          : 'Comments are temporarily unavailable. Your draft is still here.');
      error.code = data.errcode;
      throw error;
    }
    return data;
  }
  async function getSession() {
    if (session) return session;
    if (!sessionPromise) sessionPromise = api('/register?kind=guest', 'POST', {}).then(data => {
      const created = { homeserver: server, accessToken: data.access_token, userId: data.user_id, displayName: '' };
      if (!validIdentity(created)) throw new Error('Couldn’t create a commenting identity. Please try again.');
      session = created; remember(); return session;
    }).finally(() => { sessionPromise = null; });
    return sessionPromise;
  }
  async function getRoom() {
    if (!roomId) {
      const alias = '#comments_' + config.siteName + '_' + config.sectionId + ':' + config.serverName;
      const data = await api('/directory/room/' + encodeURIComponent(alias));
      if (typeof data.room_id !== 'string') throw new Error('Couldn’t load the discussion.');
      roomId = data.room_id;
    }
    return roomId;
  }
  function message(error) {
    status.textContent = error instanceof TypeError || error.name === 'TimeoutError'
      ? 'Couldn’t connect to the discussion. Your draft is still here; please try again.' : error.message;
  }
  function absorb(batch) {
    for (const event of batch || []) {
      if (event.type === 'm.room.member') members.set(event.state_key, event.content?.displayname);
      if (event.event_id) events.set(event.event_id, event);
    }
  }
  function render() {
    const fragment = document.createDocumentFragment();
    const ordered = [...events.values()].sort((a, b) => a.origin_server_ts - b.origin_server_ts);
    const edits = new Map();
    for (const event of ordered) {
      const relation = event.content?.['m.relates_to'];
      const original = events.get(relation?.event_id);
      if (relation?.rel_type === 'm.replace' && original?.sender === event.sender && !event.unsigned?.redacted_because) {
        edits.set(relation.event_id, event.content['m.new_content']);
      }
    }
    let count = 0;
    for (const event of ordered) {
      const content = edits.get(event.event_id) || event.content;
      if (event.type !== 'm.room.message' || event.unsigned?.redacted_because
        || event.content?.['m.relates_to']?.rel_type === 'm.replace'
        || content?.msgtype !== 'm.text' || typeof content.body !== 'string') continue;
      const article = document.createElement('article');
      article.className = 'comment-entry';
      const head = document.createElement('div'); head.className = 'comment-meta';
      const name = document.createElement('strong');
      name.textContent = members.get(event.sender) || (event.sender === session?.userId && session.displayName) || event.sender;
      name.title = event.sender;
      const time = document.createElement('time');
      const date = new Date(event.origin_server_ts);
      if (!Number.isNaN(date.getTime())) {
        time.dateTime = date.toISOString();
        time.textContent = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      }
      const body = document.createElement('p'); body.className = 'comment-body';
      // Never render Matrix formatted_body as HTML; comments are untrusted content.
      body.textContent = content.body;
      head.append(name, time); article.append(head, body); fragment.append(article); count++;
    }
    list.replaceChildren(fragment);
    status.textContent = count ? '' : 'No comments yet. Start the conversation.';
  }
  async function load(older = false) {
    if (loading || posting) return;
    loading = true; more.disabled = true; refreshButton.disabled = true; post.disabled = true;
    status.textContent = 'Loading comments…';
    try {
      const id = await getRoom(), identity = await getSession();
      const query = new URLSearchParams({ dir: 'b', limit: '30' });
      if (older && cursor) query.set('from', cursor);
      const data = await api('/rooms/' + encodeURIComponent(id) + '/messages?' + query, 'GET', undefined, identity.accessToken);
      if (!older) { events.clear(); members.clear(); }
      absorb(data.state); absorb(data.chunk);
      const previous = cursor; cursor = data.end;
      more.hidden = !cursor || !data.chunk?.length || (older && cursor === previous);
      // Member state is authoritative for names, including after redactions/renames.
      const names = await api('/rooms/' + encodeURIComponent(id) + '/members?membership=join', 'GET', undefined, identity.accessToken);
      absorb(names.chunk); render();
    } catch (error) { message(error); }
    finally { loading = false; more.disabled = posting; refreshButton.disabled = posting; post.disabled = posting; }
  }
  refreshButton.addEventListener('click', () => load());
  more.addEventListener('click', () => load(true));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: '300px' });
    observer.observe(section);
  } else load();

  const nameDialog = section.querySelector('[data-comment-name-dialog]');
  const nameForm = section.querySelector('[data-comment-name-form]');
  function askName() {
    return new Promise(resolve => {
      nameForm.reset(); nameDialog.returnValue = '';
      const submitted = event => {
        event.preventDefault();
        const name = nameForm.elements.displayName.value.trim().replace(/[\u0000-\u001f\u007f]/g, '');
        if (!name) { nameForm.elements.displayName.focus(); return; }
        nameDialog.close(name);
      };
      nameForm.addEventListener('submit', submitted);
      nameDialog.addEventListener('close', () => {
        nameForm.removeEventListener('submit', submitted); resolve(nameDialog.returnValue || null);
      }, { once: true });
      nameDialog.showModal();
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const body = text.value.trim();
    if (posting || loading || !body) return;
    posting = true; post.disabled = true; refreshButton.disabled = true; more.disabled = true;
    try {
      let chosen = session?.displayName;
      if (!chosen) chosen = await askName();
      if (!chosen) return;
      const identity = await getSession();
      if (!identity.displayName) {
        await api('/profile/' + encodeURIComponent(identity.userId) + '/displayname', 'PUT', { displayname: chosen }, identity.accessToken);
        identity.displayName = chosen; remember();
      }
      status.textContent = 'Posting…';
      const id = await getRoom();
      await api('/rooms/' + encodeURIComponent(id) + '/join', 'POST', {}, identity.accessToken);
      // Reuse the transaction ID after an uncertain network failure to avoid duplicates.
      if (!pending || pending.body !== body || pending.user !== identity.userId) pending = { body, user: identity.userId, id: crypto.randomUUID() };
      const sent = await api('/rooms/' + encodeURIComponent(id) + '/send/m.room.message/' + pending.id, 'PUT', { msgtype: 'm.text', body }, identity.accessToken);
      if (typeof sent.event_id !== 'string' || !sent.event_id) throw new Error('Couldn’t confirm your comment. Your draft is still here; please try again.');
      members.set(identity.userId, chosen);
      absorb([{ type: 'm.room.message', sender: identity.userId, event_id: sent.event_id, origin_server_ts: Date.now(), content: { msgtype: 'm.text', body } }]);
      text.value = ''; pending = null; render(); status.textContent = 'Your comment is posted.';
    } catch (error) { message(error); }
    finally { posting = false; post.disabled = loading; refreshButton.disabled = loading; more.disabled = loading; }
  });

  section.querySelectorAll('[data-dialog-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  const identityDialog = section.querySelector('[data-identity-dialog]');
  const identityForm = section.querySelector('[data-identity-form]');
  const identityStatus = section.querySelector('[data-identity-status]');
  const fileInput = document.getElementById('identity-file');
  const passphrase = document.getElementById('identity-passphrase');
  let identityMode = 'save';
  function openIdentity(mode) {
    identityMode = mode; identityForm.reset(); identityStatus.textContent = '';
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
    event.preventDefault();
    const button = section.querySelector('[data-identity-confirm]');
    if (button.disabled) return;
    button.disabled = true; identityStatus.textContent = 'Working…';
    try {
      if (identityMode === 'save') {
        if (!session?.displayName) throw new Error('Post a comment before saving your identity.');
        const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await keyFor(passphrase.value, salt);
        const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(session)));
        const file = new Blob([JSON.stringify({ version: 1, salt: encode(salt), iv: encode(iv), cipher: encode(new Uint8Array(cipher)) })], { type: 'application/json' });
        const url = URL.createObjectURL(file), link = document.createElement('a');
        link.href = url; link.download = 'portfolio-comment-identity.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        identityStatus.textContent = 'Identity saved. Keep the file and passphrase private.';
      } else {
        const file = fileInput.files[0];
        if (!file || file.size > 16384) throw new Error('Choose a saved identity file.');
        const data = JSON.parse(await file.text());
        if (data.version !== 1) throw new Error('This identity file isn’t supported.');
        const salt = decode(data.salt), iv = decode(data.iv);
        if (salt.length !== 16 || iv.length !== 12) throw new Error('This identity file isn’t valid.');
        const key = await keyFor(passphrase.value, salt);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, decode(data.cipher));
        const restored = JSON.parse(new TextDecoder().decode(plain));
        if (!validIdentity(restored)) throw new Error('This identity belongs to a different comment server.');
        const who = await api('/account/whoami', 'GET', undefined, restored.accessToken);
        if (who.user_id !== restored.userId) throw new Error('This identity could not be verified.');
        const profile = await api('/profile/' + encodeURIComponent(who.user_id) + '/displayname');
        restored.displayName = (profile.displayname || '').slice(0, 48);
        session = restored; pending = null; remember();
        identityDialog.close(); status.textContent = 'Your commenting identity is restored.';
      }
    } catch (error) {
      identityStatus.textContent = error.name === 'OperationError' ? 'The passphrase is incorrect, or the file is damaged.' : error instanceof SyntaxError ? 'Choose a valid identity file.' : error.message;
    } finally { button.disabled = false; passphrase.value = ''; }
  });
})();
