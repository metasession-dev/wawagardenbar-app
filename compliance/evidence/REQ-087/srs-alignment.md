---
req: REQ-087
generated_by: sdlc-implementer
generated_at: 2026-06-28T09:00:00Z
---

# SRS alignment — REQ-087

## Summary

This REQ traces to the following existing SRS items in `docs/SRS.md`:

| SRS item    | Status               | ACs it traces to |
| ----------- | -------------------- | ---------------- |
| REQ-INV-012 | Existing (canonical) | AC1, AC4, AC5    |
| REQ-INV-013 | Existing (canonical) | AC2, AC3         |

No new SRS items were proposed — REQ-087 is a bug fix / refactor of existing inventory deduction behaviour already covered by REQ-INV-012 (reconciliation cron) and REQ-INV-013 (retry-now remediation).

## Alignment detail

### REQ-INV-012 — Reconciliation cron

**SRS location:** `docs/SRS.md` line 868

**How REQ-087 aligns:**

- AC1 (partial failure deducts remaining items) — the reconciliation cron re-runs `deductStockForOrder` for orders with `inventoryDeducted: false`. The per-item try/catch refactor means the cron now benefits from skip-on-retry (already-deducted items are skipped, only failed/pending items are retried). This is an enhancement to the existing REQ-INV-012 behaviour.
- AC4 (all items succeed) — when the cron retries and all items now have stock, `allSucceeded` is true and `inventoryDeducted` flips. This matches the existing SRS Given/When/Then: "Given an order with `inventoryDeducted: false` AND deductible stock now exists at the routed location, When the cron tick runs, Then the retry succeeds, the flag flips to `true`."
- AC5 (over-sell regression) — the existing over-sell E2E spec tests the scenario where stock is insufficient. The refactor changes the failure mode from a throw to a structured result, but the IncidentEvent is still written and `inventoryDeducted` stays false. This preserves the observable behaviour described in REQ-INV-012.

### REQ-INV-013 — Retry-now remediation + audit log

**SRS location:** `docs/SRS.md` line 882

**How REQ-087 aligns:**

- AC2 (skip-on-retry prevents double deduction) — the retry-now button calls `retryInventoryDeductionAction(orderId)` which invokes `deductStockForOrder`. With the per-item tracking, already-deducted items are skipped (status='deducted' in `inventoryDeductionDetails`). This enhances the idempotency guarantee in REQ-INV-013: "The action is idempotent — when `Order.inventoryDeducted === true` it returns a no-op success."
- AC3 (IncidentEvent contains per-item breakdown) — the retry-now action writes an `incidents.retry_deduction_failed` audit-log entry on failure. With the refactor, the IncidentEvent `errorDetails` now contains `deductedItems`, `failedItems`, and `skippedItems` arrays. This is an enhancement to the existing REQ-INV-013 behaviour: the error details are now more granular.

## No new SRS items needed

REQ-087 does not introduce new user-observable behaviour. It refactors existing inventory deduction logic to be more resilient and provide better error detail. All acceptance criteria trace to existing SRS items (REQ-INV-012, REQ-INV-013). The enhancements (per-item tracking, skip-on-retry, structured error details) are improvements to existing behaviour, not new features requiring new SRS entries.

## Operator sign-off

- [x] All ACs trace to at least one existing SRS item.
- [x] No SRS stubs need to be created (no new user-observable behaviour).
- [x] SRS items are in the correct feature area sections.

**Reviewer:** Operator
**Date:** 2026-06-28
