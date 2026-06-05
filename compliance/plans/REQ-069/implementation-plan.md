# REQ-069 — Payments & webhooks E2E coverage (sub-issue #294)

**Status:** IN PROGRESS · **Risk:** MEDIUM · **Issue:** [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))

## Context

The payments + webhooks subsystem has substantial backend work shipped (REQ-049 webhook idempotency RELEASED 2026-05-28; REQ-066 AC1-AC6 chokepoint refactor RELEASED 2026-06-04) but **zero E2E pinning** of the webhook signature, idempotency-replay, or order-flow behaviors. The umbrella SRS audit (2026-06-04) flagged this as the highest-value gap because:

- REQ-049's idempotency-key dedup is the load-bearing protection against double-charging customers when a webhook is delivered twice.
- The chokepoint refactor in REQ-066 changed which side-effects fire from the webhook handler — those changes have unit-test coverage but no end-to-end pin.
- The signature-verification path is the auth surface for an unauthenticated public endpoint.

Sub-issue #294 owns the provider-mock infrastructure that #292 and #293 also depend on for customer-PIN-flow E2E.

## Acceptance criteria

1. **AC1 — Webhook mock infrastructure** authored as reusable helpers.
   - `e2e/helpers/webhook-mock.ts` — HMAC-SHA512 signature generators matching paystack + monnify route handler verification exactly + `sendWebhook` HTTP dispatcher.
   - `e2e/helpers/payment-provider-mock.ts` — paystack (`charge.success`, `charge.failed`) + monnify (`PAID`, `FAILED`, etc.) payload builders matching the wire shape the existing unit tests use.
   - Helpers read provider secrets from the SAME source the server reads (`MONNIFY_SECRET_KEY` env for monnify; SystemSettings.paystack.secretKey for paystack), so the server's verification accepts the generated signatures.

2. **AC2 — Signature rejection E2E** for both providers.
   - `e2e/payments/webhook-signature-rejection.spec.ts`:
     - paystack: invalid signature → 401, order paymentStatus unchanged
     - monnify: invalid signature → 401, order paymentStatus unchanged
     - paystack: missing signature header → 401
   - Each test seeds a pending order, fires the synthetic webhook, asserts route returns 401 + order state preserved. Cleanup deletes seeded order + any incidental webhook-event rows.

3. **AC3 — Monnify idempotency-replay E2E** pinning REQ-049's backstop.
   - `e2e/payments/webhook-idempotency-replay.spec.ts`:
     - First delivery: 200 + order flips pending → paid + ProcessedWebhookEvent row created.
     - Replay (same transactionReference): 200 + "Event already processed" response + ZERO additional side effects + ProcessedWebhookEvent row count stays at 1.
     - Different transactionReference for same paymentReference: NOT a dup (proves the dedup key is per-event, not per-payment).
   - Uses monnify because the secret is env-based; paystack idempotency is deferred (see _Deferred to follow-up_).

## Deferred to follow-up (not in this PR)

- **Paystack idempotency replay spec** — needs `SystemSettings.payment.paystack.secretKey` configured on UAT (currently unset). Will require either operator-driven UAT configuration OR a synthetic-secret seed step before the spec can run. Tracked at the bottom of sub-issue #294.
- **Payment-init happy-path specs (paystack + monnify)** — would exercise `createOrder` → `initializePayment` flow end-to-end. Requires either real provider calls (creates real test charges) OR a mock-checkout-URL flag (`ENABLE_TEST_PAYMENTS=true`) on UAT. Operator decision needed.
- **REQ-PAY-004 partial-payment-reconciliation spec** — partially covered by existing `e2e/partial-payments.spec.ts` (UI structure) + `e2e/daily-report-payments.spec.ts` (tab + partial cash + card closure). A dedicated SRS-traced spec for the financial reconciliation contract is the natural next add but not blocking the V1 ship.

These three deferrals are documented in the sub-issue #294 GitHub issue body as a checklist; they ship in a follow-up cycle once their prerequisites land.

## Technical approach

### New helper files (2)

- `e2e/helpers/webhook-mock.ts` — pure functions for signature generation + Node fetch helper for dispatch. Zero Playwright dependency so the helpers can be reused by unit tests if needed.
- `e2e/helpers/payment-provider-mock.ts` — pure payload builders. Shapes match the existing unit-test fixtures verbatim, so if the route handler grows a new required field the unit tests + E2E specs fail in lockstep.

### New E2E spec files (2)

- `e2e/payments/webhook-signature-rejection.spec.ts` — 3 tests, no secret needed.
- `e2e/payments/webhook-idempotency-replay.spec.ts` — 2 tests, uses `MONNIFY_SECRET_KEY` env.

### No production code changes

This is a pure test-pack-coverage cycle. Zero changes to `app/api/webhooks/*`, `services/paystack-service.ts`, `services/monnify-service.ts`, or any service.

## Risk

**MEDIUM.** Net-new specs covering an existing financial-correctness path (webhook idempotency = double-charge protection). The HMAC-SHA512 signature generators must match the server's verification byte-for-byte; any mismatch is detected at signature-rejection time (server returns 401) so a bug in the helper is loud, not silent.

**No production runtime change** — pure test addition.

## Security considerations

- The signature-generation helpers read the same secret the server reads (env var for monnify; SystemSettings DB row for paystack). Tests run against UAT Mongo + UAT webhook URL — no production touches.
- Synthetic webhooks use `paymentReference: 'E2E-REQ069-*'` prefixes so test orders are easily distinguishable from real ones in audit queries. Cleanup deletes the seeded order + the dedup row in `afterEach`.

## Dependencies

- REQ-049 (RELEASED 2026-05-28) — webhook idempotency that this REQ pins.
- REQ-066 (RELEASED 2026-06-04) — chokepoint refactor; webhook side-effects unchanged but the route handler delegates to it.

## Test scope

Vitest unchanged (1129 pass / 4 skip / 0 fail) — this REQ adds zero unit tests; the helpers are exercised by the E2E specs and indirectly by the existing webhook-idempotency unit tests.

E2E (live against UAT):

- `e2e/payments/webhook-signature-rejection.spec.ts` — 3 tests.
- `e2e/payments/webhook-idempotency-replay.spec.ts` — 2 tests.

Both files configured `describe.configure({ mode: 'serial' })` because they share the UAT processedwebhookevents collection.
