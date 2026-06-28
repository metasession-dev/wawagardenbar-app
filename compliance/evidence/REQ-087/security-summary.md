## Security Evidence Summary — REQ-087

**Date:** 2026-06-28
**SAST Tool:** Semgrep (auto config)
**SAST High/Critical Findings:** 0
**Dependency Audit High/Critical:** 0
Evidence uploaded to DevAudit project: wawagardenbar-app

### Access Control

- **Status:** PASS
- **Details:** No new endpoints introduced. Existing admin/kitchen auth unchanged. `retryInventoryDeductionAction` retains `requirePermission('incidentsAccess')` gate. `completeOrder` and `reconcileMissedDeductions` are internal service methods with no new exposure.

### Audit Logging

- **Status:** PASS
- **Details:** IncidentEvent still written on partial failure, now with per-item breakdown (`deductedItems`, `failedItems`, `skippedItems` arrays). AuditLog entries added for `incidents.retry_deduction_partial` action. Reconciliation cron dedup pattern preserved.

### Input Validation

- **Status:** PASS
- **Details:** Order model schema validates new `inventoryDeductionDetails` subdocument array with enum constraints on `status` field (`pending`, `deducted`, `failed`). Mongoose schema enforces ObjectId refs for `menuItemId` and `inventoryId`.

### Error Handling

- **Status:** PASS
- **Details:** Per-item errors are operational messages (e.g., "Insufficient stock at..."). No sensitive data exposed in error responses. `deductStockForOrder` no longer throws on partial failure — returns structured result object. Outer catch handles unexpected throws (e.g., DB connection failures).

### SAST Baseline

- **Pre-existing findings:** 6 (baseline)
- **Current findings:** 8 (2 pre-existing in order-service.ts at lines 447, 459 — `unsafe-formatstring` in console.log calls for REQ-048, not introduced by REQ-087)
- **New findings introduced by REQ-087:** 0
