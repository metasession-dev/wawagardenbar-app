# Test Plan — REQ-098

| AC  | Planned test target                                                                                                                                             | Test type        | Expected evidence                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------ |
| AC1 | `__tests__/models/tab-model.write-off.test.ts`, `__tests__/models/order-model.write-off.test.ts` — enum accepts `'written-off'`, existing values unaffected     | Unit             | Test execution summary                           |
| AC2 | `__tests__/services/tab-service.write-off.test.ts` — happy path (incl. `partialPayments`), already-written-off refusal, audit-log call shape                    | Unit             | Test execution summary                           |
| AC3 | `__tests__/actions/tabs/tab-actions.write-off.test.ts` — `writeOffTabAction` role gate (non-admin refused, admin/super-admin allowed)                           | Unit             | Test execution summary                           |
| AC4 | `e2e/critical/write-off-tab.spec.ts` — write-off dialog end-to-end, reason required, existing delete action unaffected                                          | E2E              | Test execution summary and named E2E screenshots |
| AC5 | `__tests__/services/tab-service.dormant-scan.test.ts` — `scanDormantOpenTabs` dedup; `e2e/regression/dormant-tab-visibility.spec.ts` — list flag + incident row | Unit/E2E         | Test execution summary and named E2E screenshots |
| AC6 | `__tests__/services/financial-report-service.write-off-section.test.ts` — written-off exclusion + new report section totals                                     | Unit/integration | Test execution summary                           |
| AC7 | `__tests__/scripts/write-off-dormant-tabs-2026-07-31.test.ts` — dry-run against a seeded fixture matching the 51-order profile                                  | Unit (script)    | Test execution summary                           |

E2E scenarios and evidence calls will be designed by `e2e-test-engineer` after the HIGH-risk plan checkpoint is approved. No test is considered portal evidence until a REQ-098-scoped CI run uploads the named PNG screenshots and their sidecar provenance with the stage/cycle metadata.
