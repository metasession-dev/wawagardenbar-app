# Test Plan — REQ-085

**Requirement:** REQ-085
**Risk Level:** HIGH
**GitHub Issue:** #410
**Date:** 2026-06-25

## Tests to Add

- [x] `__tests__/services/tab-service.payment-status-preservation.test.ts` — Unit: AC2 (markTabPaid $set has no status), AC1 (completeTabPaymentManually $set has no status), payment fields ARE updated
- [x] `e2e/critical/tab-payment-no-status-reset.spec.ts` — E2E (critical): AC1 (status preservation after manual tab payment), AC4 (labeled badges on order details), AC5 (payment badge on order queue), AC6 (payment indicator on kitchen display)

## Test Files

| File                                                                 | Type           | ACs Covered             |
| -------------------------------------------------------------------- | -------------- | ----------------------- |
| `__tests__/services/tab-service.payment-status-preservation.test.ts` | Unit           | AC1, AC2, AC3           |
| `e2e/critical/tab-payment-no-status-reset.spec.ts`                   | E2E (critical) | AC1, AC3, AC4, AC5, AC6 |

## Verification Strategy

- **Unit:** Vitest — 6 tests verifying both `markTabPaid` and `completeTabPaymentManually` do NOT include `status` in `$set`, and that payment fields (`paymentStatus`, `paidAt`, `paymentMethod`, `businessDate`) ARE updated correctly
- **E2E:** Playwright critical tier — 4 tests covering status preservation (AC1), labeled badges on order details (AC4), payment badge on order queue (AC5), payment indicator on kitchen display (AC6). Each test runs in both critical and regression tiers (8 total + 3 auth setup = 11)
- **Regression:** Existing tab payment E2E tests (`close-tab-tip-capture.spec.ts`, `partial-payments.spec.ts`, `reconciliation.spec.ts`) — 13 passed, 20 skipped (no open tabs in test DB — expected)
- **Manual smoke:** UAT verification on Railway auto-deploy (health check, labeled badges visible on dashboard pages)
