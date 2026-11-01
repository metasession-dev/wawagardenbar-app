---
req: REQ-116
generated_by: e2e-test-engineer
generated_at: 2026-11-01T00:00:00Z
e2e_required: true
spec_path: e2e/critical/whatsapp-webhook-security.spec.ts, e2e/critical/whatsapp-inbound-idempotency.spec.ts, e2e/critical/whatsapp-optout-optin.spec.ts
---

# E2E scope decision — REQ-116

## Outcome

**E2E required — covered.** Three new transport-layer critical specs cover the webhook ACs that need the running server; the regression-pack ACs (AC11–AC15) are fixes to existing specs and to `playwright.config.ts`.

## Detail

- **`e2e_required`:** true.
- **Spec path(s):** `e2e/critical/whatsapp-webhook-security.spec.ts` (AC2), `whatsapp-inbound-idempotency.spec.ts` (AC4, AC5), `whatsapp-optout-optin.spec.ts` (AC6). Updated: `express-order-portion-pricing-req097.spec.ts` (AC11), `cost-snapshot.spec.ts` and `partial-payments.spec.ts` (AC13), `staff-pot.spec.ts` (AC14), `csr-uat.spec.ts` and `support-ticket-staff-flow.spec.ts` (AC15), `playwright.config.ts` (AC12).
- **ACs covered by unit tests only:** AC1 (503 without the secret needs a server started without it), AC3 (log spies), AC7 (rate limit), AC8 (retry timing), AC9 (exact PIN payload; live round-trip is AC10, an operator step).
- **Evidence form:** transport-layer specs have no `page`, so there are no `evidenceShot` screenshots; `test-execution-summary.md` is the proof (see _Specs with no page object_).
- **Local run:** `--project=critical` at the default worker count: 326 passed, 0 failed, 0 skipped. Full `regression` was not run locally; CI runs it.
- **#932 root cause:** confirmed from the CI trace of an earlier sharded run (the save request posted no `startDate` while the success toast showed): `fill()` ran before hydration. Fixed in the spec with `e2e/helpers/hydration.ts`.
- **Known limit:** `scripts/check-req-title-tags.sh` passes for `--req REQ-116`. Run without `--req` it reports 61 `tagTest` calls in specs that use aliased fixtures (`csrTest`, `superAdminTest`); the script does not recognise those names, and the titles already carry the requirement id. Not changed here.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** _pending_
**Date:** _pending_
