# Orbit Studio security baseline

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
2. Apply all D1 migrations, including `0002_usage_quotas.sql`.
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
