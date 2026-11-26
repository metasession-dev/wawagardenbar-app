---
req: REQ-128
generated_by: e2e-test-engineer
generated_at: 2026-11-26T07:20:33Z
e2e_required: true
spec_path: e2e/critical/refund-flow.spec.ts, e2e/critical/refund-report.spec.ts
---

# E2E scope decision — REQ-128

## Outcome

**E2E required — covered.** 14 tests in two merge-gating specs; the gate passed on an isolated stack (Paystack simulated, WhatsApp off).

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/critical/refund-flow.spec.ts`, `e2e/critical/refund-report.spec.ts`
- **ACs covered:** AC1, AC2, AC3, AC4, AC5, AC6 by e2e. AC7 (templates) and AC8 (delivery wording) by unit tests and the submission record: neither has a user flow that CI can drive without Meta.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-26

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-26; recorded by the agent from the operator's explicit reply._
