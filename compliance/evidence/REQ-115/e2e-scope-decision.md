---
req: REQ-115
generated_by: e2e-test-engineer
generated_at: 2026-10-24T16:31:33Z
e2e_required: true
spec_path: e2e/critical/whatsapp-welcome-params.spec.ts
---

# E2E scope decision — REQ-115

## Outcome

**E2E required — covered.** Specs were written or updated and passed locally against an isolated server and a disposable MongoDB.

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/critical/whatsapp-welcome-params.spec.ts`, `e2e/critical/whatsapp-phone-normalisation.spec.ts`, `e2e/critical/customer-pin-six-digits.spec.ts`, `e2e/support-ticket-staff-flow.spec.ts` (new test), shared `e2e/helpers/whatsapp-webhook.ts` used by `e2e/whatsapp-inbound-registration-templates.spec.ts` and `e2e/support-ticket-whatsapp-inbound.spec.ts`.
- **ACs covered:** AC1, AC2, AC5, AC10, AC15. AC3, AC4, AC6, AC7, AC11, AC16 are unit-level; AC8, AC9, AC12 are configuration/documentation/housekeeping; AC13, AC14 and the live part of AC15 are operator evidence.
- **Layers:** the two WhatsApp specs are transport-layer (no `page`) and assert `NotificationLog`, `IncomingMessage` and `users` rows with WhatsApp disabled (Level 1). Level 2 (live UAT round-trip) is operator evidence.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
