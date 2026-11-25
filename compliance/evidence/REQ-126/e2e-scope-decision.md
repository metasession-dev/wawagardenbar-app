---
req: REQ-126
generated_by: e2e-test-engineer
generated_at: 2026-11-25T06:07:21Z
e2e_required: true
spec_path: e2e/critical/whatsapp-order-link.spec.ts, e2e/critical/whatsapp-status-enquiry.spec.ts
---

# E2E scope decision — REQ-126

## Outcome

**E2E required — covered.** Merge-gating specs were written in `e2e/critical/` and pass on an isolated stack.

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A — covered below.
- **Spec path(s):** e2e/critical/whatsapp-order-link.spec.ts, e2e/critical/whatsapp-status-enquiry.spec.ts
- **ACs covered:** AC1, AC2, AC3, AC4, AC5, AC6
- **Notes:** Transport-layer specs (signed webhook, no `page`): evidence is test-execution-summary.md, no screenshots. WhatsApp is off in CI, so the reply text is unit-tested and the live reply is the UAT round-trip.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [x] The verdict matches the actual scope of this REQ.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-25

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-25; recorded by the agent from the operator's explicit reply._
