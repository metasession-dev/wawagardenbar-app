---
req: REQ-096
generated_by: adr-author
generated_at: 2026-07-28T07:00:00Z
---

# Architecture decision — REQ-096

## Outcome

**Produced ADR-002:** Order deletion is a soft delete, not a hard delete (`docs/ADR/ADR-002-order-soft-delete.md`)

## Detail

- **ADR file:** `docs/ADR/ADR-002-order-soft-delete.md`
- **Status:** Accepted (operator-confirmed during plan APPROVAL — the design question was posed and answered explicitly before the plan was drafted)
- **Summary:** Order deletion adds three additive fields (`isDeleted`/`deletedAt`/`deletedBy`) rather than removing the document, because an Order is a leaf record other collections point at (`Payment.orderId`, `AuditLog.resourceId`, loyalty-points transactions, `Tab.orders`), and a hard delete would make the payment-revert mechanic pointless on the order path (a gone row can never reappear in a report query regardless of any status flip).
- **Affected files:** `models/order-model.ts`, `services/order-service.ts` (`getActiveOrders`, `getRecentOrders`, new `deleteOrder`), `app/actions/admin/order-management-actions.ts` (`getOrdersAction`).
- **Cross-references:** SRS items REQ-ORDMGT-013, REQ-ORDMGT-014, REQ-TABMGT-004 (updated); Risk register R-013–R-017.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR) matches the actual scope of this REQ — it introduces a new soft-delete concept with no precedent in the codebase.
- [x] The file at `docs/ADR/ADR-002-order-soft-delete.md` is edited from stub to canonical prose and status is Accepted.
- [ ] If no-ADR: N/A.

**Reviewer:** sdlc-implementer@1.0 (AI-assisted; pending operator/UAT review)
**Date:** 2026-07-28
