---
req: REQ-105
generated_from: compliance/plans/REQ-105/implementation-plan.md
---

# Test plan — REQ-105

| AC      | Test file                                                            | Test type | Covered?                                      |
| ------- | -------------------------------------------------------------------- | --------- | --------------------------------------------- |
| AC1     | `__tests__/services/expense-service.update-fields.test.ts`           | unit      | yes                                           |
| AC2     | (pre-existing) `__tests__/services/expense-inventory-link.*.test.ts` | unit      | yes — REQ-034 coverage, untouched by this REQ |
| AC1-AC4 | `e2e/finance/cash-tags-and-edit.spec.ts`                             | e2e       | yes                                           |
