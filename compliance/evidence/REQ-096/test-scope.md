# Test Scope — REQ-096

**Risk class:** HIGH
**Source:** [#612](https://github.com/metasession-dev/wawagardenbar-app/issues/612)

| AC  | SRS item | Risk | Verification method                                                                                |
| --- | -------- | ---- | -------------------------------------------------------------------------------------------------- |
| AC1 | TBD      | High | Service + action unit tests (default-allowed delete path); authenticated UI test.                  |
| AC2 | TBD      | High | Action-layer role-gate unit tests (both non-super-admin and super-admin); authenticated UI test.   |
| AC3 | TBD      | High | Service unit tests reusing `InventoryService.restoreStockForOrder`.                                |
| AC4 | TBD      | High | Service unit test + `financial-report-service` integration test (report exclusion).                |
| AC5 | TBD      | High | Service unit test (leave-as-is branch).                                                            |
| AC6 | TBD      | High | Service unit test (tab payment-revert) + `financial-report-service` integration test.              |
| AC7 | TBD      | High | Service unit test (`partialPayments` server-side refusal); authenticated UI test (disabled state). |
| AC8 | TBD      | High | Service unit tests asserting audit-log call shape for every guard/revert branch.                   |
