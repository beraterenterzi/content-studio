# TERZİ security baseline

## Cloudflare secrets

The production Worker requires an HMAC secret for anonymous workspace cookies.
Create a random value with at least 32 characters and store it as a Cloudflare
secret; never add it to `wrangler.jsonc` or Git.

```powershell
npx wrangler secret put SESSION_SECRET
```

For local Wrangler development, copy `.dev.vars.example` to `.dev.vars` and
replace the placeholder. `.dev.vars` is ignored by Git.

## Required deployment order

1. Configure `SESSION_SECRET`.
2. Apply all D1 migrations, including account, entitlement and billing event tables.
3. Deploy the Worker.
4. Confirm that mutation requests from another Origin return HTTP 403.
5. Confirm that excess API requests return HTTP 429.

Deploying the Worker before the secret and migration are configured will make
API requests fail closed. Existing unsigned anonymous workspace cookies are
intentionally replaced after this change.

## Current boundary

The signed workspace cookie prevents workspace ID tampering, but it is not a
user account. Daily anonymous quotas reduce casual abuse; determined users can
reset cookies or change networks. Paid AI generation must remain disabled until
authenticated users, account-level entitlements, atomic credit reservations,
idempotency keys, and a global provider spending circuit breaker are in place.

An anonymous user can obtain a new workspace by clearing the signed cookie. The
lifetime demo limit therefore prevents duplicate use per workspace, not per
person. Keep a provider spending ceiling in place; a paid or larger managed
trial requires authenticated identity.

Cloud video uploads are limited per file, part and workspace, and the completed
R2 object must match the declared size. The workspace cap is enforced by a D1
trigger, stale multipart uploads expire after 24 hours, and failed client
uploads are explicitly aborted. Telegram group approvals require
`TELEGRAM_EDITOR_USER_IDS`; private chats are already bound to the configured
chat ID. Webhooks also require `TELEGRAM_WEBHOOK_SECRET` and Telegram must be
registered with that same secret as documented in the README. Review these
limits before raising them in production.

Account passwords are derived with PBKDF2-SHA-256 using a unique 128-bit salt
and 310,000 iterations. Session tokens are random, stored only as SHA-256 hashes
in D1, sent in HttpOnly/Secure/SameSite=Strict cookies, and expire after 30 days.
An anonymous workspace becomes inaccessible through its old workspace cookie as
soon as it is claimed by an account.

Stripe webhook signatures are checked against the untouched request body with a
five-minute timestamp tolerance. `billing_events` makes repeated events
idempotent, and only verified events can change entitlements. Email verification
and password reset use hashed, expiring, single-use D1 tokens. Resend delivers
the links and Turnstile protects public account actions; both services must be
configured before billing becomes available. Managed story, speech and image
calls also have separate project-wide daily circuit breakers in addition to
per-account quotas. Account deletion is rejected while a non-terminal Stripe
subscription remains attached.
