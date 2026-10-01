import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleRequest } from './worker.mjs';

const origin = 'https://j-stoerk.github.io';
const payload = () => ({ name: 'Ada', email: 'ada@example.org', message: 'A question about electrode measurements.', website: '', token: 'test-token' });
const env = () => ({ SITE_ORIGIN: origin, RESEND_API_KEY: 'test-email-key', TURNSTILE_SECRET_KEY: 'test-challenge-key',
  CONTACT_FROM: 'Portfolio <contact@example.org>', CONTACT_TO: 'julius.stoerk@gmail.com', CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) } });
const request = (data = payload(), options = {}) => new Request('https://contact.example.org/message', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...options.headers },
  body: JSON.stringify(data), ...options,
});
function provider({ challenge = {}, emailStatus = 200, emailBody = { id: 'email-123' } } = {}) {
  const calls = [];
  return { calls, send: async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return url.includes('siteverify')
      ? Response.json({ success: true, action: 'contact', hostname: 'j-stoerk.github.io', ...challenge })
      : Response.json(emailBody, { status: emailStatus });
  } };
}
test('sends plain text only to the fixed inbox and sets the visitor as reply-to', async () => {
  const p = provider(), data = { ...payload(), to: 'other@example.org', from: 'spoof@example.org', message: '<script>hello</script> is plain text here.' };
  const response = await handleRequest(request(data), env(), p.send);
  assert.equal(response.status, 200); assert.equal((await response.json()).ok, true);
  const mail = p.calls[1].body;
  assert.deepEqual(mail.to, ['julius.stoerk@gmail.com']); assert.equal(mail.from, env().CONTACT_FROM);
  assert.equal(mail.reply_to, 'ada@example.org'); assert.ok(mail.text.includes(data.message)); assert.equal(mail.html, undefined);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
});
test('rejects other origins and unsupported methods without reaching a provider', async () => {
  const p = provider();
  for (const r of [new Request('https://contact.example.org/message', { method: 'POST', headers: { Origin: 'https://other.example.org' } }),
    new Request('https://contact.example.org/message', { headers: { Origin: origin } })]) {
    const response = await handleRequest(r, env(), p.send); assert.ok([403,405].includes(response.status));
  }
  assert.equal(p.calls.length, 0);
});
test('CORS preflight works without configured private credentials', async () => {
  const r = new Request('https://contact.example.org/message', { method: 'OPTIONS', headers: { Origin: origin } });
  const response = await handleRequest(r, {}); assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
});
test('missing setup fails closed', async () => {
  const p = provider(); assert.equal((await handleRequest(request(), {}, p.send)).status, 503); assert.equal(p.calls.length, 0);
});
test('rejects malformed, oversized, injected, and honeypot submissions', async () => {
  const p = provider();
  for (const change of [{ name: 'Ada\r\nBcc: other@example.org' }, { email: 'bad@example.org\n' + 'Bcc:other@example.org' },
    { website: 'https://spam.example.org' }, { message: 'x'.repeat(6001) }, { message: 'short' }, { token: '' }, { name: '' }]) {
    assert.equal((await handleRequest(request({ ...payload(), ...change }), env(), p.send)).status, 400);
  }
  assert.equal((await handleRequest(request({ ...payload(), message: '🔋'.repeat(5000) }), env(), p.send)).status, 413);
  assert.equal((await handleRequest(request(null), env(), p.send)).status, 400);
  assert.equal(p.calls.length, 0);
});
test('rate limit stops verification and email', async () => {
  const p = provider(), settings = env(); settings.CONTACT_RATE_LIMITER.limit = async () => ({ success: false });
  assert.equal((await handleRequest(request(), settings, p.send)).status, 429); assert.equal(p.calls.length, 0);
});
test('checks challenge validity, hostname, and action on the server', async () => {
  for (const challenge of [{ success: false }, { hostname: 'other.example.org' }, { action: 'login' }]) {
    const p = provider({ challenge }); assert.equal((await handleRequest(request(), env(), p.send)).status, 400);
    assert.equal(p.calls.length, 1);
  }
});
test('provider errors and missing receipt cannot become a success or expose credentials', async () => {
  for (const options of [{ emailStatus: 403, emailBody: { message: 'test-email-key: account error' } }, { emailBody: {} }]) {
    const p = provider(options), response = await handleRequest(request(), env(), p.send);
    assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('test-email-key'));
  }
  const response = await handleRequest(request(), env(), async () => { throw new Error('test-email-key'); });
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('test-email-key'));
});
test('Cloudflare entry point ignores its execution context as a fetch dependency', async () => {
  const p = provider(), original = globalThis.fetch;
  globalThis.fetch = p.send;
  try { assert.equal((await worker.fetch(request(), env(), { waitUntil() {} })).status, 200); }
  finally { globalThis.fetch = original; }
});
