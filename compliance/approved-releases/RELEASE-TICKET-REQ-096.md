# Release Ticket: REQ-096 — Payment-revert option for order/tab deletion

**Status:** RELEASED
**Date:** 2026-07-28
**Requirement ID:** REQ-096
**Risk Level:** HIGH
**Issue:** [#612](https://github.com/metasession-dev/wawagardenbar-app/issues/612)
**Implementation branch:** `feat/REQ-096-payment-revert-delete`

## Summary

New `OrderService.deleteOrder()` (soft-delete — the document is never removed, per ADR-002) with independent "restock inventory" / "reverse payment" checkboxes, extending the existing `TabService.deleteTab()` inventory-only revert with a new payment-revert choice guarded against `Tab.partialPayments`. Order deletion did not exist as a capability before this REQ (only status-only `cancelOrder`).

## AI contributors

| Tool        | Version  | Commits                                      | Date       |
| ----------- | -------- | -------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `9237724` (plan), `ecb9a59` (implementation) | 2026-07-28 |

Prompt and review record: `compliance/evidence/REQ-096/ai-use-note.md`.

## Implementation details

- `models/order-model.ts`, `interfaces/order.interface.ts` — additive `isDeleted`/`deletedAt`/`deletedBy` fields, no migration.
- `services/order-service.ts` — new `deleteOrder()`; `getActiveOrders()`/`getRecentOrders()` exclude `isDeleted`.
- `services/tab-service.ts` — `deleteTab()` gains `revertPayment`, refused when `partialPayments` is non-empty.
- `app/actions/admin/order-management-actions.ts` — new `deleteOrderAction`; `getOrdersAction` excludes `isDeleted` by default.
- `app/actions/tabs/tab-actions.ts` — `deleteTabAction` opts extended.
- `components/features/admin/delete-order-dialog.tsx` (new), `order-actions-sidebar.tsx`, `tabs/delete-tab-dialog.tsx` — independent checkboxes replacing the tab dialog's single radio choice.
- `app/dashboard/orders/[orderId]/page.tsx` — `isSuperAdmin` threaded through; "Deleted" banner for soft-deleted orders.
- `models/audit-log-model.ts` — `order.delete` added to the Mongoose `action` enum (found via e2e against real Mongo).
- `docs/ADR/ADR-002-order-soft-delete.md` — the soft-delete design decision.
- `docs/SRS.md` — `REQ-ORDMGT-013`/`REQ-ORDMGT-014` (new), `REQ-TABMGT-004` (updated).
- `compliance/risk-register.md` — `R-013` through `R-017`.
- Tests: `__tests__/services/order-service.delete-order.test.ts`, `tab-service.delete-payment-revert.test.ts`, `financial-report-service.payment-revert-exclusion.test.ts`, extended `order-management-actions.test.ts`; `e2e/critical/delete-order.spec.ts`, `delete-tab-payment-revert.spec.ts`.

## Verification

- Unit: 1,326 passed (full suite), 28 new/updated for this REQ.
- E2E: 8/8 targeted, run locally against a real dev server + MongoDB. Full `critical` regression pack run once (301 tests): 3 report-related failures re-verified passing at `--workers=1` (confirmed parallel-load contention, not a regression); 1 pre-existing seed-data gap and 5 pre-existing customer-auth failures unrelated to this REQ's code paths.
- TypeScript/ESLint: 0 errors.
- Full detail: `compliance/evidence/REQ-096/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. The operator independently reviewed the diff and the HIGH-risk plan design question (hard-delete vs. soft-delete) before implementation began, and will review the PR + perform the portal UAT review before Production approval.
