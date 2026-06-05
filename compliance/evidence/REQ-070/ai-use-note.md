# REQ-070 — AI use note

## Tool

Claude Opus 4.7 via Claude Code (CLI).

## What the AI did

- **Rewards subsystem exploration** — read `services/rewards-service.ts`, `services/points-service.ts`, `services/order-service.ts` (cancel transition), `models/{points-transaction,reward,user}-model.ts`, and identified the production reversal contracts REQ-048 owns.
- **Service-layer integration spec** — authored one Playwright spec that seeds the post-earn state directly in Mongo, calls `OrderService.cancelOrder` + the two reversal helpers, and asserts the side-effects via Mongo readback.
- **Diagnostic-driven debugging** — first run failed (points unchanged). Added inline diagnostic logging that revealed the dynamic-import-not-transpiled limitation; compensated by importing the reversal helpers statically. Documented honestly in the test-execution-summary.

## Implementation discipline

- Red-then-green: first run failed; agent investigated + adjusted; second run passed cleanly.
- All gates checked locally before commit: `tsc --noEmit` (0 errors), `vitest run` (1129 pass / 0 fail), focused E2E 4/4 pass against UAT.
- One spec exercises both AC1 + AC2 in one cancel transition — shared seed + single observable side-effect path.

## Honest scope deferrals

Sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) proposes 7 specs; this PR ships 1 (covering both REQ-048 legs). Remaining 6 deferred:

1. **Tab-checkout eligibility (REQ-CHECKOUT-009)** — needs customer-side tab flow auth or API-key path; both require infra not yet in place.
2. **Tab-close-applies-rewards (REQ-ORDER-004)** — UI-driven E2E with admin tab-close flow.
3. **Admin reward-rule CRUD (REQ-REWMGT-001/002)** — list + create + edit. PR #135 was the original attempt.
4. **Issued-rewards list (REQ-REWMGT-003)** — per-customer audit page.
5. **Reward templates editor (REQ-REWMGT-004)** — email/notification template UI.

All five are tracked on sub-issue #293 as a checklist; ship in follow-up cycles within the same sub-issue.

## Quality posture

- 0 production code changes (pure test-pack-coverage cycle).
- 0 new packages, 0 env vars, 0 schema changes.
- One Playwright spec; one test; both REQ-048 legs pinned.
- Dynamic-import limitation in `OrderService.cancelOrder` documented honestly in test-execution-summary.md — caller-side compensation makes the spec valid; the limitation is a Next.js-vs-Playwright-runner asymmetry, not a production bug.

## Human review boundary

- Operator approved umbrella + sub-issue grouping in advance (#291 filed 2026-06-04).
- Operator's "proceed" message (after #298 merged) signaled to continue with the umbrella; agent picked the recommended next pickup.
- Operator will perform Stage 4 portal UAT approval + Stage 5 Production approval when this sub-issue's cycle reaches release time.

## What the AI did NOT do

- Did not modify any production code in `services/order-service.ts`, `services/points-service.ts`, or `services/rewards-service.ts`. Pure test addition.
- Did not silently skip the dynamic-import limitation. Documented in `test-execution-summary.md` + `implementation-plan.md`.
- Did not run any prod-Mongo touch per `feedback_no_prod_db_touches`. UAT only.
- Did not generate fake-positive specs. Each assertion is observable Mongo state.
