# Test Plan — REQ-025

**Requirement:** REQ-025
**Risk Level:** HIGH
**GitHub Issue:** #50
**Date:** 2026-04-12

## Tests to Add

- [ ] `__tests__/lib/business-date.test.ts` — unit tests for `deriveBusinessDate()` and `shouldShowPreviousDayCheckbox()`: before cutoff → previous day, at cutoff → today, after cutoff → today, midnight edge case, default cutoff fallback
- [ ] `__tests__/reports/business-date-attribution.test.ts` — unit tests: orders with `businessDate = yesterday` appear in yesterday's report, not today's; orders with `businessDate = today` appear in today's report only
- [ ] `e2e/business-day-cutoff.spec.ts` — E2E: super-admin sets cutoff in settings; admin closes a tab before cutoff and verifies checkbox is shown pre-checked; verifies `businessDate` on saved tab; verifies daily report attribution

## Tests to Update

- [ ] `__tests__/reports/total-revenue-consistency.test.ts` — update fixtures to include `businessDate` field on test orders/tabs so existing assertions still pass after query swap
- [ ] `__tests__/reports/payment-method-aggregation.test.ts` — same: add `businessDate` to fixtures
- [ ] `__tests__/tabs/partial-payment-validation.test.ts` — add `businessDate` assertion: tab close sets correct `businessDate`

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion                              | Test File                                             | Test Name                                   |
| ------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| `deriveBusinessDate` before cutoff → previous day | `__tests__/lib/business-date.test.ts`                 | `returns previous day when before cutoff`   |
| `deriveBusinessDate` at/after cutoff → today      | `__tests__/lib/business-date.test.ts`                 | `returns today when at or after cutoff`     |
| Report uses `businessDate` not `paidAt`           | `__tests__/reports/business-date-attribution.test.ts` | `attributes order to businessDate day`      |
| Checkbox shown pre-cutoff, admin only             | `e2e/business-day-cutoff.spec.ts`                     | `shows pre-checked checkbox before cutoff`  |
| Checkbox hidden after cutoff                      | `e2e/business-day-cutoff.spec.ts`                     | `hides checkbox after cutoff time`          |
| Cutoff setting saved by super-admin               | `e2e/business-day-cutoff.spec.ts`                     | `super-admin can update cutoff in settings` |
| Staff Pot reflects corrected revenue              | `e2e/business-day-cutoff.spec.ts`                     | `staff pot uses businessDate revenue`       |

## Non-Functional Tests

- [ ] Security: verify customer-role requests cannot supply or override `businessDate` — API route test
- [ ] Security: verify `updateBusinessDayCutoffAction` rejects non-super-admin callers
- [ ] Input validation: cutoff time `"25:00"`, `"abc"`, empty string all rejected with 400/error

## Test Data Requirements

- Test orders need `businessDate` field populated — add to all existing order fixtures in the reports test directory
- `__tests__/lib/business-date.test.ts` needs no DB — pure unit test, no seeding required
- E2E test needs an admin-role session (already available in existing E2E auth helpers)
