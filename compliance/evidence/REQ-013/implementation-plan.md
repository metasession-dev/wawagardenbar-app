# Implementation Plan — REQ-013

**Requirement:** REQ-013
**GitHub Issue:** #10
**Risk Level:** HIGH
**Date:** 2026-03-26

## Approach

Three workstreams: (1) propagate paymentMethod to orders when tabs are closed, (2) include partial payments in the daily report by querying Tab.partialPayments alongside Order data, (3) ensure no payment can be submitted without a payment method selected. The key challenge is the daily report aggregation — partial payments must be attributed to the correct date and method without double-counting with order totals.

## Files to Modify

### Service Layer
- `services/tab-service.ts`
  - `completeTabPaymentManually()` — set `paymentMethod` on all orders when closing tab
  - `markTabPaid()` — accept and propagate paymentMethod to orders (for gateway payments, map from Monnify method)
- `services/financial-report-service.ts`
  - `generateDailySummary()` — add query for `Tab.partialPayments` filtered by `paidAt` date range; aggregate amounts by payment method into paymentBreakdown; avoid double-counting with order totals (partial payments are tab-level, not order-level, so no overlap)
  - `generateDateRangeReport()` — same changes for date range reports

### Server Actions (Backend Validation)
- `app/actions/tabs/tab-actions.ts`
  - `completeTabPaymentManuallyAction()` — already receives paymentType, no change needed (passes to service)
- `app/actions/admin/express-actions.ts`
  - `expressCloseTabAction()` — already receives paymentType, verify it's required

### UI (Frontend Validation)
- The admin pay tab dialog already requires payment type selection (cash/transfer/card radio group) for both full and partial payments — no UI change needed for tabs
- The express close tab page already requires payment type selection — no UI change needed
- `components/features/admin/orders/admin-pay-order-dialog.tsx` — verify payment type is required before submission (it already has radio group, but need to confirm validation)

## Architecture Decisions

- **Partial payments in daily report — no double-counting:** Partial payments are stored on `tab.partialPayments`, separate from Order documents. When the tab is eventually closed, the orders are marked `paymentStatus: 'paid'` with their full totals. To avoid double-counting, the report must subtract partial payment amounts from the order totals on the tab closing day, or better: when closing a tab with partial payments, only record the final payment amount (outstanding balance) as the order-level revenue, and let the partial payments handle the rest. The simplest approach: query partial payments directly and add to the payment breakdown; for orders on closed tabs, subtract prior partial payments from the order total attribution.

  **Chosen approach:** The report will aggregate two sources:
  1. Orders with `paymentStatus: 'paid'` — existing logic, but for orders belonging to a tab with partial payments, reduce the attributed amount by the sum of partial payments
  2. `Tab.partialPayments` entries where `paidAt` falls in the date range — add to paymentBreakdown by their paymentType

  This ensures: partial payment days get the correct amounts, tab closing day gets only the remaining balance, total across all days equals tab total.

- **paymentMethod on orders:** Set to the payment method used at tab close time. This fixes the "Unspecified" issue for all future tab closures. Historical data remains as-is.

- **No default payment method:** All payment UI already uses radio groups with no default. Validation prevents submission without selection.

## Dependencies

- None — no new packages required

## Risks / Considerations

- Historical orders without paymentMethod will still show as "Unspecified" — this is expected and acceptable; only new payments are affected
- The report aggregation query adds one MongoDB query for Tab.partialPayments per report — acceptable performance impact
- Must handle edge case: tab closed on same day as partial payment — both should appear correctly
- Must handle edge case: tab with partial payments never closed — partial payments still appear in report on their respective days
