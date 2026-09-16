---
req: REQ-106
generated_from: compliance/plans/REQ-106/implementation-plan.md
---

# Test scope — REQ-106

| AC   | SRS item       | Risk   | Verification method                                                             |
| ---- | -------------- | ------ | ------------------------------------------------------------------------------- |
| AC1  | REQ-REPORT-007 | MEDIUM | E2E (empty-state rendering)                                                     |
| AC2  | REQ-FIN-003    | MEDIUM | Unit (`createPendingExpenseGroupAction` requires paymentMethod) + E2E           |
| AC3  | REQ-REPORT-007 | MEDIUM | Unit (`CashPositionService.getCashOutExpensesForRange`) + E2E                   |
| AC4  | REQ-REPORT-007 | MEDIUM | Unit (transfer-method groups excluded)                                          |
| AC5  | REQ-FIN-008    | MEDIUM | Unit (`CashDepositService` status machine + `getCashOutDepositsForRange`) + E2E |
| AC6  | REQ-REPORT-007 | MEDIUM | Unit (`recordAdjustment`/`listAdjustments`) + E2E (adjustment dialog)           |
| AC7  | REQ-REPORT-007 | MEDIUM | Unit (`getCashPositionForDate` pre-seed behavior)                               |
| AC8  | REQ-FIN-003    | MEDIUM | Unit (batch homogeneity guard, both `assignBatch` and `confirmTransfer`)        |
| AC9  | REQ-REPORT-007 | MEDIUM | Unit (`getCurrentPosition` delegation) + E2E (position unchanged across ranges) |
| AC10 | REQ-REPORT-007 | MEDIUM | Unit (`getLedger` composition/sorting) + E2E (dedicated page renders)           |
| AC11 | REQ-REPORT-007 | LOW    | Unit (`getLedger` pagination math) + E2E (controls render, Next/Prev safe)      |
