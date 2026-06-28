# Implementation Plan — REQ-087

**Requirement:** REQ-087
**GitHub Issue:** #411
**Risk Level:** HIGH
**Date:** 2026-06-28

## Approach

Refactor `InventoryService.deductStockForOrder` from an all-or-nothing for-loop that throws on first failure to a per-item try/catch that returns a result object. Add `inventoryDeductionDetails` subdocument array to the order model for per-item deduction tracking (pending/deducted/failed). Update `completeOrder` to consume the result object, persist per-item state, and write detailed IncidentEvents with item breakdowns. The reconciliation cron auto-benefits because `deductStockForOrder` now skips already-deducted items.

## Files to Create

- `__tests__/services/inventory-service.deduct-per-item.test.ts` — unit tests for per-item deduction, skip-on-retry, partial success/failure

## Files to Modify

- `interfaces/order.interface.ts` — add `IInventoryDeductionDetail` interface and `inventoryDeductionDetails` field to `IOrder`
- `models/order-model.ts` — add `inventoryDeductionDetails` subdocument array schema
- `services/inventory-service.ts` — refactor `deductStockForOrder` to per-item try/catch returning result object; update `reconcileMissedDeductions` to consume new return type
- `services/order-service.ts` — update `completeOrder` to consume result object, persist per-item details, write detailed IncidentEvent

## Architecture Decisions

No ADR needed — bug fix refactoring existing code paths, no new third-party deps, no new database/cache/queue, pattern change is contained to 4 files but follows existing service patterns.

## Dependencies

None

## Risks / Considerations

- RISK: Per-item deduction changes the contract of `deductStockForOrder` from `Promise<void>` (throws on failure) to `Promise<DeductionResult>` (returns result object). All callers must be updated. Mitigated: only two callers exist (`completeOrder` and `reconcileMissedDeductions`), both updated in this REQ.
- RISK: Existing orders without `inventoryDeductionDetails` field — Mongoose default handles this (empty array). No migration needed.
- RISK: Existing tests mock `deductStockForOrder` as returning `void` / throwing. Must update mock return types.

## Post-Deploy Actions

None — Mongoose schema addition is backward-compatible (default empty array). No data migration needed.
