---
req: REQ-105
generated_from: compliance/plans/REQ-105/implementation-plan.md
---

# Test scope — REQ-105

| AC  | SRS item    | Risk | Verification method                                                        |
| --- | ----------- | ---- | -------------------------------------------------------------------------- |
| AC1 | REQ-FIN-007 | LOW  | E2E (edit dialog field persistence)                                        |
| AC2 | REQ-FIN-007 | LOW  | Unit (existing REQ-034 reversal/reapply coverage, reached via new UI path) |
| AC3 | REQ-FIN-007 | LOW  | E2E (read-only info block rendering)                                       |
| AC4 | REQ-FIN-007 | LOW  | E2E (non-super-admin access unchanged)                                     |
| AC5 | REQ-FIN-007 | LOW  | Unit (`$set` payload incl. empty-array clear) + E2E (add/remove in dialog) |
