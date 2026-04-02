# Implementation Plan — REQ-020

**Requirement:** REQ-020 — Restock recommendation strategies (popularity, profitability) with CSV export
**Risk Level:** MEDIUM
**GitHub Issue:** #43
**Date:** 2026-04-01

## Approach

Extend the existing restock recommendations service and UI with a `strategy` parameter that changes how items are scored, sorted, and quantity-adjusted. Add client-side CSV export. No new API endpoints or DB calls needed — the same 4-query pipeline provides all required data.

## Architecture Decisions

- **Strategy is a sort/score layer** — the underlying data fetch (menu items, inventories, bulk velocity, last restock, pricing) stays identical across all three strategies
- **Diversity guarantee applied in service** — after scoring, ensure min 2 items per subcategory; guaranteed low-activity items use `max(0, minimumStock - currentStock)` instead of velocity-based formula
- **CSV export is client-side** — no new server action needed; generate from the report data already in React state
- **Strategy param added to existing service and action** — backwards compatible (defaults to `urgency`)

## Service Changes

**File: `services/restock-recommendation-service.ts`**

Add `strategy` to params: `'urgency' | 'popularity' | 'profitability'` (default: `'urgency'`).

Add `score` field to `RestockRecommendationItem`.

After building all items (unchanged), apply strategy-specific logic:

1. **Urgency** (existing): sort by priority then daysUntilStockout. No diversity guarantee. No quantity adjustment.
2. **Popularity**: score = `avgDailySales`. Sort by score descending. Apply diversity guarantee. Adjust quantities for low-score items.
3. **Profitability**: score = `(sellingPrice - costPerUnit) * avgDailySales`. Sort by score descending. Apply diversity guarantee. Adjust quantities for low-score items.

**Diversity guarantee logic** (popularity + profitability only):

- Group items by category
- For each category, mark the top N items (by score) as "scored"
- If a category has fewer than 2 items total, all are included
- If a category has 2+ items but fewer than 2 scored items, pad with the highest-scoring unscored items
- Guaranteed-but-low-score items get `suggestedReorderQty = max(0, minimumStock - currentStock)` (minimum viable restock)

## Server Action Changes

**File: `app/actions/inventory/restock-recommendation-actions.ts`**

Add `strategy` param to `GetRestockRecommendationsParams`. Pass through to service.

## Client Component Changes

**File: `components/features/inventory/restock-recommendations-client.tsx`**

- Add strategy state: `useState<string>('popularity')` — popularity as default per user request
- Add segmented control / tabs above the filter card: Stock Urgency | Popularity | Profitability
- Add CSV Export button in the filter card
- CSV generation: build rows from `report.groups[].items[]`, trigger browser download

## Files Modified

| File                                                               | Change                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `services/restock-recommendation-service.ts`                       | Add strategy param, score field, diversity guarantee, quantity adjustment |
| `app/actions/inventory/restock-recommendation-actions.ts`          | Add strategy param passthrough                                            |
| `components/features/inventory/restock-recommendations-client.tsx` | Add strategy tabs, export button, CSV generation                          |

## Files Created

| File                                                            | Purpose                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| `__tests__/inventory/restock-recommendation-strategies.test.ts` | Unit tests for scoring, diversity, quantity adjustment, CSV |
| `compliance/evidence/REQ-020/`                                  | SDLC compliance artifacts                                   |
