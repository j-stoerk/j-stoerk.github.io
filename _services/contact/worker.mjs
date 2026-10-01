/* Deployed separately from GitHub Pages. All email credentials are Worker secrets. */
const MAX_BODY_BYTES = 16384;
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const EMAIL_URL = 'https://api.resend.com/emails';

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function handleRequest(request, env, send = fetch) {
  const origin = request.headers.get('Origin');
  const allowed = env.SITE_ORIGIN || 'https://j-stoerk.github.io';
  const headers = {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff',
  };
  if (origin === allowed) {
    headers['Access-Control-Allow-Origin'] = allowed;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  const reply = (status, message, ok = false) => new Response(JSON.stringify({ ok, message }), { status, headers });
  if (new URL(request.url).pathname !== '/message') return reply(404, 'Not found.');
  if (origin !== allowed) return reply(403, 'This form can only be sent from the portfolio.');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, 'Use the message form to send a message.');
  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.CONTACT_FROM || !env.CONTACT_TO || !env.CONTACT_RATE_LIMITER) {
    return reply(503, 'The message form isn’t connected yet. Please email me directly.');
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return reply(415, 'Send a valid message.');
  let data;
  try { data = await readBody(request); }
  catch (error) { return reply(error.message === 'large' ? 413 : 400, 'The message is invalid or too long.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(400, 'Send a valid message.');
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)
    || email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)
    || message.length < 10 || message.length > 6000 || /\u0000/.test(message)
    || typeof data.token !== 'string' || !data.token || data.token.length > 2048
    || typeof data.website !== 'string' || data.website !== '') {
    return reply(400, 'Please check your name, email, and message, then try again.');
  }
  try {
    // A coarse anonymous limit complements Turnstile; no IP or message is logged/stored.
    const limited = await env.CONTACT_RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'anonymous' });
    if (!limited.success) return reply(429, 'Please wait a minute before sending another message.');
    const verification = await send(VERIFY_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: data.token, remoteip: request.headers.get('CF-Connecting-IP') || undefined }),
    });
    if (!verification.ok) return reply(503, 'Verification is temporarily unavailable. Please try again.');
    const result = await verification.json();
    if (result.success !== true || result.action !== 'contact' || result.hostname !== new URL(allowed).hostname) {
      return reply(400, 'Verification expired or failed. Please try again.');
    }
    // Recipient and sender are fixed server-side; visitors cannot turn this into a mail relay.
    const delivery = await send(EMAIL_URL, {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: email,
        subject: 'Message from the portfolio', text: `From: ${name}\nReply to: ${email}\n\n${message}` }),
    });
    const receipt = await delivery.json();
    if (!delivery.ok || typeof receipt.id !== 'string' || !receipt.id) return reply(503, 'The message couldn’t be sent. Please try again or email me directly.');
    return reply(200, 'Your message is sent.', true);
  } catch (_) {
    // Do not expose provider errors, keys, or user messages in responses/logs.
    return reply(503, 'The message couldn’t be sent. Please try again or email me directly.');
  }
}

export default { fetch(request, env) { return handleRequest(request, env); } };
