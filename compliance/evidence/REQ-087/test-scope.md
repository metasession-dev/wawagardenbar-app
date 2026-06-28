# Test Scope — REQ-087

**Risk Level:** HIGH
**Requirement:** Per-item inventory deduction tracking — refactor all-or-nothing loop to per-item try/catch with skip-on-retry
**GitHub Issue:** #411
**Date:** 2026-06-28

## Test Approach

Full verification and validation per Test Strategy high-risk requirements.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Security testing (mandatory for HIGH):**

- [ ] Access control: no new endpoints — existing admin/kitchen auth unchanged
- [ ] Audit logging: verify IncidentEvent still written on partial failure, with per-item breakdown
- [ ] Input validation: verify order model schema validates new subdocument array
- [ ] Error handling: verify no sensitive data in error responses; per-item errors are operational messages

**Additional high-risk testing:**

- [ ] Independent review: second human reviewer required before merge
- [ ] Performance impact: per-item try/catch adds negligible overhead (same DB calls, just restructured)
- [ ] Regression scope: existing E2E tests for inventory deduction (over-sell, sale-point) must still pass

## Validation Approach

How we confirm this meets the business requirement:

- Unit test: 3-item order where item 2 has 0 stock — item 1 deducted, item 2 failed, item 3 deducted (not skipped)
- Unit test: retry of same order — item 1 skipped (already deducted), item 2 retried, item 3 deducted
- Unit test: all items succeed — `allSucceeded` true, `inventoryDeducted` set to true
- Unit test: IncidentEvent contains `deductedItems`, `failedItems`, `skippedItems` arrays
- E2E: existing over-sell spec still passes (regression)

## AI Involvement (if applicable)

- AI tool: Windsurf Cascade
- Code categories AI will generate: service refactoring, model schema, interface types, unit tests
- Elevated review required for: inventory-service.ts (financial data), order-service.ts (order completion flow)
- Regeneration protocol: none

## Acceptance Criteria

- [ ] **AC1** — Given an order with 3 items where item 2 has insufficient stock, When kitchen staff complete the order via the kitchen display, Then item 1 and item 3 are deducted from inventory (StockMovement rows created, inventory.save() persisted) and item 2 is marked as failed in `inventoryDeductionDetails` on the order document.
- [ ] **AC2** — Given an order where item 1 was already deducted (status='deducted' in `inventoryDeductionDetails`), When the reconciliation cron retries `deductStockForOrder`, Then item 1 is skipped (no double deduction), and only failed/pending items are retried.
- [ ] **AC3** — Given a partial deduction failure, When `completeOrder` catches the result, Then the IncidentEvent `errorDetails` contains `deductedItems`, `failedItems`, and `skippedItems` arrays with menuItemId, itemName, quantity, and error fields.
- [ ] **AC4** — Given all items deduct successfully, When `deductStockForOrder` returns, Then `allSucceeded` is true and `order.inventoryDeducted` is set to true with `inventoryDeductedAt` timestamp.
- [ ] **AC5** — Given the existing over-sell E2E test scenario, When the test runs, Then it still passes (regression — the over-sell scenario now produces a per-item failure result instead of a throw, but the IncidentEvent is still written and inventoryDeducted stays false).
- [ ] All security testing items pass
- [ ] All validation items confirmed
- [ ] Independent review completed (if required)
