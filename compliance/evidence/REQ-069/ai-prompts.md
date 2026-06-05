# REQ-069 — AI prompts (Phase 3 evidence)

Operator-issued prompts captured for the AI-assisted portion of this requirement.

## Cycle-opening prompt

> "reviewing the SRS and the E2E test regression packs which tests are still outstanding?"

The audit response identified ~32 SRS items uncovered or only indirectly covered. The operator then chose Option A from the follow-up:

> "i want an issue created with the largest scope possible to deliver as much as possible per sub issue"

This produced umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) + 6 fat sub-issues [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292), [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293), [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294), [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295), [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296), [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) — each sized for one PR with cohesive scope (shared fixtures, related SRS items).

## Implementation start

> "implement #291"

The agent's interpretation: start at the recommended pickup order (sub-issue #294, the provider-mock infrastructure that unblocks #292 + #293). REQ-XXX number assigned: REQ-069 (the next sequential number after REQ-068).

## Scope decisions during implementation

The agent explored the existing payment + webhook infrastructure (verified `ENABLE_TEST_PAYMENTS=true` flag in `services/payment-service.ts:21`, `crypto.createHmac('sha512', ...)` signature contracts in both provider services, the dual signature-source pattern — paystack DB-backed, monnify env-backed). Two scope decisions made mid-cycle:

1. **Defer paystack idempotency replay** — UAT `SystemSettings.payment.paystack.secretKey` is unset (spot-checked 2026-06-04). The same spec pattern applies once it's configured; helper code already in place.
2. **Defer payment-init happy-path specs** — needs an operator decision on real provider calls vs `ENABLE_TEST_PAYMENTS=true` mock-checkout-URL on UAT. Tracked on sub-issue #294 checklist.

Both deferrals are documented in `test-scope.md` and re-stated in the release ticket.

## AI-generated artefacts in this cycle

- `e2e/helpers/webhook-mock.ts` — HMAC-SHA512 signature generators + HTTP dispatcher + secret-reader helpers.
- `e2e/helpers/payment-provider-mock.ts` — paystack + monnify payload builders.
- `e2e/payments/webhook-signature-rejection.spec.ts` — 3 cases.
- `e2e/payments/webhook-idempotency-replay.spec.ts` — 2 cases.
- `compliance/plans/REQ-069/implementation-plan.md`.
- `compliance/evidence/REQ-069/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md`.
- `compliance/pending-releases/RELEASE-TICKET-REQ-069.md`.
- `compliance/RTM.md` REQ-069 row (IN PROGRESS).

The agent did not author commit messages or PR descriptions independently of the operator's tracked-work conventions; titles use the `[REQ-069]` bracket form per `feedback_pr_title_req_brackets`.
