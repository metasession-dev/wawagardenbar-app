# Implementation Plan — REQ-012

**Requirement:** REQ-012
**GitHub Issue:** #9
**Risk Level:** HIGH
**Date:** 2026-03-26

## Approach

Add a `partialPayments` embedded array to the Tab model to record each partial payment with amount, note, payment type, and timestamp. Extend the AdminPayTabDialog to offer a "Partial Payment" mode alongside the existing full payment flow. Display partial payment history chronologically on the tab details page and correctly calculate the outstanding balance.

## Files to Modify

- `interfaces/tab.interface.ts` — Add `IPartialPayment` interface and `partialPayments` field to `ITab`
- `models/tab-model.ts` — Add `partialPayments` subdocument schema to Mongoose model
- `services/tab-service.ts` — Add `recordPartialPayment()` method; update `completeTabPaymentManually()` to validate remaining balance
- `app/actions/tabs/tab-actions.ts` — Add `recordPartialPaymentAction()` server action with auth and validation
- `components/features/admin/tabs/admin-pay-tab-dialog.tsx` — Add partial payment mode with amount input, mandatory note, and payment type; pass outstanding balance as prop
- `components/features/admin/tabs/dashboard-tab-actions.tsx` — Pass `partialPayments` to dialog for balance calc
- `components/features/admin/tabs/dashboard-tabs-list-client.tsx` — Pass `partialPayments` to dialog
- `app/dashboard/orders/tabs/[tabId]/page.tsx` — Display partial payment history section; serialize partialPayments; show outstanding balance

## Architecture Decisions

- **Embedded array vs separate collection:** Use embedded array on Tab document. Partial payments are always accessed with the tab, never queried independently, and the array will be small (typically <10 entries per tab). This avoids extra queries and maintains atomicity.
- **Outstanding balance calculation:** `outstandingBalance = tab.total - sum(partialPayments.amount)`. Calculated at read time, not stored, to avoid drift.
- **Tab-only constraint:** The partial payment option is only rendered in tab payment flows. Order payment dialogs are not modified.
- **Audit logging:** Each partial payment creates an audit log entry, consistent with existing manual payment audit pattern.

## Dependencies

- None — no new packages required

## Risks / Considerations

- Concurrent partial payments on the same tab could cause race conditions. Mitigated by using `findById` + validation + save (Mongoose optimistic concurrency).
- Must ensure the final "close tab" payment correctly uses the remaining balance, not the original total.
- Daily report aggregation reads from Order `paymentMethod`. Partial payments on tabs are recorded on the Tab, not Order. Need to ensure partial payment amounts appear in financial reports — they will be attributed when the tab is eventually closed and orders marked paid.
