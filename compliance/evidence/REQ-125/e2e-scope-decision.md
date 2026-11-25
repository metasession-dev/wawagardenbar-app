---
req: REQ-125
generated_by: e2e-test-engineer
generated_at: 2026-11-25T06:07:21Z
e2e_required: true
spec_path: e2e/critical/whatsapp-notification-settings.spec.ts
---

# E2E scope decision — REQ-125

## Outcome

**E2E required — covered.** Merge-gating specs were written in `e2e/critical/` and pass on an isolated stack.

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A — covered below.
- **Spec path(s):** e2e/critical/whatsapp-notification-settings.spec.ts
- **ACs covered:** AC2, AC3, AC4, AC5, AC6, AC7, AC8
- **Notes:** UI specs with evidenceShot for AC3, AC4, AC5, AC6; the gate by template name, the PIN never being gated, fail-open and the role gate of the actions are unit-tested; AC1 and AC9 have no e2e surface (unit test and runbook).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [x] The verdict matches the actual scope of this REQ.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-25

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-25; recorded by the agent from the operator's explicit reply._
