# Test Scope — REQ-025

**Risk Level:** HIGH
**Requirement:** Business day cutoff — `businessDate` field on orders/tabs with admin attribution checkbox
**GitHub Issue:** #50
**Date:** 2026-04-12

## Test Approach

Full verification per Test Strategy high-risk requirements.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Security testing (mandatory for HIGH):**

- [ ] Access control: `businessDate` override only accepted from admin/super-admin roles — customer-submitted values ignored
- [ ] Audit logging: settings change for `businessDayCutoff` must produce an audit log entry
- [ ] Input validation: cutoff time field accepts only valid HH:MM values; invalid values rejected with error
- [ ] Error handling: if cutoff setting is unavailable, system falls back to default `"15:00"` — no crash

**Additional high-risk testing:**

- [ ] Financial accuracy: daily report totals must not change for days where all orders were paid after cutoff (i.e., correctly attributed to that day)
- [ ] Financial accuracy: orders paid before cutoff are attributed to the previous business day in reports
- [ ] Regression: existing report tests still pass after query swap
- [ ] Backfill: script correctly derives `businessDate` from `paidAt`/`closedAt` for historical records

## Validation Approach

- Create two test orders: one paid at 02:00 (before 15:00 cutoff), one paid at 16:00 (after cutoff)
- Run daily report for the previous day — confirm only the 02:00 order appears
- Run daily report for the current day — confirm only the 16:00 order appears
- Confirm Staff Pot calculation for the day matches the corrected revenue figure
- Confirm checkbox is visible and pre-checked for admin role before cutoff; hidden after cutoff
- Confirm checkbox is never visible for customer role

## Acceptance Criteria

- [ ] `businessDate` field exists on `Order` and `Tab` models
- [ ] `businessDayCutoff` setting is configurable by super-admin from `/dashboard/settings`
- [ ] Orders/tabs paid/closed before the cutoff time have `businessDate` set to the previous calendar day
- [ ] Orders/tabs paid/closed at or after the cutoff have `businessDate` set to today
- [ ] Admin checkbox is shown (pre-checked) only before the cutoff and only for admin/super-admin roles
- [ ] Admin can uncheck the checkbox to override and attribute to today instead
- [ ] Webhook-paid orders auto-derive `businessDate` (no checkbox)
- [ ] `FinancialReportService.generateDailySummary()` returns revenue for the correct business day
- [ ] Staff Pot calculations reflect the corrected daily revenue
- [ ] Backfill script sets `businessDate` on all existing paid orders and closed tabs
- [ ] All universal gates pass
- [ ] All security testing items pass
