---
req: REQ-114
generated_from: compliance/plans/REQ-114/implementation-plan.md
---

# Test plan — REQ-114

Predicted at Stage 1; reconciled against the real files at Phase 2 step 4b.

| AC  | Test type       | File / method                                                                                                                     | Covered? |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| AC1 | Dependency gate | `scripts/evaluate-npm-audit.sh` on `npm audit --json` (locally, then CI `Quality Gates`)                                          | Planned  |
| AC2 | Unit            | `__tests__/lib/zod4-migration.test.ts` — valid inputs for migrated schemas (enums, literals, dates, emails, URLs) are accepted    | Planned  |
| AC2 | Unit (existing) | Full Vitest suite (`npm test`), including `__tests__/actions/admin/*` and profile/reward action tests                             | Planned  |
| AC2 | E2E (existing)  | Full Playwright regression — login, checkout, profile, expenses, settings flows                                                   | Planned  |
| AC3 | Unit            | `__tests__/lib/zod4-migration.test.ts` — missing/invalid inputs are rejected with the exact pre-upgrade messages                  | Planned  |
| AC3 | Unit (existing) | Server-action tests asserting validation errors (reward rules, profile)                                                           | Planned  |
| AC4 | Unit + E2E      | Full Vitest + full Playwright regression, compared against a `develop` baseline; no test file edited except to migrate a zod call | Planned  |

**E2E:** decided by the `e2e-test-engineer` skill in Phase 2. Expected: no new spec, because the change is behaviour-preserving and the existing regression suite already drives every affected form.
