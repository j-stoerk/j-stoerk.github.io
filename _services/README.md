# Comments and private messages

The contact form is connected to the supplied Formspree endpoint. Blog comments
still need a Cactus site registration in `_src/community.json` before activation.
No API key, Gmail credential, or owner Matrix token belongs in the static site.

## Comments: Cactus + Matrix

You do not need to buy a domain: `j-stoerk.github.io` can use the public Cactus
service. The site name is a unique label, not a domain name. Only you need a
regular Matrix account for moderation; visitors use the site's guest flow.
Comments are omitted from the generated pages while `comments.siteName` is empty.

1. Create a **regular Matrix account** in a client such as Element. This is your
   moderation account; visitors do not need accounts.
2. Follow the [Cactus quick start](https://cactus.chat/docs/getting-started/quick-start/):
   message `@cactusbot:cactus.chat` with `register j-stoerk-portfolio` (or another
   available site name). Wait for a successful registration reply, then accept
   and keep the resulting moderation room. If the name is taken, try another
   name and use that exact registered label below. If the bot cannot be reached
   or does not confirm registration, stop before changing the website config.
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
To inspect a post's comments in Element, join its room alias, e.g.
`#comments_j-stoerk-portfolio_post-geometry-of-forgetting:cactus.chat`.
Replace the registered site label and post slug as appropriate. The custom web
frontend uses guest identities; your regular moderator account stays in Element.

## Private messages: Formspree to Gmail

The inline message form posts directly to `https://formspree.io/f/xkjgapaj`
with `method="POST"`. The form sends `name`, `email`, and `message`; the hidden
`_gotcha` field uses [Formspree's honeypot filter](https://help.formspree.io/articles/building-your-form/honeypot-spam-filtering/).
There is no Worker, email API key, or Turnstile dependency in this contact flow.
Formspree handles the confirmation page and any configured spam challenge.

In the Formspree dashboard, confirm this form's notification destination is
`julius.stoerk@gmail.com` and complete any requested email verification. The
endpoint alone does not expose or prove its inbox destination. Formspree uses
[the `email` field as Reply-To](https://help.formspree.io/articles/building-your-form/email-reply-to-address/)
so you can reply directly to visitors.

The endpoint lives in `_src/community.json` and is injected into the form's
`action` during the build. The Send button is enabled; browser validation checks
required fields and email format before submission. `contact.js` opens the form
beside the contact text on desktop and below it on mobile. It reads only a saved
display name from the configured Cactus homeserver's browser identity to prefill
the editable name field; Matrix credentials are never added to the form or sent
to Formspree. Closing/reopening preserves manual edits. Ordinary HTML submission allows Formspree's hosted
confirmation and spam checks to work without an AJAX/CAPTCHA setup.

Rebuild and push after changing the endpoint:

```powershell
node _src/build.js
python _src/check.py
```

The Cloudflare/Resend backend files have been removed from the repository. The
previously created Cloudflare Worker is no longer called by this website; this
repository change does not delete it from your Cloudflare account.

Browser checks intercept submissions and send no real messages. Send a message
through the published form to confirm the Formspree destination and Gmail delivery.
