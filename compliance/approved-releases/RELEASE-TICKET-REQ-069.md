# Release Ticket: REQ-069 — Payments + webhooks E2E coverage (sub-issue #294)

**Status:** DRAFT
**Date:** 2026-06-04
**Requirement ID:** REQ-069
**Risk Level:** MEDIUM
**GitHub Issue:** [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Integration PR:** (this PR — to be opened against develop)
**Release PR:** (to be opened against main after evidence pack lands)
**DevAudit Release:** release version `REQ-069`, status `draft` → `uat_review` on this evidence push.
**Sign-off (dual-actor):** Pending UAT approval + Production approval on the DevAudit portal.

---

## Summary

First cycle of umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) (SRS → E2E regression-pack coverage closure). Adds end-to-end test coverage for the webhook signature-rejection + monnify idempotency-replay paths — pinning REQ-049's load-bearing protection against double-charging customers in the regression pack for the first time.

- **AC1 — Webhook mock infrastructure.** New `e2e/helpers/webhook-mock.ts` (HMAC-SHA512 signature generators matching paystack + monnify route handlers byte-for-byte + `sendWebhook` HTTP dispatcher + secret-reader helpers) and `e2e/helpers/payment-provider-mock.ts` (paystack + monnify payload builders matching the wire shape the existing `__tests__/api/webhooks/*-idempotency.test.ts` fixtures use). Reused by sub-issues [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292), [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) when their cycles pick up.
- **AC2 — Webhook signature rejection E2E.** `e2e/payments/webhook-signature-rejection.spec.ts` — 3 cases (paystack bad sig, monnify bad sig, paystack missing sig header). All return 401 + leave order paymentStatus unchanged.
- **AC3 — Monnify idempotency-replay E2E.** `e2e/payments/webhook-idempotency-replay.spec.ts` — 2 cases (replay-is-no-op pinning REQ-049's contract + different-txn-ref-is-fresh proving the dedup key is per-event not per-payment).

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** SRS → E2E gap audit; umbrella + 6 sub-issue creation; implementation plan; helper code; 2 E2E spec files (5 cases); 7-doc evidence pack; release ticket; RTM row.
- **Operator action this cycle:** approved the umbrella + fat sub-issue grouping; chose to start at the recommended pickup order (sub-issue #294). Will perform Stage 4 portal UAT approval + Stage 5 Production approval.

## Implementation Details

**Files Added:**

- `e2e/helpers/webhook-mock.ts` — signature generators + dispatcher + secret readers.
- `e2e/helpers/payment-provider-mock.ts` — paystack + monnify payload builders.
- `e2e/payments/webhook-signature-rejection.spec.ts` — 3 cases.
- `e2e/payments/webhook-idempotency-replay.spec.ts` — 2 cases.
- `compliance/plans/REQ-069/implementation-plan.md` — plan with ACs, risk, security.
- `compliance/evidence/REQ-069/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md` — 6-doc evidence pack.

**Files Modified:**

- `compliance/RTM.md` — REQ-069 IN PROGRESS row added.

**Schema changes:** None. No new packages. No env vars. Pure test addition.

## Test Plan & Evidence

See `compliance/evidence/REQ-069/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1129 pass / 4 skip / 0 fail (unchanged from REQ-066 close-out baseline; this REQ adds zero unit tests).
- TypeScript: 0 errors.
- ESLint: 0 errors / 950 pre-existing console warnings.
- Production build: not re-run (zero production-code changes).
- E2E focused REQ-069 (UAT): **8 passed** (3 auth-setup + 3 signature-rejection + 2 idempotency-replay), 49s wall-clock.
- E2E full regression pack: to be run at evidence-pack push time.

## Security & Compliance

See `security-summary.md` for the STRIDE pass. Headline:

- **No production code change.** Webhook signature verification + idempotency dedup logic untouched.
- **No new auth surface.** Helpers run server-side in the Playwright runner; do not introduce any new API endpoint.
- **Secrets read from the SAME source the server reads** (env for monnify; SystemSettings for paystack). Helpers cannot generate valid signatures without the secret.
- **Synthetic webhooks targeted only at orders the test itself seeded** (`E2E-REQ069-*` prefix). Cleanup deletes seeded order + dedup row in `afterEach`.

## Rollback Plan

Revert the integration PR. The two new spec files + two helper files are pure additions; reverting them leaves no orphan production behavior. There is no production-state to roll back.

## Deferred to follow-up cycles

Tracked on sub-issue [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) as a checklist:

1. **Paystack idempotency replay** — needs `SystemSettings.payment.paystack.secretKey` configured on UAT. Same spec pattern applies; helper code in place.
2. **Payment-init happy-path (REQ-PAY-001)** — operator decision needed: real provider calls vs `ENABLE_TEST_PAYMENTS=true` mock-checkout-URL on UAT.
3. **Dedicated REQ-PAY-004 partial-payment-reconciliation spec** — partially covered today; dedicated SRS-traced spec is natural next add.

## Quality Gates

| Gate                            | Expected   | Actual (2026-06-04)                                       |
| ------------------------------- | ---------- | --------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0     | exit 0                                                    |
| `npx vitest run` (full)         | 0 failures | 1129 pass / 4 skip / 0 fail                               |
| `npx eslint . --max-warnings=0` | 0 errors   | 0 errors / 950 pre-existing console warnings              |
| E2E focused REQ-069 (UAT)       | 0 failures | 8 passed (3 auth-setup + 5 payment cases), 49s wall-clock |
| E2E full regression pack (UAT)  | green      | _to be run at evidence-pack push time_                    |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-069/implementation-plan.md`)
- [x] Stage 2 — Implement & test (helpers + 2 specs; 5 cases live-passing)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- First cycle of the umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) (SRS → E2E coverage closure).
- Provider-mock infrastructure (`webhook-mock.ts` + `payment-provider-mock.ts`) was the load-bearing piece; sub-issues #292 + #293 reuse them.
- Zero production code change — pure test addition. Risk class MEDIUM (financial path), but the test infrastructure has no production runtime behavior.
- REQ-049 (RELEASED 2026-05-28) is the underlying backstop that this REQ pins; its contract — replay-is-no-op + dedup-key-per-event — has zero E2E coverage before this REQ ships.
