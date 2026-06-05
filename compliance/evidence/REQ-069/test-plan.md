# REQ-069 — Test plan

**Requirement ID:** REQ-069
**Risk:** MEDIUM (financial-correctness path; webhook idempotency = double-charge protection)
**Related issue:** [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Date:** 2026-06-04

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                                                                      | Test                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Webhook mock infrastructure: HMAC-SHA512 signature generators + payload builders + HTTP dispatch matching paystack + monnify route handlers byte-for-byte                                                                      | `e2e/helpers/webhook-mock.ts` + `e2e/helpers/payment-provider-mock.ts` — pure helpers, exercised by AC2 + AC3 specs           |
| AC2 | Webhook signature rejection (both providers) returns 401 + leaves order paymentStatus unchanged                                                                                                                                | `e2e/payments/webhook-signature-rejection.spec.ts` — 3 cases (paystack bad sig, monnify bad sig, paystack missing sig header) |
| AC3 | Monnify webhook idempotency: replay returns 200 + zero new side-effects + ProcessedWebhookEvent row count stays at 1; per-event dedup key not per-payment-reference (different transactionReference triggers fresh processing) | `e2e/payments/webhook-idempotency-replay.spec.ts` — 2 cases (replay-is-no-op, different-txn-ref-is-fresh)                     |

## Test environment

E2E only. Playwright via the existing 2-project setup (smoke + regression by location). Specs:

- Use direct Mongo writes for seeding (same shape as REQ-066's `e2e/admin-order-inventory-delta.*.spec.ts` invariant specs).
- Use raw Node `fetch` for webhook dispatch — no Playwright `page` involvement, runs in any test runner.
- Read `MONNIFY_SECRET_KEY` from the same env the server reads it from. Test must run with the secret matching the UAT server config.
- Configured `describe.configure({ mode: 'serial' })` because they share the UAT `processedwebhookevents` collection.

## Quality gates

| Gate                            | Expected                | Actual (2026-06-04)                                                                                    |
| ------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`              | exit 0                  | exit 0                                                                                                 |
| `npx vitest run` (full)         | 0 failures, 1129+ tests | 1129 pass / 4 skip / 0 fail (unchanged from REQ-066 close-out baseline; this REQ adds zero unit tests) |
| `npx eslint . --max-warnings=0` | 0 errors                | 0 errors                                                                                               |
| `npm run build`                 | exit 0                  | exit 0                                                                                                 |
| E2E focused REQ-069 (UAT)       | 0 failures              | 8 passed (3 auth-setup + 3 signature-rejection + 2 idempotency-replay), 49s wall-clock                 |
| E2E full regression pack (UAT)  | green                   | _to be run at evidence-pack push time_                                                                 |

## Out of scope (this PR)

- **Paystack idempotency replay spec** — needs UAT SystemSettings.payment.paystack.secretKey configured; tracked in sub-issue #294.
- **Payment-init happy-path specs** — needs operator decision on real-provider vs mock-checkout-URL on UAT; tracked in #294.
- **Dedicated REQ-PAY-004 partial-payment-reconciliation spec** — partially covered by existing `e2e/partial-payments.spec.ts` (UI) + `e2e/daily-report-payments.spec.ts` (tab + partial cash + card closure); dedicated SRS-traced spec deferred.
