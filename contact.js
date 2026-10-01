/* Private contact messages: browser -> Worker -> Resend -> Gmail.
   Only the public endpoint and Turnstile site key appear in this file/page. */
(function () {
  'use strict';
  const dialog = document.getElementById('contact-message');
  if (!dialog) return;
  const config = JSON.parse(document.getElementById('contact-config').textContent);
  const form = dialog.querySelector('[data-message-form]');
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector('[data-message-status]');
  const challenge = form.querySelector('[data-message-challenge]');
  const ready = /^https:\/\//.test(config.endpoint) && !!config.turnstileSiteKey;
  let token = '', widget = null, scriptPromise = null, busy = false;

  function loadChallenge() {
    if (window.turnstile) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      const timer = setTimeout(() => { script.remove(); reject(new Error('Verification couldn’t load. Please try again or email me directly.')); }, 15000);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Verification couldn’t load. Please try again or email me directly.')); };
      document.head.append(script);
    }).catch(error => { scriptPromise = null; throw error; });
    return scriptPromise;
  }
  async function open() {
    if (!dialog.open) dialog.showModal();
    if (!ready) return;
    try {
      await loadChallenge();
      if (widget === null) widget = window.turnstile.render(challenge, {
        sitekey: config.turnstileSiteKey, action: 'contact', theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', size: 'flexible',
        callback: value => { token = value; button.disabled = busy; },
        'expired-callback': () => { token = ''; button.disabled = true; },
        'error-callback': () => { token = ''; button.disabled = true; status.textContent = 'Verification couldn’t finish. Please try again or email me directly.'; },
      });
    } catch (error) { status.textContent = error.message; }
  }
  document.querySelectorAll('[data-open-message]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); open(); }));
  dialog.querySelector('[data-message-close]').addEventListener('click', () => dialog.close());
  if (ready) status.textContent = '';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || busy || !token || !form.reportValidity()) return;
    busy = true; button.disabled = true; status.textContent = 'Sending…';
    const data = new FormData(form);
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ name: data.get('name'), email: data.get('email'), message: data.get('message'), website: data.get('website'), token }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.message || 'The message couldn’t be sent. Please try again or email me directly.');
      form.reset();
      status.textContent = 'Your message is sent. Thank you—I’ll reply by email.';
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error instanceof TypeError
        ? 'The connection was interrupted. Your draft is still here. Please try again or email me directly.' : error.message;
    } finally {
      busy = false; token = ''; button.disabled = true;
      if (widget !== null) window.turnstile.reset(widget);
    }
  });
})();
