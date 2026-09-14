---
req: REQ-104
generated_from: compliance/plans/REQ-104/implementation-plan.md
---

# Test plan — REQ-104

| AC            | Test file                                                                                | Test type | Covered? |
| ------------- | ---------------------------------------------------------------------------------------- | --------- | -------- |
| AC1, AC2, AC3 | `__tests__/services/tag-service.test.ts`                                                 | unit      | yes      |
| AC5           | `__tests__/pending-expense-group/pending-expense-group-service.test.ts` (REQ-104 blocks) | unit      | yes      |
| AC1-AC4       | `e2e/finance/cash-tags-and-edit.spec.ts`                                                 | e2e       | yes      |
