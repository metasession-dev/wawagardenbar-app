# Release Ticket: REQ-025 — Business Day Cutoff Logic

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-12
**Requirement ID:** REQ-025
**Risk Level:** HIGH
**PR:** [Will be linked when PR is created]

---

## Summary

Adds a `businessDate` field to `Order` and `Tab` models to decouple report attribution from the
actual payment timestamp (`paidAt`). A configurable `businessDayCutoff` setting (default 15:00
WAT) determines whether a payment made in the early hours is attributed to the previous business
day. Admin staff are shown a pre-checked checkbox on all manual payment flows to control this
attribution explicitly.

## AI Involvement

- **AI Tool Used:** Cascade (Codeium)
- **AI-Generated Files:** `lib/business-date.ts`, `components/features/admin/business-day-checkbox.tsx`,
  `components/features/admin/business-day-cutoff-form.tsx`, `scripts/backfill-business-dates.ts`,
  `e2e/business-day-cutoff.spec.ts`, `__tests__/lib/business-date.test.ts`,
  `__tests__/reports/business-date-attribution.test.ts`
- **Human Reviewer of AI Code:** William
- **Components Regenerated:** None

## Implementation Details

**Files Modified:**

- `interfaces/order.interface.ts` — add optional `businessDate: Date` field
- `interfaces/tab.interface.ts` — add optional `businessDate: Date` field
- `models/order-model.ts` — add `businessDate` schema field with index
- `models/tab-model.ts` — add `businessDate` schema field with index
- `lib/business-date.ts` — new: `deriveBusinessDate()`, `shouldShowPreviousDayCheckbox()`, `previousBusinessDayLabel()`
- `services/system-settings-service.ts` — add `getBusinessDayCutoff()` / `updateBusinessDayCutoff()` with validation + audit log
- `services/order-service.ts` — set `businessDate` in `updatePaymentStatus` and `completeOrderPaymentManually`
- `services/tab-service.ts` — set `businessDate` in `markTabPaid`, `completeTabPaymentManually`, `closeTab`
- `services/financial-report-service.ts` — swap `paidAt` range queries to `businessDate`
- `app/api/public/sales/summary/route.ts` — swap `paidAt` query to `businessDate`
- `app/api/webhooks/monnify/route.ts` — derive and set `businessDate` on payment confirmation
- `app/api/webhooks/paystack/route.ts` — derive and set `businessDate` on payment confirmation
- `app/dashboard/settings/actions.ts` — add `getBusinessDayCutoffAction` / `updateBusinessDayCutoffAction`
- `app/dashboard/settings/page.tsx` — integrate `BusinessDayCutoffForm` card
- `app/actions/tabs/tab-actions.ts` — add `businessDate?` param to `completeTabPaymentManuallyAction`
- `app/actions/admin/express-actions.ts` — add `businessDate?` param to `expressCloseTabAction`
- `app/actions/admin/order-payment-actions.ts` — add `businessDate?` to `CompleteOrderPaymentManuallyInput`
- `components/features/admin/business-day-cutoff-form.tsx` — new: settings form component
- `components/features/admin/business-day-checkbox.tsx` — new: admin attribution checkbox (shown before cutoff)
- `components/features/admin/tabs/admin-pay-tab-dialog.tsx` — integrate `BusinessDayCheckbox`
- `components/features/admin/orders/admin-pay-order-dialog.tsx` — integrate `BusinessDayCheckbox`
- `app/dashboard/orders/express/close-tab/page.tsx` — integrate `BusinessDayCheckbox`
- `scripts/backfill-business-dates.ts` — new: one-time backfill for historical records
- `playwright.config.ts` — register `business-day-cutoff` E2E project
- `package.json` / `package-lock.json` — next.js 16.2.1 → 16.2.3 (GHSA-q4gf-8mx6-v5v3 patch)

**Dependencies Added/Changed:**

- `next@16.2.3` — upgraded from 16.2.1 to patch DoS vulnerability GHSA-q4gf-8mx6-v5v3 — clean

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                             |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| E2E (Playwright) | 6     | 6      | 0      | META-COMPLY portal: wawagardenbar-app/REQ-025 |
| Unit             | 249   | 249    | 0      | META-COMPLY portal: wawagardenbar-app/REQ-025 |

## Security Evidence

| Check            | Result          | Evidence Location                                      |
| ---------------- | --------------- | ------------------------------------------------------ |
| SAST             | 0 high/critical | META-COMPLY portal: wawagardenbar-app/REQ-025          |
| Dependency Audit | 0 high/critical | META-COMPLY portal: wawagardenbar-app/REQ-025          |
| Access Control   | PASS            | Git: `compliance/evidence/REQ-025/security-summary.md` |
| Audit Log        | PASS            | Git: `compliance/evidence/REQ-025/security-summary.md` |

## Acceptance Criteria

- [x] `businessDate` field exists on `Order` and `Tab` models
- [x] `businessDayCutoff` setting configurable by super-admin from `/dashboard/settings`
- [x] Orders/tabs paid/closed before cutoff have `businessDate` = previous calendar day
- [x] Orders/tabs paid/closed at or after cutoff have `businessDate` = today
- [x] Admin checkbox shown (pre-checked) only before cutoff, only for admin/super-admin roles
- [x] Admin can uncheck to override attribution to today
- [x] Webhook-paid orders auto-derive `businessDate` (no checkbox)
- [x] `FinancialReportService.generateDailySummary()` returns revenue for correct business day
- [x] Backfill script sets `businessDate` on all existing paid orders and closed tabs
- [x] All universal gates pass (TypeScript, SAST, dep audit, unit tests, E2E, CI)
- [x] All security testing items pass

## Risk Assessment

- **Additive change** — new `businessDate` field does not affect existing `paidAt` timestamps
- **Report query change** — all report queries now use `businessDate`; historical records without
  `businessDate` will be missing from date-ranged reports until the backfill script is run
- **Backfill required** — must run `npx tsx scripts/backfill-business-dates.ts` on production DB
  after deployment; safe to re-run multiple times (idempotent)

## Post-Deploy Actions

| Type           | Script / Command                                             | Target  | Required | Notes                                                                                                                        |
| -------------- | ------------------------------------------------------------ | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Data migration | `npx tsx scripts/backfill-business-dates.ts "[CONN_STRING]"` | Prod DB | Yes      | Derives businessDate from paidAt/closedAt for all existing paid orders and closed tabs. Run with --dry-run first to preview. |

**Run these after deployment, before production verification.**

---

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed (if applicable)
- [ ] No hallucinated dependencies
- [ ] Post-deploy actions documented (or confirmed none required)
