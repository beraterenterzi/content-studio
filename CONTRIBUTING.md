# Contributing to Content Studio

Thanks for contributing. Please open an issue before large changes so the
product direction and privacy/cost implications are clear.

## Local checks

Run the following before opening a pull request:

```powershell
npm run check
node --check public/app.js
node --check cloudflare/worker.js
```

Do not add secrets, user media, production exports, `.env`, `.dev.vars`, or
Cloudflare/Stripe/Google/Telegram credentials to commits. Keep tests free of
paid AI calls, production uploads, YouTube publication, Telegram messages, and
real user data.

## Scope

Explain affected user journeys, including failure and recovery behavior. For UI
changes, verify desktop and mobile layouts. For cloud changes, preserve the
separation between device-only drafts and cloud projects.
