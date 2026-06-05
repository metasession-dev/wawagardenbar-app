# REQ-069 — Test execution summary

**Run date:** 2026-06-04
**Branch:** `feat/REQ-069-payments-webhooks-e2e`

## Vitest (unit + integration)

```
RUN  v4.1.8 /home/william/Documents/SoftwareProjects/Metasession/wawagardenbar app

 Test Files  121 passed | 1 skipped (122)
      Tests  1129 passed | 4 skipped (1133)
   Duration  3.71s
```

**REQ-069 cases (new):** 0 (this REQ adds zero unit tests). The new helpers are exercised by the E2E specs; the helpers' signature contract is byte-compatible with the existing `__tests__/api/webhooks/*-idempotency.test.ts` fixtures so a route-handler regression would fail both layers in lockstep.

## E2E (Playwright)

### Focused REQ-069 run against UAT

```
[auth-setup] auth.setup.ts × 3                                                                  ✓
[regression] e2e/payments/webhook-idempotency-replay.spec.ts                                    ✓ × 2 (11.8s, 9.4s)
[regression] e2e/payments/webhook-signature-rejection.spec.ts                                   ✓ × 3 (5.5s, 5.1s, 5.1s)

 8 passed (49s)
```

### What AC3 pins

The monnify idempotency-replay spec validates REQ-049's load-bearing protection against double-charging customers when a webhook is delivered twice:

- **First delivery**: 200 + order paymentStatus flips `pending` → `paid` + status flips `pending` → `confirmed` + `paidAt` timestamp set + one ProcessedWebhookEvent row written.
- **Replay** (same `transactionReference`): 200 + "Event already processed" body + order state unchanged from after first delivery + ProcessedWebhookEvent row count remains 1.
- **Different transactionReference for same paymentReference**: NOT a dup — both events recorded, proving the dedup key is per-event-id, not per-payment-reference (a stricter dedup would break legitimate retries from upstream).

Without this spec, REQ-049's contract — the load-bearing protection against double-charging — had zero E2E pinning. A regression in `recordWebhookEvent` or in the route handler's dedup-gate-ordering would not have been caught by any automated test except the targeted unit tests (which mock the dedup helper).

### What AC2 pins

The signature-rejection spec validates that the HMAC-SHA512 verification on both providers' webhook routes:

- Rejects payloads signed with wrong key (paystack + monnify both return 401).
- Rejects payloads sent without any signature header (paystack returns 401).
- Does NOT mutate any order state when rejecting.

This is the auth surface for an unauthenticated public endpoint. A regression here would let an attacker mark arbitrary orders as paid by forging the webhook body.

## TypeScript

```
$ npx tsc --noEmit
# exit 0
```

0 errors.

## ESLint

```
$ npx eslint . --max-warnings=10000
✖ 950 problems (0 errors, 950 warnings)
```

0 errors; 950 pre-existing `no-console` warnings unchanged.

## Build

Not re-run for this REQ (zero production-code changes). Last green build was at REQ-066 close-out.

## Regression posture

- Vitest: 1129 / 1133 (99.6% pass; 4 skipped are pre-existing).
- Focused REQ-069 E2E: 8/8 pass live against UAT.
- Full regression pack: to be run at evidence-pack push time per `feedback_phase3_release_ticket_mandatory`.
- Net delta vs REQ-066 close-out baseline: +5 E2E test cases (2 specs × 5 cases), 0 unit tests, 0 regressions.
