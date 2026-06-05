# REQ-073 — Test scope

## In scope (this PR)

### E2E specs

- `e2e/admin/menu-item-delete.spec.ts` — 1 test pinning hard-delete behavior + Order snapshot persistence (REQ-MENUMGT-004 delete half).
- `e2e/admin/menu-item-duplicate.spec.ts` — 1 test pinning duplicate-with-modifications + original-unchanged (REQ-MENUMGT-004 duplicate half).
- `e2e/admin/kitchen-void-batch.spec.ts` — 2 tests pinning `ProductionService.voidBatch` (REQ-KITCHEN-005 + REQ-034 AC13): full reversal AC + idempotency AC.

## SRS items covered

| SRS ID                                  | Covered by                  | Status                                                        |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| REQ-MENUMGT-004 (delete)                | menu-item-delete.spec.ts    | **Pinned — storage-layer + history snapshot**                 |
| REQ-MENUMGT-004 (duplicate)             | menu-item-duplicate.spec.ts | **Pinned — storage-layer modifications + original-unchanged** |
| REQ-KITCHEN-005 (void production batch) | kitchen-void-batch.spec.ts  | **Pinned — reversal + audit trail + idempotency**             |

## Out of scope (deferred to follow-up cycles within #296)

| Item                                                                              | Why deferred                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`tab-delete-reverses-payments.spec.ts` (REQ-TABMGT-004)**                       | Multi-collection state changes — payments reversed + customer loyalty points restored + tab status flip + audit log. Complex seed (Tab + Order + PointsTransaction + payment records) and complex assertions. Higher risk per spec than V1's 3. Better suited for a dedicated cycle. |
| **`force-password-change.spec.ts` (REQ-AUTHA-003)**                               | UI-driven flow — admin first-login + post-reset both force the password-change screen before any other action. Needs browser context + session redirect handling + admin login fixture extension. Out of scope for V1's Mongo-driver pattern.                                        |
| **`data-deletion-request-approval.spec.ts` (REQ-SETTINGS-004 + REQ-PRIVACY-002)** | Super-admin admin workflow UI + cascade verification across multiple collections (customer PII redaction, audit log entry, downstream Order-document field flips). Complex; deferred to a dedicated cycle.                                                                           |
| **`soft-delete-enforcement.spec.ts` (REQ-PRIVACY-002)**                           | Deleted customer's orders still appear in revenue reports with redacted PII — UI-driven across multiple admin views (orders list, revenue reports page, customer detail page). Browser-context spec.                                                                                 |
| **`kitchen-ingredient-archive.spec.ts` (REQ-KITCHEN-006)**                        | Same pattern as kitchen-void-batch but covers a different lifecycle (archive instead of void). Lower urgency than void-batch + V1 budget already covers the void path of the kitchen production lifecycle. Easy to add in V2.                                                        |

These ship in follow-up REQs within sub-issue #296.

## Out of scope (umbrella tracker — not this sub-issue)

These belong to other sub-issues of [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291):

- Customer-PIN-flow E2E → sub-issue [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292) (blocked on PIN-flow auth).
- Payments + webhooks E2E → sub-issue [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) (REQ-069 MERGED).
- Rewards & loyalty pipeline → sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) (REQ-070 MERGED).
- Public API authenticated contracts → sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) (REQ-071 MERGED).
- Socket.IO broadcasts → sub-issue [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295) (REQ-072 MERGED).

## Manual UAT — none required

All 3 specs run end-to-end against live UAT Mongo. No human-driven manual validation step needed.
