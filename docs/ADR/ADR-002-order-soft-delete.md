---
adr_id: 'ADR-002'
status: 'Proposed'
date: '2026-07-28'
authored_by: 'sdlc-implementer@1.0'
related_reqs: ['REQ-096']
supersedes: []
superseded_by: null
---

# ADR-002: Order deletion is a soft delete, not a hard delete

## Status

**Proposed** (DRAFT — operator to flip to _Accepted_ on plan APPROVAL)

## Context

REQ-096 (issue #612) adds order deletion — a capability that doesn't exist today (only `cancelOrder`, which is status-only and never removes a document). It also extends the existing `TabService.deleteTab()` with a payment-revert option. `deleteTab` already does a true hard delete (`TabModel.findByIdAndDelete`) and this is safe for tabs: nothing outside the Tab collection points at a Tab id.

An Order is different — it is a leaf financial record that other collections point _at_: `Payment.orderId`, `AuditLog.resourceId` (when `resource: 'order'`), loyalty-points transactions, and `Tab.orders` (when the order is tab-linked). A hard delete of the Order document would either orphan all of those references, or require deleting them too, at real audit-trail-integrity risk for a compliance-governed financial application. Separately, a hard-deleted order can never reappear in a `financial-report-service.ts` `paymentStatus: 'paid'` query regardless of any status flip — meaning a "reverse payment" step immediately preceding a hard delete would be functionally pointless for the order path (report-correctness would already be guaranteed by the row simply being gone), which would make the feature's own core mechanic (independent inventory/payment revert choices) inconsistent between the order and tab paths.

## Decision

Order deletion is implemented as a **soft delete**: three additive fields — `isDeleted: boolean` (default `false`), `deletedAt?: Date`, `deletedBy?: ObjectId (ref User)` — on `models/order-model.ts`. `OrderService.deleteOrder()` never calls `Order.findByIdAndDelete` or equivalent; it sets these fields (plus the existing independent inventory/payment revert side-effects) and the document remains in MongoDB permanently. Every surface that lists or aggregates "active" orders (`OrderService.getActiveOrders()`, `OrderService.getRecentOrders()`, `getOrdersAction`'s default query) is updated to filter `isDeleted: { $ne: true }`. The order detail page (`/dashboard/orders/[orderId]`) remains reachable by direct ID and renders a "Deleted" banner when `isDeleted` is true, rather than 404ing — preserving audit/debugging access.

`TabService.deleteTab()` keeps its existing true hard-delete for the Tab document itself (unchanged, out of scope for this decision) — only the order-path gets soft-delete semantics, since Tab has no incoming references to protect.

## Consequences

- **Good:** Referential integrity is preserved — `Payment.orderId`, `AuditLog.resourceId`, loyalty-points transactions, and `Tab.orders` all continue to resolve after an order is "deleted." The payment-revert mechanic is meaningful and consistent across both the order and tab paths (the row surviving is what makes the `paymentStatus` flip do real work for report exclusion). No migration is required — `isDeleted: { $ne: true }` matches missing/undefined/false alike, so every pre-existing order is implicitly "not deleted."
- **Bad:** Every current and future query that lists/aggregates orders must remember to filter `isDeleted`, or a "deleted" order silently leaks back into an active view. This REQ enumerates and fixes the three known surfaces (Surface inventory table, plan §2) but is not a structural guarantee against a future query forgetting the filter — no query-builder-level enforcement (e.g. a Mongoose default scope) is introduced in v1.
- **Neutral / tradeoffs:** "Delete" now means two different things in this codebase depending on entity — a true removal for Tab, a soft hide for Order. This asymmetry is intentional (documented here) rather than accidental, but it is still an asymmetry a future contributor must learn.

## Alternatives considered

- **True hard delete, mirroring `deleteTab` exactly:** Simpler, and literally what issue #612 originally proposed. Ruled out because it orphans `Payment`/`AuditLog`/loyalty-points/`Tab.orders` references, and makes the "reverse payment" checkbox meaningless on the order path specifically (the row's absence already guarantees report exclusion, so the flip achieves nothing) — inconsistent with the same mechanic being load-bearing on the tab path.
- **Hard delete, but only ever permitted on fully-inert orders (already cancelled, already unpaid, not tab-linked):** Avoids the referential-integrity risk by construction, since the override path would never actually fire on a "live" order. Ruled out because it narrows the feature below what #612 asked for — the inventory/payment revert checkboxes would never apply on the order path, only the tab path, breaking the parity between the two deletion flows that this REQ is meant to establish.
- **Query-builder-level default scope (e.g. a Mongoose plugin auto-excluding `isDeleted: true` on every `Order.find`):** Would close the "Bad" consequence above structurally. Deferred rather than ruled out — it's a larger, cross-cutting change to the Order model's query surface that this REQ's scope doesn't need to force; the three enumerated surfaces are sufficient for the ACs in this REQ. Worth a follow-up issue if a fourth un-filtered surface is found later.

## Cross-references

- Implementation plan: `compliance/plans/REQ-096/implementation-plan.md`
- SRS items: REQ-ORDMGT-013 (new — delete order), REQ-ORDMGT-014 (new — inventory/payment revert choices), REQ-TABMGT-004 (existing, updated — tab payment-revert + partial-payments guard)
- Risk register: populated by `risk-register-keeper` (mandatory at HIGH risk) — see plan §4
- Supersedes / superseded-by: none
