# Blog comments and private messages

Comments use `rapid-fog-462d.julius-stoerk.workers.dev` and the D1 database
`j-stoerk-comments`, bound to the Worker as `DB`. Private messages continue to use
Formspree. No custom domain is needed for either integration.

## Activate comments in the Cloudflare dashboard

The database and `DB` binding already exist. The initial `comments` table uses
`id`, `page`, `visitor_id`, `username`, `message`, and `created_at`.
The supplied prototype Worker can read/write that table, but the production
frontend also needs the upgrade below for Turnstile, identities, and safe retries.

1. Open **Storage & databases → D1 → j-stoerk-comments → Console**.
   Open [migrations/0001_comments.sql](comments/migrations/0001_comments.sql),
   copy its SQL text into the console's query editor, then select **Execute**.
   A [plain-text copy](https://raw.githubusercontent.com/j-stoerk/j-stoerk.github.io/main/_services/comments/migrations/0001_comments.sql)
   is also available. Paste the SQL itself, rather than the file's URL or GitHub
   page. Run it **once**, statement by statement if the console requires it. It keeps the
   original table and existing rows, adds `request_id` and `hidden`, and creates
   the `identities` and `rate_limits` tables and indexes. Do not drop the original
   table. Afterward, `PRAGMA table_info(comments);` should include the two new
   columns. This migration also works on a fresh database.
2. Open **Workers & Pages → rapid-fog-462d → Bindings**. Confirm the D1 binding
   has variable name **DB** and database **j-stoerk-comments**. These names are
   already correct in your setup. [Cloudflare's binding instructions](https://developers.cloudflare.com/d1/get-started/).
3. Open **Turnstile → Add widget**. Choose **Managed**, add hostname
   **j-stoerk.github.io** (without `https://` or a path), and create it.
   Copy both keys. The **site key is public** and goes into the website config;
   the **secret key stays in Cloudflare**.
   [Turnstile setup instructions](https://developers.cloudflare.com/turnstile/get-started/).
4. In the Worker's **Settings → Variables and Secrets**, add a **Secret** named
   **TURNSTILE_SECRET** containing the widget's secret key. The existing
   **TURNSTILE_SECRET_KEY** name also works; when both exist, `TURNSTILE_SECRET`
   takes precedence. Optionally add
   a text variable **SITE_ORIGIN** with `https://j-stoerk.github.io`; this is also
   the code's default. Save/deploy the settings. Do not put the secret in GitHub.
5. In the Worker's **Edit code**, replace the prototype with the entire generated
   [comments/worker.js](comments/worker.js), then **Deploy**. This single file
   needs no imports or npm dependencies. Use `rapid-fog-462d`, leaving the earlier
   contact Worker alone.
6. Open this read-only check:
   `https://rapid-fog-462d.julius-stoerk.workers.dev/comments?page=post-geometry-of-forgetting`.
   An empty working database returns:
   `{"ok":true,"comments":[],"nextCursor":null}`.
   A 503 means the secret, binding, or migration is missing or unavailable.
   The prototype's response lacks `nextCursor`, so it is not the upgraded API.
7. Set **comments.turnstileSiteKey** to the public widget site key in
   [_src/community.json](../_src/community.json). Keep the supplied endpoint.
   Rebuild and push the generated pages:

   ```powershell
   node _src/build.js
   node --test _services/comments/worker.test.mjs
   python _src/check.py
   ```

   You can send the public site key to the portfolio maintainer to complete this
   step. Comments are omitted while it is empty. If the prototype Worker is
   still deployed, the editor hides when its read response identifies the old
   API. Deploy the upgrade and reload the article to show the editor without
   another website config change. Posting stays disabled until a valid read
   succeeds. No unavailable placeholder appears for the prototype API.
8. In a private browser window, post a comment. The first Post asks only for a
   display name; Turnstile runs when posting and may request a verification click.
   Check the comment from another browser, then post on a different article in
   the first browser. It should remember the name without another name prompt.
   Refresh to confirm persistence. Hide the test comment with the SQL below.

This workspace has no Cloudflare login, so creating repository files does not
deploy them. The dashboard steps above finish the service-side setup.

### SQL console troubleshooting

If the D1 console says **"The request is malformed: Requests without any query
are not supported"**, check that the query editor contains SQL and that the
selection is not empty or only a comment. First paste and execute:

```sql
SELECT 1 AS connected;
```

It should return `connected = 1`. This read-only query does not change the
database. Then inspect the current schema:

```sql
PRAGMA table_info(comments);
SELECT name FROM sqlite_schema WHERE type IN ('table', 'index') ORDER BY name;
```

If an upgrade was partially applied, run only its missing statements. Do not
repeat the `ALTER TABLE` statements when `request_id` and `hidden` already exist.
Creating the `identities` and `rate_limits` tables twice also produces errors.
Keep the existing comments table. Cloudflare documents the paste-and-Execute
flow in its [D1 console guide](https://developers.cloudflare.com/d1/get-started/#run-a-query-against-your-d1-database).

## Behaviour and maintenance

The public API is `GET /comments?page=<post-slug>&cursor=<optional-id>` and
`POST /comments`. Responses contain canonical comment objects. `GET /identity`
verifies an identity when restoring it on another browser. Posting and restoring
use a random browser credential in `Authorization: Bearer …`; only its SHA-256
hash is stored in D1. Reading comments needs no identity or challenge. Display
names are chosen labels, not verified real-world identities.

The Worker checks the site's Origin, published-post allowlist, bounded request
body, honeypot, and Turnstile result (including hostname and `comment` action).
Verification is [performed on the server](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
Names allow 40 characters and comments 5,000. Each IP is limited to five POSTs
and sixty GETs per minute using atomic D1 counters. Counter keys hash the IP
with the server secret; no plaintext IP is stored in these tables. Old counters
are cleaned up during traffic after 24 hours. Cloudflare may separately retain
its own service logs. Comment bodies and credentials are not logged by this code.

Each comment has a browser-generated request ID. Retrying an uncertain submission
returns the stored comment rather than duplicating it. Failed posting preserves
the draft. Identity creation and comment insertion are one
[D1 batch transaction](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).
SQL parameters are bound; comment text and names render with `textContent`.
The editor loads the latest thirty comments and offers earlier pages.

The identity is remembered in local browser storage across articles and visits.
An optional encrypted identity file supports another browser/device: AES-256-GCM,
random salt/IV, and PBKDF2-SHA-256 with 210,000 iterations. Restore checks the
credential against the Worker before saving it locally. Keep the file and its
passphrase private. Clearing browser storage without a saved file loses that
identity. The retired Matrix identity files are not compatible with this service.

Moderate through the D1 console; there is no public administration endpoint:

```sql
SELECT id, page, username, message, created_at, hidden
FROM comments ORDER BY id DESC LIMIT 100;

-- Replace 123 with the relevant comment ID.
UPDATE comments SET hidden = 1 WHERE id = 123;

-- Prevent that identity from submitting more comments or restoring its credential.
UPDATE identities SET banned = 1
WHERE id = (SELECT visitor_id FROM comments WHERE id = 123);
```

Refresh the article to see removals. Hiding a comment preserves its retry record,
so a visitor cannot restore it by retrying the same request. Banning does not
automatically hide earlier comments. Rows from the original prototype remain
readable, but their old visitor IDs are not credentials for the new identity API.

Edit `worker.mjs` and run `node _src/build.js` to update the dashboard's standalone
`worker.js`. The build generates the public `comment-pages.json` manifest from
`posts.json`. **Deploy this manifest-aware Worker once** in the existing
`rapid-fog-462d` editor. It loads the published list on demand, so future blog
posts need only the usual site build and push. No per-post Worker deployment,
D1 table creation, migration, or new Cloudflare secret is needed.

The Worker fetches the manifest from the fixed site origin, rejects redirects,
and accepts only listed post slugs. Known posts use the cached list; an unfamiliar
slug triggers a refresh. There is no periodic polling. Concurrent requests share
a fetch, and a thirty-second cooldown prevents repeated misses from fetching
the manifest on every request. A fresh Worker isolate loads its own list once.
Consequently, a just-published post may need a retry after at most thirty seconds
if that isolate recently fetched an older list. During a temporary fetch failure
it continues serving known threads from its last good
list; unfamiliar posts remain unavailable until the manifest can be read again.
An isolate with no cached manifest returns a temporary-unavailable response.
Failed fetches retry on the next request after thirty seconds. The manifest fetch
revalidates with the origin (`cache: 'no-cache'`); see
[Cloudflare's Fetch documentation](https://developers.cloudflare.com/workers/runtime-apis/fetch/).

Redeploy only when changing the backend logic. Keep the existing `DB` binding
and `TURNSTILE_SECRET`; this update does not change the database schema.
Rebuild and push the static site when changing the endpoint or public site key.

### Optional CLI setup

Dashboard setup does not require Wrangler. If using the CLI instead, open
`comments/wrangler.toml`, insert the existing D1 database UUID in `database_id`,
then run from `_services/comments`:

```powershell
npx wrangler login
npx wrangler d1 migrations apply j-stoerk-comments --remote
npx wrangler secret put TURNSTILE_SECRET
npx wrangler deploy
```

Apply the migration through **one** route: dashboard SQL or Wrangler migrations.
Do not apply the initial migration again after manually running it. Subsequent
CLI deploys can reuse the binding and secret without rerunning migration setup.

Backend tests run the actual SQL against temporary SQLite databases through
Python's standard library, with Cloudflare verification mocked. Tests cover
schema upgrades, retries, moderation, paging, verification, rate limits, and
transaction rollback without making external requests.

## Private messages: Formspree to Gmail

The inline form posts directly to `https://formspree.io/f/xkjgapaj` with standard
HTML POST. Fields are `name`, `email`, `message`, and the `_gotcha` honeypot.
Formspree handles its confirmation page and spam checks. In Formspree, verify the
notification destination is `julius.stoerk@gmail.com` and complete any requested
email verification. The endpoint alone does not prove its delivery destination.

`contact.js` opens the form beside Contact on desktop and below it on mobile.
A confirmed local comment identity prefills only the editable name. No comment
credential is sent to Formspree; manual edits survive closing/reopening.
The earlier `lingering-brook-b11f-contact-form` Worker is not called by the site.
Browser checks intercept form submissions and send no real email.
