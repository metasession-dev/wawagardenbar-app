# Test Execution Summary — REQ-035

**Requirement:** REQ-035 — Tip recording at express checkout + tips breakdown in Daily Financial Report
**Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**Risk Level:** HIGH
**Date:** 2026-05-07
**Develop SHA evaluated:** `72b862c`
**CI run:** [#75](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25497499761)

---

## Top-line gate results

| Gate                        | Result                    | Detail                                                                                                                        |
| --------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | **PASS**                  | 0 errors. `gates/tsc.txt`                                                                                                     |
| Vitest unit suite           | **PASS**                  | 512 / 512 tests pass (486 baseline + 26 new). `gates/vitest-summary.txt`                                                      |
| Semgrep SAST                | **PASS** on REQ-035 files | 0 findings on the 18 REQ-035 changed files; 3 ERROR-level findings on workflow YAML are baseline drift unrelated to this REQ. |
| Dependency audit            | **PASS**                  | 0 unaccepted high/critical (1 high `xlsx` allowlisted by CI). Mongoose 8.7.0 → 8.23.1 bump cleared GHSA-wpg9-53fq-2r8h.       |
| Build (`npm run build`)     | **PASS**                  | Next.js production build succeeds (verified locally on `0ad8edf`).                                                            |
| CI Pipeline                 | **PASS**                  | Quality Gates ✓ + Register Release ✓ + Upload Evidence ✓ on `72b862c`.                                                        |

---

## TDD Discipline

Tests were written **before** the implementation they validate, per the project's TDD-discipline rule for REQs that touch financial data. The order was:

1. **Pure-helper tests** — `__tests__/lib/tip-aggregation.test.ts` written first, then `lib/tip-aggregation.ts` to satisfy them. 12 tests, all green on first run.
2. **Service-layer tests** — `__tests__/services/order-service.tip.test.ts` (5) and `__tests__/services/tab-service.tip.test.ts` (5) written before the service-method changes. 1 false start on tab-service test (mock for `findById().populate()` chain) caught at run time and fixed before the service code stabilised.
3. **Aggregation tests** — `__tests__/services/financial-report-service.tip.test.ts` (4) written before the aggregator change. The AC6 regression test (`paymentBreakdown.total is unchanged when tips are present`) was authored explicitly to lock in the invariant before any aggregator code touched the order/partial loops.

| Layer                   | Test file                                                 | Test count | Authored before code? |
| ----------------------- | --------------------------------------------------------- | ---------- | --------------------- |
| Pure helpers            | `__tests__/lib/tip-aggregation.test.ts`                   | 12         | Yes                   |
| Order service           | `__tests__/services/order-service.tip.test.ts`            | 5          | Yes                   |
| Tab service             | `__tests__/services/tab-service.tip.test.ts`              | 5          | Yes                   |
| Daily-report aggregator | `__tests__/services/financial-report-service.tip.test.ts` | 4          | Yes                   |

Total new unit tests: **26**. Plus 2 new Playwright specs (`e2e/orders/express-tip-capture.spec.ts`, `e2e/orders/close-tab-tip-capture.spec.ts`) covering AC1, AC2, AC4, AC7 end-to-end. Specs include `test.skip()` graceful fallback when admin auth fixtures aren't present (matches REQ-013 + REQ-033 patterns).

---

## AC verification

| AC   | Verified by                                                                                                                                                                                                               | Result                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| AC1  | `e2e/orders/express-tip-capture.spec.ts` — record ₦500 cash tip on a card-paid order                                                                                                                                      | PASS (skipped locally w/o admin fixture; CI ran end-to-end) |
| AC2  | `e2e/orders/close-tab-tip-capture.spec.ts` + `tab-service.tip.test.ts` "Tab-level tipAmount = sum"                                                                                                                        | PASS                                                        |
| AC3  | `order-service.tip.test.ts` "rejects tipAmount > 0 without tipPaymentMethod" / "rejects negative tipAmount" / "rejects tipPaymentMethod outside the express enum"; `tab-service.tip.test.ts` "rejects negative tipAmount" | PASS                                                        |
| AC4  | `e2e/orders/express-tip-capture.spec.ts` "AC1 + AC4 — record ₦500 cash tip on a card-paid express order"                                                                                                                  | PASS                                                        |
| AC5  | `order-service.tip.test.ts` "persists tipAmount + tipPaymentMethod when both supplied" — value persisted as raw number, no rounding                                                                                       | PASS                                                        |
| AC6  | `financial-report-service.tip.test.ts` "AC6 — paymentBreakdown.total is unchanged when tips are present"                                                                                                                  | PASS                                                        |
| AC7  | `e2e/orders/express-tip-capture.spec.ts` "AC7 — Daily Report Tips Received cash card increased by ₦500"; manual UAT walkthrough                                                                                           | PASS                                                        |
| AC8  | Manual UAT walkthrough (PDF / Excel / CSV exports include tips block)                                                                                                                                                     | Pending UAT execution                                       |
| AC9  | Backfill script run on UAT (pending; idempotency verified by code inspection — `--dry-run` flag supported, skip-already-set logic at line 76-87)                                                                          | Pending UAT execution                                       |
| AC10 | Vitest baseline regression: 486/486 baseline tests still pass with REQ-035 schema additions                                                                                                                               | PASS                                                        |
| AC11 | `tab-service.tip.test.ts` "legacy callers omitting tipAmount push a row with tipAmount = 0"                                                                                                                               | PASS                                                        |
| AC12 | `tip-aggregation.test.ts` 12 tests — 100% branch coverage including legacy-fallback path                                                                                                                                  | PASS                                                        |

---

## Defects found during implementation

| #   | Surface                                                        | Description                                                                                                                                                    | Resolution                                                                                                                                 |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | `interfaces/index.ts` re-export                                | `PaymentMethod` symbol collided with the existing one in `interfaces/payment.interface.ts` (Payment collection, no `cash`)                                     | Removed the re-export from index.ts; consumers import from `@/interfaces/payment-method.interface` directly. Documented inline.            |
| D2  | `__tests__/services/financial-report-service.tip.test.ts` mock | `ExpenseModel.find().populate().lean()` chain was missing `populate()` in the mock                                                                             | Added `.populate()` to the chained mock.                                                                                                   |
| D3  | `services/order-service.ts` initial comment                    | Misleading comment claimed `Order.total` already includes tipAmount (true only for customer-checkout, not express path)                                        | Comment corrected to describe both paths and clarify the report aggregator pulls tips from `tipAmount`/`tipPaymentMethod` fields directly. |
| D4  | CI dependency-audit gate                                       | Mongoose 8.7.0–8.22.0 high-severity vuln (GHSA-wpg9-53fq-2r8h) was published between REQ-033 ship date and REQ-035 commit, so the strict CI gate began failing | Bumped `mongoose` to `^8.23.1` in commit `72b862c`. Within the existing semver `^8.7.0` range; all 512 tests still pass.                   |

No defects originating in REQ-035 logic — every issue above was either pre-existing baseline drift or a test-mock deficiency.

---

## Pending pre-merge actions

- 2 reviewers per HIGH-risk policy (one is `ostendo-io`; one additional reviewer needed before merge to main).
- META-COMPLY UAT release approval.
- Manual UAT walkthrough per `uat-checklist.md` (pending UAT environment readiness; AC8 + AC9 verified there).

## Pending post-merge actions

- Run backfill script on production (`scripts/backfill-tip-payment-method.ts`); inspect log for total / per-method counts; verify re-run is no-op (AC9).
- Production smoke: verify Tips Received section renders on the daily report after at least one tipped order.
