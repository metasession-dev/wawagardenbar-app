# Implementation Plan — REQ-025

**Requirement:** REQ-025
**GitHub Issue:** #50
**Risk Level:** HIGH (financial calculations + user-facing; AI involvement raises from MEDIUM)
**Date:** 2026-04-12

## Approach

Add a `businessDate` field to `Order` and `Tab`, set at payment/close time using a configurable `businessDayCutoff` time. Admins see a prominent pre-checked checkbox when closing orders/tabs before the cutoff, giving explicit control over day attribution. Report and Staff Pot queries swap from midnight-to-midnight timestamp ranges to filtering by `businessDate`. Actual timestamps (`paidAt`, `closedAt`) are never mutated.

## Files to Create

- `lib/business-date.ts` — pure utility: `deriveBusinessDate(now, cutoffTime)` and `shouldShowPreviousDayCheckbox(now, cutoffTime)`
- `scripts/backfill-business-dates.ts` — one-time migration script to set `businessDate` on all existing paid orders and closed tabs using current cutoff setting
- `compliance/evidence/REQ-025/implementation-plan.md` (this file)
- `compliance/evidence/REQ-025/test-scope.md`
- `compliance/evidence/REQ-025/test-plan.md`
- `compliance/evidence/REQ-025/ai-use-note.md`

## Files to Modify

### Data model

- `interfaces/order.interface.ts` — add `businessDate?: Date`
- `models/order-model.ts` — add `businessDate: { type: Date, index: true }` field
- `interfaces/tab.interface.ts` — add `businessDate?: Date`
- `models/tab-model.ts` — add `businessDate: { type: Date, index: true }` field

### System settings

- `services/system-settings-service.ts` — add `getBusinessDayCutoff(): Promise<string>` and `updateBusinessDayCutoff(time, adminId)` (stored under key `business-day-cutoff`, default `"15:00"`)
- `app/dashboard/settings/page.tsx` — add Business Day Cutoff time input in the super-admin section
- `app/dashboard/settings/actions.ts` — add `getBusinessDayCutoffAction` and `updateBusinessDayCutoffAction`

### Business date derivation — order write paths

- `services/order-service.ts` → `updatePaymentStatus()` — accept optional `businessDate?: Date`; if not supplied, auto-derive via `deriveBusinessDate(new Date(), cutoff)`. Also update the manual payment path (`markOrderPaid` equivalent at line ~622)
- `app/actions/admin/order-payment-actions.ts` — accept and forward `businessDate` from UI
- `app/api/webhooks/monnify/route.ts` — auto-derive `businessDate` when setting `paidAt` (no UI checkbox here — webhook payment)
- `app/api/webhooks/paystack/route.ts` — same as above
- `app/api/public/payments/verify/route.ts` — auto-derive `businessDate` when calling `updatePaymentStatus`

### Business date derivation — tab write paths

- `services/tab-service.ts` → `markTabPaid()` (×2 overloads), `closeTab()` — accept optional `businessDate?: Date`; auto-derive if not supplied
- `app/actions/tabs/tab-actions.ts` → `closeTabAction()` — accept and forward `businessDate`
- `app/actions/admin/express-actions.ts` → `expressCloseTabAction()` — accept and forward `businessDate`

### Report query swap

- `services/financial-report-service.ts` — `generateDailySummary()` and `generateDateRangeReport()`: replace `paidAt` range queries with `businessDate` equality/range. Partial payments section: filter `Tab.businessDate` in range instead of `partialPayments.paidAt`
- `app/api/public/sales/summary/route.ts` — replace `paidAt` range with `businessDate` range

### UI — checkbox

- `components/features/admin/order-payment-info.tsx` (or order payment modal) — add prominent pre-checked checkbox: **"Attribute to previous business day (Weekday DD Mon)"** visible only when `shouldShowPreviousDayCheckbox()` is true and role is admin/super-admin
- `app/dashboard/orders/express/close-tab/page.tsx` — same checkbox in express tab close flow
- `components/features/admin/tabs/admin-pay-tab-dialog.tsx` — same checkbox in pay tab dialog
- Any other admin-facing order payment confirmation UI identified during implementation

## Architecture Decisions

- **`businessDate` is a plain `Date` stored at midnight UTC** (e.g. `2026-04-11T00:00:00.000Z`) — makes range queries simple and unambiguous
- **`deriveBusinessDate` utility is pure** (no DB calls) — takes `now: Date` and `cutoffTime: string` ("HH:MM"), returns the correct `Date`. Cutoff comparison uses local server time matching the business timezone
- **Checkbox is pre-checked by default** when shown — this is the common case (staff are entering late orders)
- **Webhooks auto-derive** — no UI available, so `businessDate` is derived automatically using the stored cutoff
- **Partial payments**: `Tab.businessDate` is set at tab close time, not per partial payment — the whole tab is attributed to one business day when it closes
- **Backfill script** uses `paidAt`/`closedAt` and the current cutoff to derive `businessDate` for all historical records — run once on UAT then production post-deploy

## Dependencies

- None (no new npm packages)

## Risks / Considerations

- **Existing records have no `businessDate`** — queries will exclude them until the backfill script runs. Run the backfill on UAT immediately after deploy, verify reports match pre-deploy numbers, then run on production
- **Timezone** — `deriveBusinessDate` must use the business's local timezone (WAT, UTC+1). Server may run in UTC. Need to ensure cutoff comparison accounts for this. Use `date-fns-tz` already in the project if available, or offset manually
- **Partial payments across midnight** — if a tab has partial payments on different sides of midnight, all revenue is attributed to the `businessDate` of the tab close. This is the intended behaviour
- **Report consistency** — after the swap, running a report for "today" before any orders are paid will show 0 even if some orders were paid after midnight (they are on yesterday's `businessDate`). This is correct but may surprise staff initially — document in settings UI

## Post-Deploy Actions

1. Run `npx ts-node scripts/backfill-business-dates.ts --env uat` on UAT after deploy
2. Verify daily reports match expected numbers for recent days on UAT
3. Run `npx ts-node scripts/backfill-business-dates.ts --env production` on production after production deploy
