---
title: 'Implementation plan — REQ-096'
requirement_id: 'REQ-096'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer@1.0'
authored_at: '2026-07-28'
---

# Implementation plan — REQ-096

**Issue:** [#612](https://github.com/metasession-dev/wawagardenbar-app/issues/612)

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

This plan supplies the test plan, secure-SDLC, privacy-by-design, and technical-documentation evidence required for REQ-096.

## 1. Goal + acceptance criteria

**Goal:** Let a super-admin delete an order or a tab with independent, explicit choices to restock inventory and/or reverse the payment, so that a reversed payment is correctly excluded from every financial report and the reversal decision is fully auditable — extending the existing `deleteTab` inventory-revert pattern to also cover payment, and adding an equivalent capability for orders (which has no delete path today at all).

**Design decision (resolved with operator before drafting this plan):** order deletion is a **soft delete** (`isDeleted` / `deletedAt` / `deletedBy` fields; the document is never removed from MongoDB), not a hard delete. `deleteTab`'s existing hard-delete is safe because nothing outside the Tab collection points at a Tab id; an Order is a leaf record that `Payment.orderId`, `AuditLog.resourceId`, loyalty-points transactions, and `Tab.orders` all point at, and a hard delete would either orphan those references or make the payment-revert step meaningless (a hard-deleted row can never reappear in a `paymentStatus: 'paid'` report query regardless of any status flip). Soft-delete preserves referential integrity and keeps "reverse payment" meaningful for the order path too.

| AC  | Description                                                                                                                                                                                                                                                                                                                                                                      | SRS item it traces to     | Verification                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| AC1 | Given an order with `status: 'cancelled'` and `paymentStatus` not `'paid'` on `/dashboard/orders/{orderId}`, when an admin clicks "Delete Order" and confirms with no override needed, then the order disappears from `/dashboard/orders`'s active list and its detail page shows a "Deleted" banner, and an `order.delete` audit log entry is recorded.                         | REQ-ORDMGT-013 (new)      | Service + action unit tests; authenticated UI test.                    |
| AC2 | Given an order that is not cancelled, or has `paymentStatus: 'paid'`, when a non-super-admin admin opens the delete control on `/dashboard/orders/{orderId}`, then deletion is disabled with an explanatory message; when a super-admin opens it, then they see an override warning and two independent checkboxes ("Restock inventory", "Reverse payment").                     | REQ-ORDMGT-013 (new)      | Action-layer role-gate unit tests; authenticated UI test (both roles). |
| AC3 | Given a super-admin deleting an order with inventory deducted, when they check "Restock inventory" and confirm, then `/dashboard/inventory/{item}` shows stock restored for each item and the order's status becomes `'cancelled'` if it wasn't already.                                                                                                                         | REQ-ORDMGT-014 (new)      | Service unit tests reusing `InventoryService.restoreStockForOrder`.    |
| AC4 | Given a super-admin deleting an order with `paymentStatus: 'paid'`, when they check "Reverse payment (mark refunded)" and confirm, then the order's `paymentStatus` becomes `'refunded'`, and the order is confirmed absent from `/dashboard/reports/daily`'s revenue total for a subsequent report run covering its business date.                                              | REQ-ORDMGT-014 (new)      | Service unit test + `financial-report-service` integration test.       |
| AC5 | Given a super-admin deleting an order and leaving both checkboxes unchecked, when they confirm, then the order is hidden from active views (`isDeleted: true`) but its `status`/`paymentStatus` are unchanged, and the audit log records both reverts as `false`.                                                                                                                | REQ-ORDMGT-014 (new)      | Service unit test.                                                     |
| AC6 | Given a super-admin deleting a tab with non-cancelled, paid orders, when they check the tab dialog's new "Reverse payment" option alongside the existing "Restock inventory" option and confirm, then each affected order's `paymentStatus` becomes `'refunded'`, and those orders are confirmed absent from `/dashboard/reports/daily`'s revenue total for their business date. | REQ-TABMGT-004 (existing) | Service unit test + `financial-report-service` integration test.       |
| AC7 | Given a tab with one or more `partialPayments` entries, when a super-admin opens the tab delete dialog, then the "Reverse payment" option is disabled with an explanatory note that split/partial payments must be reconciled manually, and the tab can still be deleted via the inventory-revert or leave-as-is choices.                                                        | REQ-TABMGT-004 (existing) | Service unit test; authenticated UI test.                              |
| AC8 | Given any order or tab deletion (default or override path), when the action completes, then the `order.delete` / `tab.delete` audit log entry records which of inventory/payment were reverted (or that no override was used), consistent with the existing `tab.delete`/`order.cancel` audit shape.                                                                             | REQ-AUDIT-001 (existing)  | Service unit tests asserting audit-log call shape for every branch.    |

> SRS-ID column populated by `requirements-aligner` at plan approval (Phase 1 step 6).

## 2. Scope

**In scope:**

- `models/order-model.ts` — additive fields: `isDeleted: boolean` (default `false`), `deletedAt?: Date`, `deletedBy?: ObjectId (ref User)`. No migration required — every read filters with `isDeleted: { $ne: true }`, which matches `false`, missing, and `undefined` alike.
- `interfaces/order.interface.ts` — mirror the three new fields on `IOrder`.
- `services/order-service.ts` — new `deleteOrder(orderId, deletedBy, opts?: { superAdminOverride?; revertInventory?; revertPayment?; reason? })`, mirroring `TabService.deleteTab`'s guard shape. `getActiveOrders()` and `getRecentOrders()` updated to exclude `isDeleted: true`.
- `app/actions/admin/order-management-actions.ts` — new `deleteOrderAction` (role gate mirrors `deleteTabAction`); `getOrdersAction`'s default query excludes `isDeleted: true`.
- `components/features/admin/delete-order-dialog.tsx` (new) — `AlertDialog` mirroring `DeleteTabDialog`'s shell, with two independent `Checkbox` controls ("Restock inventory", "Reverse payment") instead of a single radio choice, since the two are independently selectable.
- `components/features/admin/order-actions-sidebar.tsx` — wire in `DeleteOrderDialog`; needs `isSuperAdmin` threaded down.
- `app/dashboard/orders/[orderId]/page.tsx` — read the session (mirrors the tabs detail page's existing pattern) to compute `isSuperAdmin`; pass it and the new order fields to `OrderActionsSidebar`; render a "Deleted" banner when `order.isDeleted`.
- `services/tab-service.ts` — `deleteTab`'s `opts` gains `revertPayment?: boolean`. When true, for each non-cancelled linked order with `paymentStatus === 'paid'`, call `OrderService.updatePaymentStatus(orderId, { paymentStatus: 'refunded' })` alongside the existing inventory-revert step. Guarded: if `tab.partialPayments.length > 0`, the payment-revert branch is refused server-side (defence in depth behind the UI-level disable in AC7).
- `app/actions/tabs/tab-actions.ts` — `deleteTabAction`'s `opts` type extended with `revertPayment?: boolean`.
- `components/features/admin/tabs/delete-tab-dialog.tsx` — replace the single `RadioGroup` (Revert items / Leave as-is) with two independent `Checkbox` controls ("Restock inventory", "Reverse payment"), the second disabled + annotated when `partialPayments.length > 0`.
- `services/audit-log-service.ts` — no change; `createLog` is already generic. `order.delete` and `tab.delete` detail payloads gain `revertInventory`/`revertPayment`/`inventoryReverted`/`paymentReverted` booleans.

**Out of scope:**

- GDPR-style personal-data erasure. This feature is an operational/audit soft-removal, not a data-subject deletion request path — see §5.
- `Tab.paymentStatus`'s own enum (`['pending','paid','failed']`, no `'refunded'` value). Not touched — tab-level payment-revert operates on the tab's constituent **orders'** `paymentStatus`, which is what `financial-report-service.ts` actually gates on; `Tab.paymentStatus` itself is display-only for this feature and needs no migration.
- Reconciling `partialPayments` amounts themselves (the itemized split-payment ledger). AC7 explicitly defers this to manual reconciliation — a documented v1 limitation, not silently mishandled.
- The order-creation portion-pricing bug tracked separately in #613 — unrelated code paths.
- Payment provider refund API integration (Monnify). This REQ only flips `paymentStatus`; the actual monetary refund remains a manual, out-of-band process, matching the existing precedent in `app/actions/communication/communication-actions.ts`.

### Surface inventory

| Surface                               | URL / file                                                                                    | Status                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Order detail — delete control         | `/dashboard/orders/[orderId]`; new `DeleteOrderDialog` wired into `order-actions-sidebar.tsx` | In scope                                                                                                                     |
| Admin orders list                     | `/dashboard/orders`; `getOrdersAction` in `order-management-actions.ts`                       | In scope — exclude `isDeleted: true`                                                                                         |
| Kitchen / active-orders feed          | `OrderService.getActiveOrders()`                                                              | In scope — exclude `isDeleted: true`                                                                                         |
| Recent-orders widget                  | `OrderService.getRecentOrders()`; `/dashboard`                                                | In scope — exclude `isDeleted: true`                                                                                         |
| Tab detail — delete control           | `/dashboard/orders/tabs/[tabId]`; `delete-tab-dialog.tsx`                                     | In scope — extended with independent payment checkbox                                                                        |
| Daily / financial reports             | `services/financial-report-service.ts`                                                        | Already works — the existing `paymentStatus: 'paid'` filter already excludes `'refunded'`; verification only, no code change |
| Inventory restore                     | `services/inventory-service.ts` `restoreStockForOrder`                                        | Already works — reused unchanged                                                                                             |
| Audit log record + existing viewers   | `services/audit-log-service.ts`; `/dashboard/incidents`-style audit surfaces                  | Already works — generic `createLog`/viewer reused unchanged, new detail fields only                                          |
| Order express creation / edit pricing | `app/actions/admin/express-actions.ts`, `order-edit-actions.ts`                               | Out of scope (waived) — unrelated to deletion; portion-pricing bug tracked separately in #613                                |

## SRS items proposed/touched

| AC  | SRS item                  | Status                | Notes                                                                                                                                    |
| --- | ------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-ORDMGT-013 (new)      | stub added            | Delete order — default path, no override needed                                                                                          |
| AC2 | REQ-ORDMGT-013 (new)      | stub added            | Same item — super-admin override gate, second Given/When/Then bullet                                                                     |
| AC3 | REQ-ORDMGT-014 (new)      | stub added            | Delete order — restock-inventory choice                                                                                                  |
| AC4 | REQ-ORDMGT-014 (new)      | stub added            | Same item — reverse-payment choice                                                                                                       |
| AC5 | REQ-ORDMGT-014 (new)      | stub added            | Same item — leave-as-is choice                                                                                                           |
| AC6 | REQ-TABMGT-004 (existing) | stale — update needed | Existing item only documents the closed/paid guard; needs the super-admin override, `revertItems`, and new `revertPayment` choices added |
| AC7 | REQ-TABMGT-004 (existing) | stale — update needed | Same item — add the `partialPayments` refusal behaviour                                                                                  |
| AC8 | REQ-AUDIT-001 (existing)  | unchanged             | Trace-only — `order.delete`/`tab.delete` are new action types within the existing generic "admin actions are logged" contract            |

`REQ-ORDMGT-013`/`REQ-ORDMGT-014` stubs added to `docs/SRS.md` in this cycle (next free IDs after REQ-ORDMGT-012). `REQ-TABMGT-004` updated in place to reflect current + new behaviour — note the existing SRS prose was already stale before this REQ (it didn't document the `superAdminOverride`/`revertItems` behaviour that `deleteTab` already ships today).

## 3. Architecture decisions

- **ADR-002 — Order deletion is a soft delete, not a hard delete** — Drafted by `adr-author`. File at `docs/ADR/ADR-002-order-soft-delete.md`. Operator edits stub to canonical prose + flips status to _Accepted_ before plan APPROVAL. Verdict driven by: pattern change spanning >3 files (every active-order query surface), HIGH risk classification, and the referential-integrity/report-correctness reasoning in §1's design decision.

## 4. Threat model + security considerations

| Threat                                                                                                  | Likelihood | Impact | Mitigation                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A non-super-admin bypasses the override guard via a direct action-layer call (not the UI).              | Low        | High   | Server-side role check in `deleteOrderAction`/`deleteTabAction`, re-enforced independently of the client — existing pattern from `deleteTabAction`.                  |
| Double-submission (e.g. accidental double-click) double-reverts payment or writes duplicate audit logs. | Medium     | Low    | `revertPayment` only fires when `paymentStatus === 'paid'` at call time (idempotent no-op on retry); `isDeleted` set unconditionally to `true` (idempotent).         |
| A soft-deleted order still leaks into a list/report surface that wasn't updated to filter `isDeleted`.  | Medium     | Medium | Enumerated surface inventory above; regression tests asserting exclusion on every listed surface.                                                                    |
| Tab-level payment-revert double-counts or misreports revenue when the tab has `partialPayments`.        | Medium     | High   | Server-side refusal (not just UI disable) when `partialPayments.length > 0` — defence in depth, AC7.                                                                 |
| An admin uses the payment-revert checkbox to disguise an unauthorized refund without evidence.          | Low        | High   | Existing audit-log convention extended with explicit `revertPayment`/`paymentReverted` fields; append-only audit log is the existing control, unchanged by this REQ. |

**Secrets / credentials:** None new.
**Dependencies introduced:** None.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md`:

- **R-013 — Role-gate bypass on order/tab delete override** — Status: OPEN. Server-side role re-enforcement + unit test evidence required before plan approval.
- **R-014 — Double-submission double-reverts payment or duplicates audit log entries** — Status: OPEN. Idempotency evidence required before plan approval.
- **R-015 — Soft-deleted order leaks into a list/report surface that wasn't updated to filter `isDeleted`** — Status: OPEN. Enumerated-surfaces mitigation per ADR-002; structural residual accepted as a documented tradeoff.
- **R-016 — Tab-level payment-revert double-counts or misreports revenue when the tab has `partialPayments`** — Status: OPEN. Server-side refusal control required before plan approval.
- **R-017 — Payment-revert checkbox used to disguise an unauthorized refund without evidence** — Status: OPEN → will read ACCEPTED (pre-existing operational control, not newly introduced by this REQ) once the register row is operator-signed-off.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No new personal-data purpose. Order and Tab documents already contain customer name/email/phone; this REQ adds no new collection or disclosure.

**Important scope clarification:** this feature does **not** implement GDPR Art. 17 (right to erasure). Soft-delete deliberately preserves the record (chosen over a hard delete specifically to protect audit/referential integrity — see §1). If a genuine data-subject erasure request arrives, it must be handled through a separate, dedicated process; this REQ's "delete" is an operational/audit removal-from-active-view, not a privacy-law deletion.

- **Lawful basis / retention / cross-border transfers:** unchanged from existing order/tab handling — no new purpose introduced.
- **Cross-references:** ROPA update — no (no new purpose); DPIA — no (no new processing).

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** N/A — deterministic service/UI logic only; no model invoked or changed.

## 7. Rollback plan

- **Reversible via:** Git revert for all code changes.
- **Data implications of rollback:** `isDeleted`/`deletedAt`/`deletedBy` are additive fields — an older app version simply ignores them, so previously soft-deleted orders would reappear in active list views after a rollback (benign — no data loss). A `paymentStatus: 'refunded'` flip made via the payment-revert path is **not** automatically reversed by a code rollback; it is a business decision, not a bug. If a revert needs to be undone, an admin must manually call `updatePaymentStatus` back to `'paid'` with a documented reason.
- **Notification path if rollback during a release:** Notify the release reviewer and finance/report users before rollback if any payment-revert actions occurred during the release window, since those are not automatically undone.

## 8. Verification

- **Unit + integration tests:** every `deleteOrder` guard branch (default-allowed, override-required-blocked, override-allowed) × every revert combination (neither / inventory only / payment only / both); `getActiveOrders`/`getRecentOrders`/`getOrdersAction` exclusion of `isDeleted: true`; `deleteTab`'s new `revertPayment` branch including the `partialPayments` refusal; `financial-report-service` integration test confirming a reverted order/tab-order is excluded from a subsequent report run.
- **E2E coverage:** delegated to `e2e-test-engineer` after plan approval. Target journeys: super-admin deletes an order with both checkboxes, confirms disappearance from the list and inventory/report effects; super-admin deletes a tab with the new payment checkbox; non-super-admin sees the delete control disabled/blocked on a live order or tab.
- **Manual smoke after deploy:** delete a fully-inert test order (no override) and confirm it disappears from the list; as super-admin, delete a paid test order with both reverts and confirm inventory + next day's report reflect it.
- **Monitoring / alerting:** none new — relies on the existing audit-log trail; no new dashboards required for v1.

## 9. Sign-off

- **Plan reviewer (eng):** Pending independent review.
- **Plan reviewer (security / DPO):** N/A — no new personal-data purpose; §5's erasure-scope clarification is the load-bearing privacy note for this REQ.
- **Plan approved by operator:** Pending HIGH-risk approval.
