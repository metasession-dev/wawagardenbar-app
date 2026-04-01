# Implementation Plan — REQ-019

**Requirement:** REQ-019 — Restock Recommendations Dashboard Page
**Risk Level:** MEDIUM
**GitHub Issue:** #41
**Date:** 2026-04-01

## Approach

Add a new page at `/dashboard/inventory/restock-recommendations` under the existing inventory layout (which enforces `inventoryManagement` permission for admin/super-admin). Create a bulk-optimised service to avoid N+1 DB queries, a server action for data fetching, and a client component with filters.

## Architecture Decisions

- **No new permissions** — reuses `inventoryManagement` from `app/dashboard/inventory/layout.tsx`
- **No new sidebar nav item** — follows existing pattern where sub-pages (Transfer, Snapshots) are accessed from the inventory page header
- **Bulk aggregation** — single `StockMovement` pipeline instead of per-item `InventoryService.calculateSalesVelocity()` calls. Uses existing `{ inventoryId: 1, timestamp: -1 }` index
- **costPerUnit source** — `MenuItemPriceHistory` (current pricing with `effectiveTo: null`), falling back to `MenuItem.costPerUnit` since `Inventory.costPerUnit` is deprecated
- **Reorder formula** — reuses existing formula from `services/inventory-service.ts:355`: `suggestedReorderQty = max(0, ceil(velocity * 7 + minimumStock - currentStock))`

## Files Created

| File                                                               | Purpose                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `services/restock-recommendation-service.ts`                       | Bulk service — 4 DB calls total: MenuItems, Inventories, bulk velocity aggregation, last restock dates |
| `app/actions/inventory/restock-recommendation-actions.ts`          | Server actions with session/role auth checks                                                           |
| `app/dashboard/inventory/restock-recommendations/page.tsx`         | Server component with breadcrumb and Suspense wrapper                                                  |
| `components/features/inventory/restock-recommendations-client.tsx` | Client component: filters, summary cards, collapsible category group tables                            |
| `__tests__/inventory/restock-recommendation.test.ts`               | 25 unit tests — priority, reorder, grouping, velocity                                                  |
| `e2e/restock-recommendations.spec.ts`                              | 7 E2E tests — page access, filters, redirect, navigation                                               |

## Files Modified

| File                               | Change                                                |
| ---------------------------------- | ----------------------------------------------------- |
| `app/dashboard/inventory/page.tsx` | Added "Restock Recommendations" link button in header |
| `playwright.config.ts`             | Added `restock-recommendations` test project          |

## Service Design

`RestockRecommendationService.getRestockRecommendations(params)`:

1. Query `MenuItemModel` where `trackInventory: true`, filtered by mainCategory, category, price range
2. Query `InventoryModel` for matching items
3. Bulk velocity: `StockMovementModel.aggregate` — match `category: 'sale'` + `timestamp >= cutoff` + `inventoryId: { $in: [...] }`, group by `inventoryId`, sum `$abs(quantity)`, divide by days
4. Last restock dates: `StockMovementModel.aggregate` — match `category: 'restock'`, group by `inventoryId`, `$max(timestamp)`
5. Current pricing: `MenuItemPriceHistory.find` where `effectiveTo: null`

Priority thresholds:

- **Urgent**: daysUntilStockout <= 2 OR currentStock <= minimumStock
- **Medium**: daysUntilStockout <= 7
- **Low**: everything else

## UI Pattern

Follows `profitability-dashboard-client.tsx` pattern: `useState` + `useEffect` + server actions. Filter changes trigger re-fetch. shadcn/ui components for Select, Card, Collapsible, Table, Badge.
