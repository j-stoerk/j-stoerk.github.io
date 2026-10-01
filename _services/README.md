# Activate comments and private messages

Both frontends are implemented. The checked-in public configuration deliberately
has no site registration, message endpoint, or Turnstile key. Until configured,
the website says comments/message sending are unavailable and offers direct email.
No API key, Gmail credential, or owner Matrix token belongs in the static site.

## Comments: Cactus + Matrix

1. Create a **regular Matrix account** in a client such as Element. This is your
   moderation account; visitors do not need accounts.
2. Follow the [Cactus quick start](https://cactus.chat/docs/getting-started/quick-start/):
   message `@cactusbot:cactus.chat` with `register j-stoerk-portfolio` (or another
   available site name). Keep the resulting moderation room.
3. In `_src/community.json`, set `comments.siteName` to the **registered** name.
   `homeserverUrl` and `serverName` must identify that Cactus service. The public
   server's documented defaults are supplied, but its endpoint could not be
   reached from this workspace during implementation. Confirm the service is
   reachable before activation; otherwise use a
   [self-hosted Cactus service](https://cactus.chat/docs/server/self-host/) on a
   guest-enabled Matrix homeserver and replace both server settings. A generic
   Matrix account/server by itself does not create Cactus comment rooms.
4. Rebuild: `node _src/build.js`. Commit and push the generated pages too.
5. Open one post in a private browser window, post a comment, and verify its
   display name and visibility from a second browser. Then verify another post
   asks for no new name in the first browser. Moderate/redact the test comment
   in Matrix and refresh the website to confirm removal.

The custom, dependency-free frontend uses Cactus's room alias convention
`#comments_<siteName>_<post-slug>:<serverName>` and standard Matrix events.
Comment loading is lazy; it creates/reuses a guest session to read the room.
The first **Post** asks only for a display name and sets the guest's Matrix
`displayname` before joining/sending. Subsequent posts reuse that identity across
posts and visits in the same browser. Browser storage restrictions/clearing or
expired guest credentials can require a new identity. Names are chosen labels,
not verified real-world identities.

An optional identity file uses AES-256-GCM with a random salt/IV and a passphrase
key derived with PBKDF2-SHA-256 (210,000 iterations). Restore verifies the Matrix
user/token before saving it locally. Transfer the encrypted file privately and
retain its passphrase; it gives the same identity across browsers/devices without
adding a separate signup service. Losing both browser credentials and the file
loses that guest identity. Rotate/revoke compromised guest credentials through
the homeserver; moderation bans also apply to restored identities.

Comments are public, plain text. HTML is never injected. Existing Matrix edits
and redactions are reflected on refresh for the loaded event range. Use the
[Cactus moderation room](https://cactus.chat/docs/getting-started/moderation/)
for bans and moderator permissions. Cactus does not provide an approval queue.

## Private messages: Cloudflare Worker + Resend + Gmail

The portfolio stays on GitHub Pages. Only the separate message endpoint runs
on Cloudflare. The Worker sends to `julius.stoerk@gmail.com`, with the visitor's
email as `reply_to`. Gmail does not need an app password or public API access.

1. Create a [Cloudflare account](https://dash.cloudflare.com/sign-up) and a
   [Resend account](https://resend.com/signup).
2. [Add and verify a sending domain in Resend](https://resend.com/docs/dashboard/domains/introduction).
   Set `CONTACT_FROM` in `_services/contact/wrangler.toml`, e.g.
   `Julius Störk portfolio <contact@your-domain.example>`. You cannot verify
   `gmail.com` or `github.io`; use a domain whose DNS you control. The sender
   domain can differ from the portfolio hostname. Choose a sending-only Resend
   API key restricted to that domain.
3. Create a **managed Turnstile widget** in Cloudflare, allowing the hostname
   `j-stoerk.github.io`. Keep its public site key and private secret key separate.
4. From the repo, run:

   ```powershell
   cd _services/contact
   npx wrangler login
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler deploy
   ```

   Enter secrets only at Wrangler's prompts, never in a commit or chat. Set up
   the Worker when Wrangler asks to create it. Its native rate-limit binding
   allows three attempts per IP per minute; the binding is mandatory, not an
   in-memory fallback. Confirm your account supports the binding when deploying.

5. In `_src/community.json`, set `contact.endpoint` to the deployed URL **ending
   in `/message`**, e.g. `https://j-stoerk-contact.<account>.workers.dev/message`.
   Set `contact.turnstileSiteKey` to the widget's **public** site key. Leave the
   private secret only in Cloudflare.
6. From the repo root, rebuild, commit, and push. Send a short message through
   the live form, confirm it reaches your Gmail inbox, and confirm replying uses
   the sender's email. API success means the provider accepted the message;
   Gmail filtering/bounces can still affect delivery. Check the Resend dashboard
   if a message does not arrive.

The Worker rejects unsupported origins/methods, oversized bodies, malformed
fields, honeypots, invalid/expired Turnstile tokens, and mismatched challenge
hostname/action. Sender and recipient are fixed server-side. It does not log
message contents or credentials, or store contact messages in a database.
Cloudflare/Resend still process requests and emails under their own policies;
review those alongside the public-comment setup before activating it.
Use each provider's free tier within its current limits; a sending domain is
separate and may cost money if you do not already own one.

## Checks

```powershell
node --test _services/contact/worker.test.mjs
node _src/build.js
python _src/check.py
```

The Worker tests mock external APIs and send no real email. Browser checks during
implementation also use mocked Matrix/Turnstile/Worker endpoints. Live service
registration and email delivery remain activation checks for the owner.
