# Test plan — REQ-099

Extracted from `compliance/plans/REQ-099/implementation-plan.md` §8.

| AC       | Test file                                                                              | Test type | Covered |
| -------- | -------------------------------------------------------------------------------------- | --------- | ------- |
| AC2, AC3 | `__tests__/services/tab-service.pagination.test.ts` (existing file, extended)          | unit      | yes     |
| AC1, AC2 | `e2e/orders/tabs-list-written-off-badge-filter.spec.ts` (new, via `e2e-test-engineer`) | e2e       | yes     |
| AC3      | Covered by the same unit tests as AC2 (regression branch of `listAllTabsWithFilters`)  | unit      | yes     |

Reconciled during Phase 2 step 4b: the unit coverage landed in the existing `__tests__/services/tab-service.pagination.test.ts` (the file that already covers `TabService.listAllTabsWithFilters`) rather than a new file — 3 new test cases added (`writtenOffOnly` isolate, OR-with-statuses, regression guard). All 9 tests in the file pass. The E2E file path was also corrected here — it landed at `e2e/orders/tabs-list-written-off-badge-filter.spec.ts` (grouped with the project's other tab specs), not the originally predicted `e2e/critical/...` path.
