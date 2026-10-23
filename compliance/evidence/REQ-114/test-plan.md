---
req: REQ-114
generated_from: compliance/plans/REQ-114/implementation-plan.md
---

# Test plan — REQ-114

Reconciled against the real files at Phase 2 step 4b (2026-10-23): every path exists.

| AC  | Test type       | File / method                                                                                                                                                                       | Covered?                          |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| AC1 | Dependency gate | `scripts/evaluate-npm-audit.sh` on `npm audit --json` (locally, then CI `Quality Gates`)                                                                                            | Yes                               |
| AC2 | Unit            | `__tests__/lib/zod4-migration.test.ts` — valid inputs for migrated schemas (enums, literals, dates, emails, URLs) are accepted                                                      | Yes                               |
| AC2 | Unit (existing) | Full Vitest suite (`npm test`), including `__tests__/actions/admin/*` and profile/reward action tests                                                                               | Yes                               |
| AC2 | E2E (existing)  | Full Playwright regression — login, checkout, profile, expenses, settings flows                                                                                                     | Pending (full regression running) |
| AC3 | Unit            | `__tests__/lib/zod4-migration.test.ts` — missing/invalid inputs are rejected with the exact pre-upgrade messages                                                                    | Yes                               |
| AC3 | Unit            | `__tests__/actions/zod4-action-errors.test.ts` — address, profile phone, reward-rule create/update return the pre-upgrade message                                                   | Yes                               |
| AC3 | E2E             | `e2e/settings/zod-validation-messages.spec.ts` — Contact Email shows zod 3's "Invalid email" through `@hookform/resolvers` 5 (negative control fails without the compatibility map) | Yes                               |
| AC2 | E2E             | `e2e/settings/zod-validation-messages.spec.ts` — a valid address clears the error                                                                                                   | Yes                               |
| AC4 | Unit + E2E      | Full Vitest + full Playwright regression, compared against a `develop` baseline; no test file edited except to migrate a zod call                                                   | Pending (full regression running) |

**E2E:** decided by the `e2e-test-engineer` skill in Phase 2. The existing suite had no assertion on a rendered zod message, so one small regression-tier spec was added for the resolver path (AC2/AC3). The full existing regression is re-run and compared with `develop` (AC4).
