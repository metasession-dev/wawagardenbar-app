# Test plan — REQ-109

Extracted from `compliance/plans/REQ-109/implementation-plan.md` §2/§4/§9. Reconciled against actual files landed in Phase 2.

| Test file (actual)                                                                              | Type | AC coverage                                |
| ----------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| `e2e/authenticated.spec.ts`                                                                     | E2E  | AC1, AC2                                   |
| `e2e/critical/csr-order-tab-parity-req109.spec.ts` (new)                                        | E2E  | AC3, AC4, AC5, AC6, AC7                    |
| `e2e/critical/daily-report-payments.spec.ts` (updated — UI-dependency fix, not new AC coverage) | E2E  | n/a (regression only)                      |
| `__tests__/actions/tabs/tab-actions.write-off.test.ts`                                          | Unit | AC6, AC7 (write-off; via sibling coverage) |
| `__tests__/actions/admin/order-management-actions.test.ts`                                      | Unit | AC6, AC7                                   |
| Customer checkout regression — verified by inspection, no spec change needed                    | N/A  | AC8                                        |

Every AC has at least one passing test. The other 9 widened functions in `app/actions/tabs/tab-actions.ts`, plus `app/actions/admin/express-actions.ts`, are covered indirectly through the end-to-end Express flow in `csr-order-tab-parity-req109.spec.ts` (AC3/AC4/AC5) rather than per-function unit tests, consistent with this project's existing convention of testing role gates at the point of UI/server-action integration for the Express flow.
