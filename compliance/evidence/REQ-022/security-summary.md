## Security Evidence Summary — REQ-022

**Date:** 2026-04-05
**SAST Tool:** Semgrep (auto config)
**SAST High/Critical Findings:** 0 new (1 pre-existing in xlsx-parser — tracked in #42)
**Dependency Audit High/Critical:** 0 new (1 pre-existing xlsx prototype pollution — no fix available, tracked in #42)

### Access Control

N/A — no access control changes. Report endpoints retain existing auth checks. Form field removal reduces surface area (fewer write paths to inventory cost).

### Audit Log

N/A — no audit log changes. Price Management already logs all cost changes via `MenuItemPriceHistory` with `changedBy`, `reason`, and date ranges. Removing the duplicate field eliminates an unaudited write path.

### Changes Summary

- **Removed** 3 unnecessary `InventoryModel.findOne()` queries from report paths (reduces DB load)
- **Removed** editable `costPerUnit` field from both create and edit forms (reduces write paths)
- **Added** `Inventory.costPerUnit` sync in `PriceHistoryService.updatePrice()` (maintains consistency without separate editable field)

Evidence uploaded to META-COMPLY project: wawagardenbar-app
