---
req: REQ-104
generated_from: compliance/plans/REQ-104/implementation-plan.md
---

# Test scope — REQ-104

| AC  | SRS item    | Risk | Verification method                                             |
| --- | ----------- | ---- | --------------------------------------------------------------- |
| AC1 | REQ-FIN-006 | LOW  | Unit (`TagService.createTag`) + E2E (create-from-combobox flow) |
| AC2 | REQ-FIN-006 | LOW  | Unit (`TagService.createTag` idempotency) + E2E                 |
| AC3 | REQ-FIN-006 | LOW  | Unit (`TagService.archiveTag`/`restoreTag`) + E2E               |
| AC4 | REQ-FIN-006 | LOW  | E2E (expense-list tag filter)                                   |
| AC5 | REQ-FIN-006 | LOW  | Unit (`buildExpenseRecordsFromGroup` tagIds propagation)        |
