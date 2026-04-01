# Implementation Plan — REQ-021

**Requirement:** REQ-021 — Crate/unit packaging for inventory items
**Risk Level:** MEDIUM
**GitHub Issue:** #44
**Date:** 2026-04-01

## Approach

Add optional `crateSize` and `packagingType` fields to the inventory model. Surface these in the menu item create/edit forms. Use crate info in restock recommendations to show crate-rounded order quantities and include in CSV export.

## Data Model Changes

**File: `interfaces/inventory.interface.ts`**

- Add `crateSize?: number` — units per crate (e.g. 24)
- Add `packagingType?: string` — display label (e.g. "crate", "case", "pack")

**File: `models/inventory-model.ts`**

- Add `crateSize: { type: Number, min: 1 }` (optional)
- Add `packagingType: { type: String }` (optional)

## Form Changes

**File: `components/features/admin/menu-item-form.tsx`** (create)

- Add crateSize and packagingType fields in the inventory section, after supplier
- Zod schema: `crateSize: z.number().min(1).optional()`, `packagingType: z.string().optional()`

**File: `components/features/admin/menu-item-edit-form.tsx`** (edit)

- Same fields, pre-populated from existing inventory data

**File: `app/actions/admin/menu-actions.ts`**

- Parse `crateSize` and `packagingType` from FormData in both create and update actions
- Pass through to InventoryModel create/update

## Restock Recommendations Changes

**File: `services/restock-recommendation-service.ts`**

- Add `crateSize` and `packagingType` to `RestockRecommendationItem` interface
- Add `cratesToOrder` computed field: `crateSize > 0 ? Math.ceil(suggestedReorderQty / crateSize) : null`
- Read crateSize from inventory records (already fetched in query 2)

**File: `components/features/inventory/restock-recommendations-client.tsx`**

- Show crate breakdown in Reorder Qty column when crateSize is set
- Display format: "3 crates (72)" or "58 → 3 crates"
- Include in CSV export: Crate Size, Crates to Order columns

## Files Modified

| File                                                               | Change                                       |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `interfaces/inventory.interface.ts`                                | Add crateSize, packagingType                 |
| `models/inventory-model.ts`                                        | Add crateSize, packagingType to schema       |
| `components/features/admin/menu-item-form.tsx`                     | Add form fields                              |
| `components/features/admin/menu-item-edit-form.tsx`                | Add form fields                              |
| `app/actions/admin/menu-actions.ts`                                | Parse and save new fields                    |
| `services/restock-recommendation-service.ts`                       | Add to item interface, compute cratesToOrder |
| `components/features/inventory/restock-recommendations-client.tsx` | Display crate breakdown, CSV columns         |

## Files Created

| File                                          | Purpose                           |
| --------------------------------------------- | --------------------------------- |
| `__tests__/inventory/crate-packaging.test.ts` | Unit tests for crate calculations |
