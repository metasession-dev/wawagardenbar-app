---
req: REQ-101
generated_from: compliance/plans/REQ-101/implementation-plan.md
---

# Test plan — REQ-101

| Test file                                                                     | Test type | ACs covered   |
| ----------------------------------------------------------------------------- | --------- | ------------- |
| `__tests__/services/financial-report-service.dynamic-main-categories.test.ts` | Unit      | AC1, AC2, AC4 |
| `__tests__/services/financial-report-service.main-category.test.ts`           | Unit      | AC3, AC4      |

Both files add:

- `REQ-101: splits full vs half portion sales of the same item into separate rows` — pins the fix (two rows, correct per-row price/quantity/total).
- (dynamic-main-categories only) `REQ-101: an item sold only at full portion is unaffected (regression pin, matches REQ-100 fixtures)` — pins that an absent `portionSize` and an explicit `'full'` key identically, so REQ-100's existing multi-price-same-portion behaviour is untouched.

No new E2E spec — see `compliance/evidence/REQ-101/e2e-scope-decision.md` (`e2e_required: false`).

Full local verification: `npx vitest run` — 156 test files / 1 skipped, 1387 tests passed / 4 skipped (no regressions). `npx tsc --noEmit` clean. `npm run lint` — 0 errors (984 pre-existing warnings, unrelated to this diff).
