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
- **E2E specs authored + live-passing** for AC7a + AC7b against UAT. First attempt deferred to `test.fixme` after live clicks appeared not to fire; operator pushed back and required live-passing specs before merge. Agent dug back in: surfaced three orthogonal issues — (1) the seed was missing the Mongoose-required `estimatedWaitTime` field so `order.save()` silently failed validation; (2) the orders-page button label is `Complete` not `Complete Order`; (3) the seeded item is `trackByLocation:true` and the aggregate `currentStock` was stale relative to the locations array. Fixed all three; both specs now pass live (5/5, 1.1 min). The full triage is in `test-execution-summary.md`.
- **Full regression pack against UAT.** 326 passed / 0 failed / 7.8 min wall-clock — 0 regressions from REQ-066 despite removing 6 deduction sites + the duplicate completion file.
- **Compliance pack.** Authored this evidence pack (release ticket + 7 markdown files) per `feedback_phase3_release_ticket_mandatory`.

## E2E live-passing — what the operator pushback caught

The agent's first instinct on persistent UAT spec failures was to `test.fixme` AC7a/AC7b and lean on the unit + regression-guard tests as load-bearing. Operator rejected the deferral ("i need this resolved before merging") and required live-passing specs. The root cause that surfaced under continued investigation:

1. Mongoose-required `estimatedWaitTime` was missing from the seed. `OrderModel` enforces it at `save()` validation; the raw `collection.insertOne()` bypasses validation but the server-action `order.save()` call inside `updateOrderStatusAction` rejects it. The action returned `{success: false}`, a toast showed the error, and the test never inspected the toast.
2. Orders-page admin card uses `Complete` not `Complete Order` for the button label — kitchen-display uses `Complete Order`. The locator regex had to differ between AC7a and AC7b.
3. The seeded inventory item (Gulder) has `trackByLocation: true` with 2 locations. The Inventory model's post-save hook recomputes the aggregate `currentStock` from `locations[*].currentStock`. The seed had been snapshotting the aggregate (stale relative to the locations array), so the test compared against a stale baseline and saw the post-save-hook-recomputed lower number as a phantom 16-unit drop.

Fix: a `computeStockFromInventory()` helper returns the sum of `locations[*].currentStock` for `trackByLocation` rows, used at baseline-capture, inter-step polling, and final delta poll. Cleanup is location-aware: it reads the order's `stockmovements` to compute the true deducted amount, then `$inc`s `locations[0].currentStock` (or aggregate for non-location rows) by that amount — restoring UAT inventory exactly.

The invariant is now pinned at all three layers: unit (`OrderService.completeOrder` happy-path + idempotency + throw branches), regression-guard (the 6 removed sites' source-code call counts), and live E2E (the UI lifecycle delta).

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
- Did not paper over the AC7 failures with fake-positive assertions. The agent's first attempt deferred to `test.fixme`; operator pushback drove a proper root-cause fix (Mongoose validation + button label + location-aware stock) so both specs now run live.
- Did not modify any existing user data (no migration, no backfill).
- Did not add a new package, env var, or DB migration outside the IncidentEvent collection (auto-created).
- Did not touch the prod Mongo (UAT only per `feedback_no_prod_db_touches`).
- Did not run `--admin` merges or skip CI gates.
