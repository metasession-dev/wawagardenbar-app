# Test Plan — REQ-017

**Requirement:** Total Revenue reflects money received, not money owed
**Risk Level:** MEDIUM
**Date:** 2026-03-30

## Unit Tests

### New: `__tests__/reports/total-revenue-consistency.test.ts`

| Test                                                               | Description                     |
| ------------------------------------------------------------------ | ------------------------------- |
| totalRevenue equals paymentBreakdown.total when both exist         | Core invariant                  |
| totalRevenue falls back to item revenue when paymentBreakdown is 0 | Backward compat                 |
| margin calculations use item revenue, not payment total            | Gross profit correctness        |
| partial-payment-only day: totalRevenue > 0                         | Regression for the original bug |
| tab close day: totalRevenue = final payment, not full tab total    | No double-counting              |

## E2E Tests

### Update: `e2e/daily-report-payments.spec.ts`

| Test                                                                 | Change                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| "daily report reflects both payment methods with no double-counting" | Verify `totalDelta == tabTotal` still holds          |
| "daily report shows partial payment even though tab is still open"   | Add assertion: `totalRevenue delta >= partialAmount` |

## Regression

Run full Playwright suite — all existing tests must pass.

## Verification

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Full suite — no regressions
