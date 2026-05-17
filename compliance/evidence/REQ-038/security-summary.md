# Security Summary — REQ-038

**Date:** 2026-05-17
**Risk Level:** MEDIUM

## Authorisation & authentication

- No new routes; the changes ride on existing surfaces:
  - **Expense form** is already auth-gated (admin / super-admin with `expenseManagement` permission); the new "Update inventory count" checkbox + sellable dropdown inherit that gate.
  - **MenuItem editor** is already auth-gated (admin / super-admin with `menuManagement` permission); the new Purchase unit dropdown inherits that gate.
- No new server actions. The existing `expense-actions.ts` save / edit / delete paths now route to the relaxed `applyExpenseInventoryLink` for both kinds.

## Authorisation matrix (post-REQ-038)

| Role / Permission                                 | Set MenuItem `expenseUnitOverride`      | Add expense with "Update inventory count" (sellable) | Edit expense with sellable link | Customer view menu |
| ------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- | ------------------------------- | ------------------ |
| super-admin                                       | ✅ allow                                | ✅ allow                                             | ✅ allow                        | ✅ (read-only)     |
| admin with `menuManagement` + `expenseManagement` | ✅ allow                                | ✅ allow                                             | ✅ allow                        | ✅ (read-only)     |
| admin with one but not the other                  | partial (only the path with permission) | partial                                              | partial                         | ✅ (read-only)     |
| csr (default)                                     | ❌ forbidden                            | ❌ forbidden                                         | ❌ forbidden                    | ✅ (read-only)     |

## Data integrity

- **Service relaxation is single-line.** The kind guard at `services/expense-inventory-link-service.ts:66` accepts a wider set; nothing else changes. The financial write path (StockMovement + $inc + CostHistory + reversal-on-failure) is identical to the kitchen path that REQ-034 hardened — no new transaction shape.
- **Override enforcement is server-side.** UI lock is defence in depth; the service rejects mismatched units regardless of UI state. Service rejection names both units + the override so the operator can diagnose without log-spelunking.
- **`expenseUnitOverride` field is generic.** Sourced from the UoM registry at runtime. New units added in Settings → Units of Measurement auto-appear in the Purchase unit dropdown. No code change needed to support cans, crates, cases, kegs, growlers, etc.
- **REQ-037 soft-archive respected.** The sellable dropdown filters `archivedAt: { $exists: false }` so archived items don't surface.
- **REQ-034 D10 unit conversion still fires.** The shared `convertExpenseQuantityToInventoryUnit` helper handles cross-dimension cases the same way for sellable as for kitchen.

## Threat model (deltas from REQ-034)

| Threat                                                                                                            | Mitigation                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operator types "5" into a unit-tracked sellable inventory and accidentally adds 5 bottles when they meant 5 cases | `expenseUnitOverride` on the MenuItem forces the Expense form's Unit field to the chosen unit; service-side check rejects mismatches even if UI is bypassed               |
| Service kind guard relaxed too broadly                                                                            | Explicit `kind in ('kitchen-ingredient', 'menu-item')` allowlist; non-matching kinds rejected with the same error pattern as before                                       |
| Operator changes `expenseUnitOverride` on a MenuItem retroactively, breaking past expense's unit assumption       | Out of scope (`expenseUnitOverride` affects future expenses only; existing expenses' `linkedInventoryId` continues to reference the inventory regardless of the override) |
| Customer-menu query missing the kind filter on the new sellable-link UI                                           | Customer menu is read-only and uses `kind: 'menu-item'` filter; sellable items continue to render as today, with the new restock path invisible to customers              |
| csr-role staff reach the new "Update inventory count" surface                                                     | Auth gate on the Expense form (existing `expenseManagement` permission) unchanged; csr default has no `expenseManagement`                                                 |
| Override accidentally hard-coded to 'bottles' in helper, fails for 'cans'                                         | `validateExpenseUnitAgainstOverride` is generic over the unit id; tested with at least two different ids                                                                  |

## Tests added

- Helper unit tests covering the threat-table rows above.
- Service tests covering kind acceptance + override enforcement + cross-kind rejection.
- E2E walks covering each operator-facing surface with per-AC `evidenceShot` PNGs.
