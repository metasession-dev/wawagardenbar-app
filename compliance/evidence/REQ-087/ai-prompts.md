# AI Prompts Log — REQ-087

## Session 1 — 2026-06-28

### Prompt 1: Implementation planning

**User request:** Implement GitHub issue #411 — refactor inventory deduction for partial failure handling with per-item tracking. Refactor `deductStockForOrder` to return `IDeductionResult` with per-item statuses instead of throwing on first failure. Update `completeOrder`, `reconcileMissedDeductions`, and incident retry actions.

**AI actions:**

- Reviewed existing code in `services/inventory-service.ts`, `services/order-service.ts`, `models/order-model.ts`, `interfaces/order.interface.ts`
- Created implementation plan documenting approach, files, architecture decisions
- Added interfaces: `IDeductionResult`, `IDeductionItemResult`, `IInventoryDeductionDetail`, `ILinkedDeductionResult`
- Added `inventoryDeductionDetails` subdocument array to order model
- Refactored `deductStockForOrder` to per-item try/catch with skip-on-retry
- Updated `completeOrder` to consume result, persist per-item details, write IncidentEvent on partial failure
- Updated `reconcileMissedDeductions` to consume new return type
- Updated `retryInventoryDeductionAction` to handle partial success
- Added `incidents.retry_deduction_partial` to `AuditAction` type

### Prompt 2: Test updates

**User request:** Write/update tests for the new per-item deduction functionality.

**AI actions:**

- Created `__tests__/services/inventory-service.deduct-per-item.test.ts` with 6 tests covering AC1 (partial failure), AC2 (skip-on-retry), AC4 (all-succeed), plus edge cases
- Updated 10 existing test files to mock new `IDeductionResult` return type
- Added AC3 test to `order-service.completeOrder.test.ts` for partial-failure IncidentEvent
- Updated E2E over-sell spec for new IncidentEvent shape

### Prompt 3: CI failure fix

**User request:** Review CI results and identify bugs.

**AI actions:**

- Identified evidence-completeness gate failure: over-sell spec lacked `@requirement REQ-087` tag
- Added tag to fix CI failure
- Identified upstream design flaw: gate only scans E2E specs, ignores unit tests
