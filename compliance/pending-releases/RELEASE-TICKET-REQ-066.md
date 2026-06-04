# Release Ticket: REQ-066 — Inventory deduction correctness + reconciliation (#277)

**Status:** DRAFT
**Date:** 2026-06-04
**Requirement ID:** REQ-066
**Risk Level:** HIGH
**GitHub Issue:** [#277](https://github.com/metasession-dev/wawagardenbar-app/issues/277) (root cause refined 3x in comments) · pattern context: [#280](https://github.com/metasession-dev/wawagardenbar-app/issues/280)
**Integration PR:** [#281](https://github.com/metasession-dev/wawagardenbar-app/pull/281) — merged to develop 2026-06-03.
**Release PR:** (to be opened after this evidence pack lands)
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-066`, status `draft` → `uat_review` on this evidence push.
**Sign-off (dual-actor):** Pending UAT approval + Production approval on the DevAudit portal.

---

## Summary

Operator reported: "items being sold are not deducted from inventory count. The audit log shows it." Root cause was refined three times (catch-and-swallow → customer-path-bypass → kitchen-completion-not-reached). The operator-validated frame: deduction is intended to fire at kitchen-display `completed` transition, and the bug presented when paid orders never reached that status. The codebase had **6 different premature `deductStockForOrder` call sites** — none of which were canonical.

- **AC1** — New `OrderService.completeOrder` chokepoint; only place in the codebase that sets `Order.status='completed'` AND triggers deduction. On throw: writes `IncidentEvent`, does NOT block status flip.
- **AC2** — 6 premature deduction sites REMOVED (createOrder + completeOrderPaymentManually + paystack/monnify webhooks + both TabService sites). Dead duplicate file `app/actions/order/complete-order-action.ts` deleted.
- **AC3** — New `IncidentEventModel` + service for persistent silent-fail audit. Kinds: `inventory_deduction_failed`, `stale_paid_order`.
- **AC4** — Retry-only reconciliation cron (15 min). NEVER mutates `Order.status` — per operator's stipulation that only kitchen-display staff may complete an order.
- **AC5** — Stale-paid-orders visibility scan (same cron tick, 2h threshold). NEVER mutates state. Pure visibility — managers see workflow gaps via `/dashboard/incidents`.
- **AC6** — `/dashboard/incidents` admin view (RBAC csr/admin/super-admin).
- **AC7a/AC7b** — E2E invariant specs authored for BOTH UI surfaces (kitchen-display + orders-page) and **both pass live against UAT**. The specs exercise the full chokepoint (seed → confirmed → preparing → ready → completed → inventory delta = −1) on both order surfaces. Cleanup is location-aware (`trackByLocation` rows are restored by `$inc`-ing `locations[0].currentStock`).
- **AC8 — Sales deductions route to `defaultSalesLocation` (added after post-deploy operator-reported defect).** `applyOrderStockDelta` rewritten to route trackByLocation deductions to the row's sale-point bucket (chiller* for drinks, freezer* for frozen); throws on insufficient sale-point stock so the chokepoint catches and writes an `inventory_deduction_failed` IncidentEvent (operator's stipulation: system never auto-spills from store to sale-point). Fallback to "first non-empty" for legacy rows. Refills always land on `locations[0]`. Companion: `scripts/backfill-sale-point-location.ts` rewrites the legacy bulk-set `defaultSalesLocation='store'` value to the row's chiller*/freezer* code. Live AC8 E2E spec proves the routing against UAT (force-mutates the Desperados-shape and confirms the deduction lands on the sale-point, not the empty storeroom). **6/6 focused E2E (3 auth-setup + AC7a + AC7b + AC8), 1.5 min wall-clock.** Backfill ran against UAT 2026-06-04: 37/39 rows touched (34 REWRITE from `'store'`, 3 SET fresh; 2 LEFT — items with only a store location, handled by the runtime fallback).

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI). `e2e-test-engineer` skill invoked for the live-execution E2E phase.
- **AI-Generated Changes:** Implementation plan with 7 ACs (AC7 expanded to AC7a/AC7b after operator flagged the orders-page gap); new `OrderService.completeOrder` chokepoint with IncidentEvent on throw; removal of 6 premature deduction sites + deletion of the dead duplicate completion file; new `IncidentEventModel` + service with `recordIncident` / `list` / `dedupRecent`; retry-only reconciliation cron via `lib/scheduled-jobs.ts`; visibility-only stale-paid-orders scan; `/dashboard/incidents` admin view; 23 new vitest cases + 3 updated (REQ-049 webhook idempotency + scheduled-jobs interval count); 2 new Playwright specs (both live-passing against UAT after a location-aware-cleanup fix). Operator drove three rounds of root-cause refinement and pushed back when the agent first deferred AC7a/AC7b with `test.fixme`, requiring live-passing specs before merge; the agent encoded each iteration honestly into the plan + RTM. See `compliance/evidence/REQ-066/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this cycle:** reported the inventory drift; pushed back on the catch-and-swallow framing (correctly); rejected auto-completion crons ("I don't want anything bypassing the kitchen display"); confirmed tab orders flow through kitchen-display individually; flagged the orders-page UI gap in the original AC7 design; approved the revised plan; merged the integration PR; will perform Stage 4 portal UAT approval + Stage 5 Production approval.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § Four-eyes attestation.

## Implementation Details

**Files Added:**

- `models/incident-event-model.ts` — schema with 2 initial kinds.
- `services/incident-event-service.ts` — recordIncident / list / dedupRecent.
- `app/dashboard/incidents/layout.tsx` + `page.tsx` — admin view.
- `__tests__/models/incident-event-model.test.ts` — 3 cases.
- `__tests__/services/incident-event-service.test.ts` — 5 cases.
- `__tests__/services/order-service.completeOrder.test.ts` — 5 cases.
- `__tests__/services/order-service.scanStalePaidOrders.test.ts` — 3 cases.
- `__tests__/services/inventory-service.reconcile.test.ts` — 3 cases.
- `__tests__/regression/inventory-deduction-removed.test.ts` — 4 regression-guard cases.
- `e2e/admin-order-inventory-delta.kitchen-display.spec.ts` — AC7a (live-passing against UAT; `describe.configure({ mode: 'serial' })`).
- `e2e/admin-order-inventory-delta.orders-page.spec.ts` — AC7b (live-passing against UAT; same serial config; routes through `/dashboard/orders` admin order-card, `Complete` button).
- `e2e/admin-order-inventory-delta.sale-point.spec.ts` — **AC8** (live-passing against UAT; force-mutates the seeded inventory into the Desperados-shape).
- `lib/sale-point-location-backfill.ts` — pure helper for `deriveSalePointLocation` + `isSalePointBackfillCandidate` + `SALE_POINT_LOCATION_BACKFILL_FILTER`.
- `scripts/backfill-sale-point-location.ts` — one-shot idempotent backfill, ran against UAT 2026-06-04.
- `__tests__/services/inventory-service.sale-point-routing.test.ts` — 8 AC8 routing cases.
- `__tests__/lib/sale-point-location-backfill.test.ts` — 15 helper cases.
- `compliance/plans/REQ-066/implementation-plan.md` — plan with ACs, risk, security.

**Files Modified:**

- `services/order-service.ts` — added `completeOrder` chokepoint + `scanStalePaidOrders`; removed 2 inline deduction blocks.
- `services/inventory-service.ts` — added `reconcileMissedDeductions`; **AC8: rewrote `applyOrderStockDelta` for sale-point routing**.
- `__tests__/services/inventory-service.track-by-location.test.ts` — **1 case updated** (the test that codified the broken clamp-at-zero behavior now asserts the new fall-through routing — bug shape pinned in the regression pack).
- `services/tab-service.ts` — removed 2 inline deduction blocks.
- `app/api/webhooks/paystack/route.ts` — removed inline deduction.
- `app/api/webhooks/monnify/route.ts` — removed inline deduction.
- `app/actions/admin/order-management-actions.ts` — kitchen-completion routes through `OrderService.completeOrder`.
- `lib/scheduled-jobs.ts` — registered the 15-min inventory reconciliation job.
- `__tests__/api/webhooks/paystack-idempotency.test.ts` + `monnify-idempotency.test.ts` — assert webhooks NO LONGER call deductStockForOrder.
- `__tests__/lib/scheduled-jobs.test.ts` — interval count 2 → 3.
- `compliance/RTM.md` — REQ-066 IN PROGRESS row.

**Files Deleted:**

- `app/actions/order/complete-order-action.ts` — dead duplicate completion logic (had its own catch-and-swallow). No external callers after the integration.

**Schema changes:** new `IncidentEvent` collection (auto-created). No migration to existing data.

## Test Plan & Evidence

See `compliance/evidence/REQ-066/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1118 pass / 4 skip / 0 fail (+45 from REQ-065 baseline of 1073; +23 from AC1-AC7 baseline of 1095 covers the AC8 routing + backfill-helper additions).
- TypeScript: 0 errors.
- ESLint: 0 errors / 950 pre-existing warnings.
- Production build: green.
- E2E full regression against UAT (post-AC8): **326 passed / 18 skipped / 27 did-not-run / 0 failed** (16.2 min). Zero new failures relative to the prior AC1-AC7 baseline; wall-clock roughly doubled because the third inventory-delta spec (AC8) contends on the same UAT inventory rows as AC7a/AC7b.
- E2E focused REQ-066 (AC7a + AC7b + AC8): 6 passed (3 auth-setup + 3 invariant specs), 1.5 min wall-clock, 0 failed. Live against UAT.

## Security & Compliance

See `security-summary.md` for the STRIDE pass. Headline:

- **Idempotency** guarded on every deduction site via `!inventoryDeducted` — duplicate cron + manual race cannot double-decrement.
- **No new auth surface.** Reconciliation cron runs server-side; all UI surfaces inherit existing dashboard RBAC.
- **No new data egress.** IncidentEvent rows hold operational metadata only.

## Rollback Plan

Revert PR #281. The schema additions are purely additive (the IncidentEvent collection stays in place but unreferenced). The cron registration is removed cleanly. The deduction goes back to the pre-REQ-066 mess of 6 inline call sites + duplicate completion functions — the prior bug returns. Therefore: rollback only as a true emergency; a forward-fix is preferred.

## Quality Gates

| Gate                            | Expected   | Actual (2026-06-04)                                             |
| ------------------------------- | ---------- | --------------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0     | exit 0                                                          |
| `npx vitest run` (full)         | 0 failures | 1118 pass / 4 skip / 0 fail                                     |
| `npx eslint . --max-warnings=0` | 0 errors   | 0 errors / 950 pre-existing console warnings                    |
| `npm run build`                 | exit 0     | exit 0                                                          |
| E2E focused REQ-066 (UAT)       | 0 failures | 6 passed (3 auth-setup + AC7a + AC7b + AC8), 1.5 min wall-clock |
| E2E full regression pack (UAT)  | green      | 326 pass / 18 skip / 27 did-not-run / 0 fail (16.2 min)         |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-066/implementation-plan.md`)
- [x] Stage 2 — Implement & test (PR #281 merged to develop)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- First REQ outside the post-REQ-062 trio. Triggered by the operator's defect report during REQ-065 close-out.
- The plan was rewritten 3 times across the cycle — each rewrite tracked in the comment thread on #277 + reflected verbatim in the RTM row. Plan-of-record was the third revision.
- Operator stipulated "nothing bypasses the kitchen-display" — reconciliation cron is retry-only; stale-paid-orders scan is visibility-only. Both deliberately stop short of auto-completion.
- AC7a/AC7b now pass live against UAT. Two issues blocked the initial click invocation, both resolved: (1) the seed was missing the Mongoose-required `estimatedWaitTime` field, causing `order.save()` inside `updateOrderStatusAction` to silently fail validation; (2) the kitchen-display "Complete Order" / orders-page "Complete" button label difference; (3) the seeded inventory item (Gulder) was `trackByLocation:true` and the test was snapshotting the stale aggregate `currentStock` instead of the sum of `locations[*].currentStock`. The fix is a small `computeStockFromInventory()` helper used at baseline-capture + every poll, plus a location-aware cleanup that restores by `$inc`-ing `locations[0].currentStock` for `trackByLocation` rows. The underlying invariant is now pinned at all three layers: unit (`OrderService.completeOrder`), regression-guard (the 6 removed sites), and live E2E (UI lifecycle → inventory delta).
- No new packages, no env vars. New collection auto-created on first write.
