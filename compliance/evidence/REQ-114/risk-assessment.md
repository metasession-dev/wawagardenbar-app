---
req: REQ-114
generated_by: risk-register-keeper
generated_at: 2026-10-23T23:05:00Z
---

# Risk assessment — REQ-114

## Summary

This REQ opened the following entries in `compliance/risk-register.md`:

| Entry | Title                                                        | Status this cycle                                                                                                             | Residual L × I          |
| ----- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| R-038 | `zod@3.25.76` memory-exhaustion advisory GHSA-mrhx-c7xc-m3w5 | OPEN (opened in this REQ) — the control has landed; the operator moves it to MITIGATED once merged with CI's audit gate green | low × low (once merged) |
| R-039 | Validation behaviour change from the zod 3 → 4 major upgrade | OPEN (opened in this REQ) — the operator moves it to MITIGATED at review if the demonstrated controls below are accepted      | low × medium (proposed) |

## Controls demonstrated this cycle

**R-038 (the advisory):**

- `zod` → 4.6.7 (patched ≥ 4.6.6), `@hookform/resolvers` → 5.9.2.
- `scripts/evaluate-npm-audit.sh` run locally against `npm audit --json` gives `0 accepted, 0 unresolved` (before: `Unaccepted high risk: GHSA-mrhx-c7xc-m3w5`). No `accepted-vulnerabilities.json` exception added; fixed, not accepted.

**R-039 (validation regression):**

1. Type-check: the 34 errors from the trial install are all resolved; `tsc --noEmit` clean.
2. Semantics-preserving migration: `requiredError()` reproduces v3 `required_error` (custom message only for missing values), pinned by unit tests.
3. Default messages: `@/lib/zod` reproduces zod 3.25's default wording, compared against zod 3.25.76 itself (39 of 40 cases identical; the 40th is the documented `±Infinity` behaviour change, plan § Plan deviation item 3). Pinned by `__tests__/lib/zod4-migration.test.ts`.
4. Acceptance: 21 emails and 12 URLs accepted or rejected identically by zod 3 and zod 4, pinned in the same test file. Server-action error messages pinned by `__tests__/actions/zod4-action-errors.test.ts`. A rendered form message through `@hookform/resolvers` 5 is proved by `e2e/settings/zod-validation-messages.spec.ts`, with a negative control that fails without the compatibility map.
5. Full unit suite (1584 passed) and full E2E regression compared with `develop`: results and triage in `test-execution-summary.md`.

## Framework cross-references

- ISO27001.A.8.8 (management of technical vulnerabilities) — R-038
- ISO27001.A.8.25 (secure development life cycle) — R-038, R-039
- ISO27001.A.8.29 (security testing in development and acceptance) — R-039
- SOC2.CC7.1 (vulnerability identification) — R-038
- SOC2.CC8.1 (change management) — R-039

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
