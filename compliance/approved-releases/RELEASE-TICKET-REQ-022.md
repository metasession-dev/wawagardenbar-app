# Release Ticket: REQ-022 — Cost snapshot fix for financial reports

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-05
**Requirement ID:** REQ-022
**Risk Level:** MEDIUM
**PR:** #47

---

## Summary

Financial reports were using current `inventory.costPerUnit` instead of the order-snapshotted `item.costPerUnit`, causing historical cost/profit data to change retroactively when supplier costs were updated. Additionally, a duplicate Cost Per Unit field existed in the inventory section of menu item forms, creating an unsynced write path that bypassed price history auditing. Both issues are now fixed with a single source of truth through Price Management.

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** `__tests__/reports/report-cost-snapshot.test.ts`, `__tests__/reports/public-sales-summary-cost.test.ts`, `__tests__/inventory/price-update-inventory-sync.test.ts`, `e2e/cost-snapshot.spec.ts`
- **Human Reviewer of AI Code:** William
- **Components Regenerated:** None

## Implementation Details

**Files Modified:**

- `services/financial-report-service.ts` — Removed 2 inventory lookups, use `item.costPerUnit` from orders for daily and custom reports; removed unused InventoryModel import
- `app/api/public/sales/summary/route.ts` — Removed inventory lookup, use `item.costPerUnit` from orders for COGS; removed unused InventoryModel import
- `components/features/admin/menu-item-edit-form.tsx` — Removed Cost Per Unit field from inventory section; made Price field read-only with pointer to Price Management
- `components/features/admin/menu-item-form.tsx` — Same removal from create form
- `app/actions/admin/menu-actions.ts` — Removed `costPerUnit` write and `price` write from `updateMenuItemAction()`; price now only set via PriceHistoryService
- `services/price-history-service.ts` — Added `Inventory.costPerUnit` sync after price update via `InventoryModel.findOneAndUpdate()`
- `playwright.config.ts` — Added cost-snapshot project

**Dependencies Added/Changed:**

- No dependency changes

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                             |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| Unit (Vitest)    | 211   | 211    | 0      | META-COMPLY portal: wawagardenbar-app/REQ-022 |
| E2E (Playwright) | 5     | 5      | 0      | META-COMPLY portal: wawagardenbar-app/REQ-022 |

## Security Evidence

| Check            | Result              | Evidence Location                                      |
| ---------------- | ------------------- | ------------------------------------------------------ |
| SAST             | 0 new high/critical | META-COMPLY portal: wawagardenbar-app/REQ-022          |
| Dependency Audit | 0 new high/critical | META-COMPLY portal: wawagardenbar-app/REQ-022          |
| Access Control   | N/A                 | Git: `compliance/evidence/REQ-022/security-summary.md` |
| Audit Log        | N/A                 | Git: `compliance/evidence/REQ-022/security-summary.md` |

## Acceptance Criteria

- [x] `financial-report-service.ts` uses `item.costPerUnit` from order records (not `inventory.costPerUnit`) in both daily and custom report generation
- [x] `app/api/public/sales/summary/route.ts` uses `item.costPerUnit` from order records
- [x] `PriceHistoryService.updatePrice()` syncs `Inventory.costPerUnit` when updating price/cost
- [x] Cost Per Unit field removed from inventory section of both create and edit forms
- [x] `costPerUnit` no longer submitted as part of inventory form data in `updateMenuItemAction()`
- [x] Inventory analytics (waste cost, stock valuation) still function correctly via synced value
- [x] All unit and E2E tests pass
- [x] AI use documented

## Risk Assessment

- No new dependencies
- Reduces attack surface (fewer unaudited write paths)
- Pre-existing SAST/audit findings tracked in #42, not introduced by this change

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                           |
| ---- | ---------------- | ------ | -------- | ------------------------------- |
| —    | None             | —      | —        | No post-deploy actions required |

---

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed (if applicable)
- [ ] No hallucinated dependencies
- [ ] Post-deploy actions documented (or confirmed none required)

---

## Audit Trail

| Date       | Action                   | Actor            | Notes                                        |
| ---------- | ------------------------ | ---------------- | -------------------------------------------- |
| 2026-04-05 | Requirement created      | Claude + William | Risk: MEDIUM                                 |
| 2026-04-05 | Implementation completed | Claude + William | 3 report fixes, form cleanup, inventory sync |
| 2026-04-05 | AI code reviewed         | William          | All generated code reviewed                  |
| 2026-04-05 | Tests passed             | CI               | Run 23999884423: all gates green             |
| 2026-04-05 | Evidence compiled        | Claude + William | Awaiting UAT verification                    |
