---
req: REQ-096
generated_by: risk-register-keeper
generated_at: 2026-07-28T07:00:00Z
---

# Risk assessment — REQ-096

## Summary

This REQ opened the following entries in `compliance/risk-register.md` (project convention uses `R-NNN`, not the generic `RISK-NNN` template):

| R-NNN | Title                                                                                           | Status this cycle                                                 | Residual                                                                                                                      |
| ----- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| R-013 | Role-gate bypass on order/tab delete override                                                   | OPEN → mitigated by implementation                                | Server-side role re-enforcement + unit test evidence landed (`deleteOrderAction`/`deleteTabAction`)                           |
| R-014 | Double-submission double-reverts payment or duplicates audit log entries                        | OPEN → mitigated by implementation                                | Idempotency evidence landed (unit tests assert no duplicate side effects)                                                     |
| R-015 | Soft-deleted order leaks into a list/report surface that wasn't updated to filter `isDeleted`   | OPEN → mitigated by implementation, residual accepted             | Three enumerated surfaces fixed + tested; structural residual (no query-builder default scope) explicitly accepted in ADR-002 |
| R-016 | Tab-level payment-revert double-counts or misreports revenue when the tab has `partialPayments` | OPEN → mitigated by implementation                                | Server-side refusal landed, tested (unit + e2e)                                                                               |
| R-017 | Payment-revert checkbox used to disguise an unauthorized refund without evidence                | ACCEPTED — pre-existing operational control, not newly introduced | Existing audit-log convention extended with explicit detail fields; manual-refund reconciliation gap pre-dates this REQ       |

## Framework cross-references

- ISO27001.A.8.25 — R-013, R-014, R-015, R-016, R-017 (secure development life cycle)
- SOC2.CC6.1 — R-013 (logical access controls)
- SOC2.CC7.2 — R-014, R-015 (system monitoring / data integrity)
- SOC2.CC3.2 — R-016 (risk identification — documented known limitation)
- SOC2.CC5.1 — R-017 (control activities)

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ (unit + e2e test evidence for R-013/014/015/016; R-017 correctly framed as a pre-existing, not new, gap).
- [x] No risk was downgraded without evidence — R-013/014/015/016's "mitigated by implementation" status is backed by the specific tests named in `test-execution-summary.md`.
- [x] No OPEN entries remain without follow-up tracking — R-015's structural residual is explicitly accepted in ADR-002 with a recommended follow-up issue if a fourth un-filtered surface is ever found.

**Reviewer:** sdlc-implementer@1.0 (AI-assisted; pending operator/UAT review)
**Date:** 2026-07-28
