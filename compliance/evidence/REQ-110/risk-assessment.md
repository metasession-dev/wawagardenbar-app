---
req: REQ-110
generated_by: risk-register-keeper
generated_at: 2026-10-16T16:00:00Z
---

# Risk assessment — REQ-110

## Summary

This REQ opened the following entry in `compliance/risk-register.md`:

| RISK ID | Title                                                         | Status this cycle             | Residual L × I |
| ------- | ------------------------------------------------------------- | ----------------------------- | -------------- |
| R-036   | `braces@3.0.3` ReDoS advisory has no patched upstream release | ACCEPTED (opened in this REQ) | low × low      |

Two advisory buckets tracked alongside R-036 in #910 (`brace-expansion`, `nodemailer`) are resolved outright by this REQ — no register entry needed for those, since a fixed vulnerability is not an accepted-risk trade-off (`@risk-deferred` in the plan §5).

**`solo_with_gap` check:** `sdlc-config.json:approval.mode` is `dual_actor` — the Phase 4 control-gap check doesn't apply.

## Framework cross-references

- ISO27001.A.8.25 — R-036 (secure development — tracked dependency risk awaiting upstream fix)

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] R-036's residual rating (low × low) is defensible — dev/build-tooling-only execution path, not reachable from user input.
- [x] No risk was downgraded without evidence.
- [x] R-036 has a review-due date (2026-11-15, matching the risk-acceptance expiry) and is tracked in #910.

**Reviewer:** william@ostendo.io
**Date:** 2026-10-16
