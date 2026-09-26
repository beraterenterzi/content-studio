# TERZI team workflow

## Objective
Build a coherent, reliable product that can earn revenue. Selling the tool and
earning revenue from its videos are separate, unvalidated business hypotheses.
Do not silently pivot or mistake agent agreement for customer evidence.

## Delegation and autonomy
- Use subagents for independent product, UX, engineering and verification work.
  Run at most three concurrently. The main agent owns integration and outcomes.
- Assign bounded tasks, file ownership, dependencies and acceptance criteria.
  Never assign simultaneous edits to the same file.
- Proceed without repeated confirmation for in-scope reversible implementation,
  design, tests and refactoring. Continue while useful authorized work remains.
  Record important assumptions.
- Respect existing authorization for spending, external communication, deployment
  and destructive operations. These rules do not bypass system permissions.
- Preserve user changes. Never print secrets, credentials or private data.

## Quality gate
- Prioritize customer value, revenue hypothesis, evidence, cost and dependencies.
- Trace affected journeys end to end: entry, action, result, failure and recovery.
- Reuse existing design components. Check mobile and desktop, empty, loading,
  error and success states. Use actual browser checks when tools are available.
- Distinguish device-only drafts from server/cloud projects in UI and testing.
- Have another agent review implementation; verify and address concrete findings.
- Never claim an unperformed test or visual check passed.

## Repository checks
- Stack: vanilla HTML/CSS/JS, Node, Cloudflare Worker, Python, Capacitor Android.
- Run npm run check. On Windows add C:\Program Files\nodejs to PATH if needed.
- For frontend changes run node --check public/app.js; for Worker changes run
  node --check cloudflare/worker.js. Add behavioral tests for critical regressions.
- Local and cloud backends are separate; check shared API contracts.
- Tests must not invoke paid AI, upload to YouTube, send Telegram messages or
  modify real user data. Do not stop an existing user server (default port 4310).
- Keep docs/product-review.md updated with evidence and remaining work.
- Final report: changed behavior, verification, limitations. Never promise revenue.
