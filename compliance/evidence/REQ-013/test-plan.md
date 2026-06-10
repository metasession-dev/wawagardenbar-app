# REQ-013 — Test plan (backfill)

**Requirement ID:** REQ-013
**Risk:** HIGH
**Related issue:** [#10](https://github.com/metasession-dev/wawagardenbar-app/issues/10)
**Date:** 2026-03-26 (original) — backfilled 2026-06-10

> **Backfill note.** REQ-013 (mandatory payment method on orders + tabs, plus the partial-payment + close-tab daily-report aggregation contract) was released on 2026-03-28 (RTM: `APPROVED - DEPLOYED`). The release predates the compliance-validator artifact requirement (`test-plan.md` mandatory for any REQ referenced in PR commits). This file backfills the artifact retroactively to document the tests that were already in place at release, plus the no-double-count unit pin landed alongside (PR #353).

## Acceptance criteria → tests

| AC  | Statement                                                                                                                  | Test                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `paymentMethod` is required on every Order create / mutation path                                                          | `__tests__/services/payment-service.test.ts` — order-create paths reject without paymentMethod. Live coverage via `e2e/daily-report-payments.spec.ts` order/tab creation flows.                                       |
| AC2 | Tab full payment via `completeTabPaymentManually` accepts only `cash`/`card`/`transfer`                                    | `__tests__/services/tab-service.tip.test.ts` — validates paymentType enum, rejects unknown values.                                                                                                                    |
| AC3 | Daily-report `paymentBreakdown` aggregates each Order's `paymentMethod` into the matching bucket                           | `__tests__/services/financial-report-service.tip.test.ts` AC6 — `paymentBreakdown.total` reflects ordered totals, methods bucket correctly. `__tests__/reports/payment-method-aggregation.test.ts` — bucket coverage. |
| AC4 | Partial-payment rows on tabs aggregate into `paymentBreakdown` by `paymentType`                                            | `__tests__/services/financial-report-service.tip.test.ts` — partial-payment tip aggregation pins paymentType routing.                                                                                                 |
| AC5 | No double-counting — when an order belongs to a tab with partial payments, the order's contribution is reduced accordingly | **NEW** `__tests__/services/financial-report-service.partial-payment-no-double-count.test.ts` — pins the canonical close-tab scenario (612 cash partial + 918 card closing + 1 order on tab) → 612/918/1530 clean.    |
| AC6 | `daily-report-payments.spec.ts` E2E proves the contract at integration level                                               | `e2e/daily-report-payments.spec.ts` — baseline → create tab → partial → close → daily report assertion. Block 1: "no double-counting"; Block 2: "partial on open tab appears in daily report".                        |

## Test environment

- **Unit:** vitest 4.1.x. `@/lib/mongodb` + Mongoose models mocked at the import boundary; `find().lean()` chainables return per-case fixtures. Same pattern as the rest of `__tests__/services/financial-report-service.*`.
- **E2E:** Playwright via the existing 2-project setup (smoke + regression by location). `daily-report-payments.spec.ts` runs in the regression project against UAT.

## Quality gates

| Gate                                                                         | Expected   |
| ---------------------------------------------------------------------------- | ---------- |
| `npx tsc --noEmit`                                                           | exit 0     |
| `npx vitest run` (full)                                                      | 0 failures |
| `npm run build`                                                              | exit 0     |
| `npx playwright test e2e/daily-report-payments.spec.ts --project=regression` | green      |

## Known limitations

- The Playwright `daily-report-payments` spec uses `test.describe.serial` with `retries: 2` against shared UAT state. Retry semantics + UAT residue can produce spurious "double-counting" failures unrelated to the product code (tracked in #352 — `Regression-pack: UAT shared-state pollution amplified by Playwright serial retries`). The unit-level pin in `financial-report-service.partial-payment-no-double-count.test.ts` is the deterministic guard against any real product regression.
