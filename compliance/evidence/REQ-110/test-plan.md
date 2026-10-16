# Test plan — REQ-110

Extracted from `compliance/plans/REQ-110/implementation-plan.md` §9.

| AC  | Test type             | Test file / check                                                                                                                                                                                                           | Covered?                                          |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| AC1 | Security-ledger check | `scripts/evaluate-npm-audit.sh` (CI-run, no dedicated test file — this is a dependency/CI-gate check, not application code)                                                                                                 | Yes                                               |
| AC2 | Security-ledger check | `scripts/evaluate-npm-audit.sh`                                                                                                                                                                                             | Yes                                               |
| AC3 | Unit/integration      | Existing suite under `tests/unit/` / `tests/integration/` covering `lib/email.ts` callers (no new test file expected unless `nodemailer` 10.x requires a call-site change, in which case a test is added alongside the fix) | Yes (regression baseline: 1498 passed, 4 skipped) |
| AC4 | Manual/CI check       | `npm view braces versions` (manual, recorded in plan + risk register)                                                                                                                                                       | Yes                                               |
| AC5 | Manual review         | Diff of `compliance/security/accepted-vulnerabilities.json` + `evaluate-npm-audit.sh` output (0 unresolved)                                                                                                                 | Yes                                               |

**E2E:** N/A — `@e2e-deferred`, no UI-facing files in scope.
