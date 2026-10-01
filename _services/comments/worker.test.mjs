import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker, { handleRequest } from './worker.mjs';
import { allowedPages } from './allowed-pages.mjs';

const origin = 'https://j-stoerk.github.io';
const endpoint = 'https://rapid-fog-462d.julius-stoerk.workers.dev';
const page = 'post-geometry-of-forgetting', otherPage = 'post-calendering-u-shape';
const token = 'a'.repeat(64);
const adapter = fileURLToPath(new URL('./test-sqlite.py', import.meta.url));
const schema = readFileSync(new URL('./migrations/0001_comments.sql', import.meta.url), 'utf8');

function database(t, existing = false) {
  const directory = mkdtempSync(join(tmpdir(), 'portfolio-d1-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'comments.sqlite');
  function execute(payload) {
    const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [adapter, path], {
      input: JSON.stringify(payload), encoding: 'utf8', windowsHide: true,
    });
    if (result.status !== 0) throw new Error(result.stderr || String(result.error));
    return JSON.parse(result.stdout);
  }
  if (existing) execute({ schema: `CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, page TEXT NOT NULL, visitor_id TEXT NOT NULL,
    username TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO comments (page, visitor_id, username, message)
    VALUES ('${page}', 'old-visitor', 'Earlier visitor', 'Keep this comment');` });
  execute({ schema });
  return {
    prepare(sql) {
      return {
        sql, params: [],
        bind(...params) { return { ...this, params }; },
        async all() { return execute({ statements: [this] })[0]; },
        async run() { return this.all(); },
        async first() { return (await this.all()).results[0] || null; },
      };
    },
    async batch(statements) { return execute({ statements }); },
  };
}
function setup(t) {
  const env = { DB: database(t), SITE_ORIGIN: origin, TURNSTILE_SECRET_KEY: 'test-private-secret' };
  const calls = [];
  let verdict = { success: true, hostname: 'j-stoerk.github.io', action: 'comment' };
  const send = async (url, options) => {
    calls.push({ url, payload: JSON.parse(options.body) });
    return Response.json(verdict);
  };
  const request = (method, path, body, options = {}) => new Request(endpoint + path, {
    method, headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1',
      ...(method === 'POST' ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } : {}),
      ...options.headers },
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const call = async (method, path, body, options) => {
    const response = await handleRequest(request(method, path, body, options), env, send);
    return { status: response.status, headers: response.headers, data: response.status === 204 ? null : await response.json() };
  };
  const payload = (overrides = {}) => ({ page, displayName: 'Ada', body: 'Useful result!', requestId: crypto.randomUUID(), turnstileToken: 'test-challenge', website: '', ...overrides });
  return { env, calls, request, call, payload, verdict: value => { verdict = value; } };
}

test('first post stores only a hashed credential; names and bodies stay literal', async t => {
  const s = setup(t), name = "Ada'); DROP TABLE comments; --", body = '<img src=x onerror=alert(1)>';
  const posted = await s.call('POST', '/comments', s.payload({ displayName: name, body }));
  assert.equal(posted.status, 201);
  assert.equal(posted.data.comment.displayName, name);
  assert.equal(posted.data.comment.body, body);
  const identity = await s.env.DB.prepare('SELECT * FROM identities').first();
  assert.match(identity.token_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(identity.token_hash, token);
  assert.equal(identity.id, identity.token_hash.slice(0, 32));
  const listing = await s.call('GET', '/comments?page=' + page);
  assert.equal(listing.data.comments.length, 1);
  assert.equal(listing.data.nextCursor, null);
  assert.deepEqual(Object.keys(listing.data.comments[0]).sort(), ['authorId', 'body', 'createdAt', 'displayName', 'id', 'page']);
  assert.ok(!JSON.stringify(listing.data).includes(identity.token_hash));
  assert.equal(listing.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(s.calls[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(s.calls[0].payload.secret, s.env.TURNSTILE_SECRET_KEY);
  const second = await s.call('POST', '/comments', s.payload({ page: otherPage, displayName: 'Imposter' }));
  assert.equal(second.data.comment.displayName, name);
  assert.equal((await s.call('GET', '/comments?page=' + page)).data.comments.length, 1);
  const restored = await s.call('GET', '/identity', undefined, { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(restored.data.identity.displayName, name);
  assert.equal((await s.call('GET', '/identity')).status, 401);
  assert.equal((await s.call('GET', '/identity', undefined, { headers: { Authorization: 'Bearer ' + 'b'.repeat(64) } })).status, 401);
});

test('retry is idempotent, conflicting payloads cannot overwrite or resurrect moderation', async t => {
  const s = setup(t), payload = s.payload();
  const first = await s.call('POST', '/comments', payload);
  const retry = await s.call('POST', '/comments', payload);
  assert.equal(retry.status, 200);
  assert.deepEqual(retry.data.comment, first.data.comment);
  assert.equal(s.calls.length, 1);
  assert.equal((await s.call('POST', '/comments', { ...payload, body: 'Changed' })).status, 409);
  await s.env.DB.prepare('UPDATE comments SET hidden = 1 WHERE id = ?').bind(first.data.comment.id).run();
  assert.equal((await s.call('GET', '/comments?page=' + page)).data.comments.length, 0);
  assert.equal((await s.call('POST', '/comments', payload)).status, 410);
  await s.env.DB.prepare('UPDATE identities SET banned = 1').run();
  assert.equal((await s.call('POST', '/comments', s.payload())).status, 403);
  assert.equal((await s.call('GET', '/identity', undefined, { headers: { Authorization: 'Bearer ' + token } })).status, 403);
  assert.equal((await s.env.DB.prepare('SELECT COUNT(*) AS n FROM comments').first()).n, 1);
});

test('pagination isolates threads and stays stable when new comments arrive', async t => {
  const s = setup(t);
  await s.call('POST', '/comments', s.payload());
  const identity = await s.env.DB.prepare('SELECT id FROM identities').first();
  await s.env.DB.batch(Array.from({ length: 35 }, (_, i) => s.env.DB.prepare(
    'INSERT INTO comments (page, visitor_id, username, message, created_at, request_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(page, identity.id, 'Ada', 'Comment ' + i, new Date().toISOString(), crypto.randomUUID())));
  const latest = await s.call('GET', '/comments?page=' + page);
  assert.equal(latest.data.comments.length, 30);
  assert.equal(latest.data.nextCursor, 7);
  await s.call('POST', '/comments', s.payload());
  const older = await s.call('GET', '/comments?page=' + page + '&cursor=' + latest.data.nextCursor);
  assert.deepEqual(older.data.comments.map(c => c.id), [6, 5, 4, 3, 2, 1]);
  assert.equal(older.data.nextCursor, null);
  assert.equal((await s.call('GET', '/comments?page=' + otherPage)).data.comments.length, 0);
  for (const cursor of ['0', '-1', '1.5', '9007199254740992', 'abc']) {
    assert.equal((await s.call('GET', '/comments?page=' + page + '&cursor=' + cursor)).status, 400);
  }
});

test('Turnstile requires success, exact hostname and action before any identity or comment is written', async t => {
  const s = setup(t);
  for (const verdict of [
    { success: false },
    { success: true, hostname: 'attacker.example', action: 'comment' },
    { success: true, hostname: 'j-stoerk.github.io', action: 'contact' },
  ]) {
    s.verdict(verdict);
    assert.equal((await s.call('POST', '/comments', s.payload())).status, 400);
  }
  assert.equal((await s.env.DB.prepare('SELECT COUNT(*) AS n FROM identities').first()).n, 0);
  assert.equal((await s.env.DB.prepare('SELECT COUNT(*) AS n FROM comments').first()).n, 0);
  const response = await handleRequest(s.request('POST', '/comments', s.payload()), s.env, async () => new Response('', { status: 502 }));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes(s.env.TURNSTILE_SECRET_KEY));
});

test('origin, method, page, identity and payload boundaries fail before verification', async t => {
  const s = setup(t);
  assert.equal((await s.call('OPTIONS', '/comments')).status, 204);
  assert.equal((await s.call('POST', '/comments', s.payload(), { headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await s.call('PUT', '/comments')).status, 405);
  assert.equal((await s.call('GET', '/unknown')).status, 404);
  assert.equal((await s.call('GET', '/comments?page=arbitrary-room')).status, 400);
  const invalid = [
    { value: s.payload(), status: 415, headers: { 'Content-Type': 'text/plain' } },
    { value: 'not json', status: 400 },
    { value: 'x'.repeat(32769), status: 413 },
    { value: s.payload(), status: 401, headers: { Authorization: '' } },
    { value: s.payload({ website: 'spam.example' }), status: 400 },
    { value: s.payload({ displayName: 'bad\nname' }), status: 400 },
    { value: s.payload({ body: 'x'.repeat(5001) }), status: 400 },
    { value: s.payload({ requestId: [crypto.randomUUID()] }), status: 400 },
    { value: s.payload({ turnstileToken: '' }), status: 400 },
    { value: s.payload({ page: 'arbitrary-room' }), status: 400 },
  ];
  for (let i = 0; i < invalid.length; i++) {
    const item = invalid[i];
    const response = await s.call('POST', '/comments', item.value, { headers: { ...item.headers, 'CF-Connecting-IP': '192.0.2.' + (i + 10) } });
    assert.equal(response.status, item.status);
  }
  assert.equal(s.calls.length, 0);
  assert.equal((await handleRequest(s.request('GET', '/comments?page=' + page), { DB: s.env.DB })).status, 503);
  assert.equal((await handleRequest(s.request('GET', '/comments?page=' + page), {})).status, 503);
});

test('persistent atomic rate limits survive request handling and reset in the next minute', async t => {
  let now = 1790859600000;
  t.mock.method(Date, 'now', () => now);
  const s = setup(t);
  for (let i = 0; i < 5; i++) assert.equal((await s.call('POST', '/comments', s.payload())).status, 201);
  assert.equal((await s.call('POST', '/comments', s.payload())).status, 429);
  assert.equal(s.calls.length, 5);
  assert.equal((await s.call('GET', '/comments?page=' + page)).status, 200);
  await s.env.DB.prepare("UPDATE rate_limits SET used = 59 WHERE key LIKE 'GET:%'").run();
  assert.equal((await s.call('GET', '/comments?page=' + page)).status, 200);
  assert.equal((await s.call('GET', '/comments?page=' + page)).status, 429);
  const limits = await s.env.DB.prepare('SELECT * FROM rate_limits').all();
  assert.equal(limits.results.length, 2);
  assert.ok(!JSON.stringify(limits).includes('192.0.2.1'));
  now += 60000;
  assert.equal((await s.call('POST', '/comments', s.payload())).status, 201);
  assert.equal((await s.call('GET', '/comments?page=' + page)).status, 200);
});

test('migration preserves the existing user-created table and its comments', async t => {
  const s = setup(t);
  s.env.DB = database(t, true);
  const listing = await s.call('GET', '/comments?page=' + page);
  assert.equal(listing.status, 200);
  assert.equal(listing.data.comments[0].body, 'Keep this comment');
  assert.equal(listing.data.comments[0].displayName, 'Earlier visitor');
  assert.ok(Number.isFinite(listing.data.comments[0].createdAt));
  assert.equal((await s.call('POST', '/comments', s.payload())).status, 201);
  assert.equal((await s.env.DB.prepare('SELECT COUNT(*) AS n FROM comments').first()).n, 2);
});

test('failed database transactions cannot leave a half-created identity', async t => {
  const s = setup(t), original = s.env.DB.batch.bind(s.env.DB);
  s.env.DB.batch = statements => original([...statements, s.env.DB.prepare('INSERT INTO nonexistent_table VALUES (1)')]);
  const response = await s.call('POST', '/comments', s.payload());
  assert.equal(response.status, 503);
  assert.equal((await s.env.DB.prepare('SELECT COUNT(*) AS n FROM identities').first()).n, 0);
  assert.equal((await s.env.DB.prepare('SELECT COUNT(*) AS n FROM comments').first()).n, 0);
});

test('published-post allowlist and standalone dashboard code match the build sources', async () => {
  const posts = JSON.parse(readFileSync(new URL('../../_src/posts.json', import.meta.url), 'utf8'));
  assert.deepEqual([...allowedPages].sort(), posts.map(post => post.file.replace(/\.html$/, '')).sort());
  const source = readFileSync(new URL('./worker.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const standalone = readFileSync(new URL('./worker.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(standalone.endsWith(source.slice(source.indexOf('\n') + 1)));
  assert.ok(!standalone.includes("from './allowed-pages.mjs'"));
});

test('default Worker entrypoint accepts Cloudflare context without treating it as fetch', async t => {
  const s = setup(t), previous = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ success: true, hostname: 'j-stoerk.github.io', action: 'comment' });
  try {
    assert.equal((await worker.fetch(s.request('POST', '/comments', s.payload()), s.env, { waitUntil() {} })).status, 201);
  } finally { globalThis.fetch = previous; }
});
