# Test Plan — REQ-094

| AC  | Planned test target                                                                    | Test type            | Expected evidence                                                     |
| --- | -------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------- |
| AC1 | Business-date helper and profitability-report service fixtures crossing the WAT cutoff | Unit/integration     | Test execution summary and reconciliation output                      |
| AC2 | Order-item snapshot write path and reclassified-menu-item report fixtures              | Unit/integration     | Test execution summary                                                |
| AC3 | Profitability service, server action/API, and dashboard category filter                | Unit/integration/E2E | Test execution summary and named E2E screenshots                      |
| AC4 | Inventory snapshot submission, lookup, and date-range fixtures                         | Unit/integration     | Test execution summary                                                |
| AC5 | Versioned migration dry-run/apply/re-run and legacy report labelling                   | Unit/integration/E2E | Migration report, test execution summary, reviewer-visible screenshot |

E2E scenarios and evidence calls will be designed by the `e2e-test-engineer` after the HIGH-risk plan checkpoint is approved. No test is considered portal evidence until a REQ-094-scoped CI run uploads it with its stage/cycle provenance.
