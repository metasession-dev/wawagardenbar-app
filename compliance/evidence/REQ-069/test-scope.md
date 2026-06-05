# REQ-069 — Test scope

## In scope (this PR)

### E2E specs

- `e2e/payments/webhook-signature-rejection.spec.ts` — 3 cases:
  - paystack invalid signature → 401, order unchanged
  - monnify invalid signature → 401, order unchanged
  - paystack missing signature header → 401, order unchanged

- `e2e/payments/webhook-idempotency-replay.spec.ts` — 2 cases:
  - monnify replay (same transactionReference): 200 + zero new side-effects + dedup row count stays at 1
  - monnify different transactionReference for same paymentReference: NOT a dup, both events processed (proves per-event-id dedup, not per-payment-reference)

### Helpers (reusable across sub-issues)

- `e2e/helpers/webhook-mock.ts` — HMAC-SHA512 signature generation matching paystack + monnify route handlers byte-for-byte + `sendWebhook` HTTP dispatcher + secret-reader helpers.
- `e2e/helpers/payment-provider-mock.ts` — paystack (`charge.success`, `charge.failed`) + monnify (`PAID`, `FAILED`, etc.) payload builders matching the wire shape the existing `__tests__/api/webhooks/*-idempotency.test.ts` fixtures use.

## SRS items covered

| SRS ID                                                                                         | Covered by                          | Status                                                              |
| ---------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| REQ-PAY-002 (webhook signature validation rejects forged payloads)                             | webhook-signature-rejection.spec.ts | **Full** for both providers                                         |
| REQ-PAY-002 (webhook idempotency: replay returns same result without re-applying side effects) | webhook-idempotency-replay.spec.ts  | **Full for monnify**; paystack deferred (UAT secret not configured) |
| REQ-049 backstop pin (RELEASED 2026-05-28, previously zero E2E coverage)                       | webhook-idempotency-replay.spec.ts  | **Full for monnify**                                                |

## Out of scope (deferred to follow-up cycles within #294)

These are tracked as a checklist on sub-issue #294 and ship in a follow-up REQ:

| SRS / behavior                                                | Why deferred                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paystack idempotency replay**                               | Needs `SystemSettings.payment.paystack.secretKey` configured on UAT (currently unset per spot-check 2026-06-04). When configured, the same `webhook-idempotency-replay.spec.ts` pattern applies; helper functions already in place.                |
| **Payment-init happy-path (REQ-PAY-001)**                     | Operator decision needed: real provider calls (creates real test charges + needs callback URL exposed) vs `ENABLE_TEST_PAYMENTS=true` mock-checkout-URL flag on UAT.                                                                               |
| **Dedicated REQ-PAY-004 partial-payment-reconciliation spec** | Partially covered today by `e2e/partial-payments.spec.ts` (UI structure) + `e2e/daily-report-payments.spec.ts` (tab + partial cash + card closure). A dedicated SRS-traced spec for the financial reconciliation contract is the natural next add. |

## Out of scope (umbrella tracker — not this sub-issue)

These belong to other sub-issues of [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291):

- Customer-PIN-flow E2E (REQ-AUTHC + REQ-PROFILE) → sub-issue [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292). Will reuse REQ-069's helper infrastructure pattern.
- Rewards pipeline E2E (REQ-048 backstop) → sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293).
- Socket.IO broadcasts → sub-issue [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295).
- Admin destructive ops → sub-issue [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296).
- API contracts + reports + audit → sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297).

## Manual UAT — none required for this REQ

E2E specs run end-to-end against the live UAT webhook endpoints. No human-driven manual validation step needed; the regression pack catches future drift automatically.
