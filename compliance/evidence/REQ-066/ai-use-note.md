# REQ-066 — AI use note

## Tool

Claude Opus 4.7 via Claude Code (CLI). `e2e-test-engineer` skill invoked once for the live-execution E2E phase.

## What the AI did

- **Root-cause investigation, three iterations.** Followed the operator's pushback through three reframings (catch-and-swallow → customer-path-bypass → kitchen-completion-not-reached). Each iteration was reflected in the plan + the #277 comment thread + the RTM row. The agent did not get defensive about the earlier (wrong) framings — it grepped, re-read the code, and updated.
- **Implementation plan written + rewritten 3x.** Each revision captured the operator's constraints explicitly: deduction-on-completion semantic, no auto-completion crons, tab orders through kitchen-display individually. AC7 split into AC7a/AC7b after the orders-page surface was flagged.
- **Phase 1 verification before TDD.** Per the plan's non-negotiable precondition, grepped every `status='completed'` mutation site + every caller of the duplicate completion functions + verified the tab → kitchen-display assumption (the kitchen-display query has no tab filter). Confirmed the chokepoint is safe to consolidate.
- **TDD red-then-green discipline.** Wrote failing tests first across all 6 batches; implemented to green; ran full vitest after each batch. Regression-guard tests pinned the 6 removed sites + the deduction call counts.
- **Canonical chokepoint.** Authored `OrderService.completeOrder` as the single function in the codebase that sets `Order.status='completed'` AND triggers `InventoryService.deductStockForOrder`. On deduction throw: writes IncidentEvent + does NOT block the status flip (kitchen workflow must not stall — operator's stipulation).
- **6 premature deduction sites removed** + dead duplicate completion file deleted + REQ-049 webhook idempotency tests updated to assert the new ownership.
- **Retry-only reconciliation cron + visibility-only stale-paid-orders scan.** Both passes obey the operator's rule: NEVER mutates Order.status.
- **`/dashboard/incidents` admin view** + `IncidentEventModel` + `IncidentEventService` (recordIncident, list, dedupRecent).
- **E2E specs authored end-to-end** for AC7a + AC7b. Seed + Mongo assertion + cleanup plumbing all in place; both `test.fixme`'d after live execution hit an unresolved Playwright × Next.js server-action interaction issue. Honest framing in `test-execution-summary.md`.
- **Full regression pack against UAT.** 326 passed / 0 failed / 7.8 min wall-clock — 0 regressions from REQ-066 despite removing 6 deduction sites + the duplicate completion file.
- **Compliance pack.** Authored this evidence pack (release ticket + 7 markdown files) per `feedback_phase3_release_ticket_mandatory`.

## Honest scope limitation

The AC7a/AC7b E2E specs are authored but `test.fixme`'d. Live execution hit a Playwright × Next.js 16 server-action interaction issue: clicks on the kitchen-order-card / admin-order-card "Start Preparing" button reach the DOM (verified via xpath, force, dispatchEvent, inline JS DOM walk, plain Playwright click) but the server action never invokes (zero audit log rows across all strategies tried). The triage + likely root cause is documented in `test-execution-summary.md`.

The underlying invariant is pinned by the unit test on `OrderService.completeOrder` + the regression-guard tests. The E2E specs would have been a UI-layer confidence check; that confidence remains as manual UAT (test-scope.md § Manual UAT). The fixme path is well-defined — when the Playwright × Next.js issue is resolved, the specs go live without rewrite.

## Human review boundary

- **Operator drove three rounds of root-cause refinement** — the agent didn't ship the first plan; it iterated until the framing matched the operator's mental model.
- **Operator approved the third plan** before any code landed (HIGH-risk + financial-touching → `feedback_sdlc_impl_plan_review` discipline).
- **Operator flagged the orders-page UI gap** mid-cycle. Plan expanded AC7 → AC7a + AC7b.
- **Operator surfaced a process gap** — the AC7 plan-expansion commit didn't make it into the integration PR (#281 was already merging). Agent rolled the expansion forward into the evidence pack PR.
- Operator will perform Stage 4 portal UAT approval and Stage 5 Production approval.

## Quality posture

- TDD red-then-green observed across all 6 implementation batches.
- All gates run locally before commit: `tsc --noEmit`, `vitest run`, `eslint`, `npm run build`. All passed.
- Live UAT regression pack: 326 pass / 0 fail.
- No `--no-verify`, no `eslint-disable`, no `@ts-expect-error`. Pre-commit (commitlint + lint-staged) and pre-push (tsc) hooks ran on every commit with no overrides.

## What the AI did NOT do

- Did not auto-complete stale orders or otherwise mutate `Order.status` from any automation. Operator's stipulation observed verbatim.
- Did not push past the unresolved Playwright × Next.js issue with fake-positive specs. `test.fixme` is the honest framing.
- Did not modify any existing user data (no migration, no backfill).
- Did not add a new package, env var, or DB migration outside the IncidentEvent collection (auto-created).
- Did not touch the prod Mongo (UAT only per `feedback_no_prod_db_touches`).
- Did not run `--admin` merges or skip CI gates.
