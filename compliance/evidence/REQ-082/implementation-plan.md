# REQ-082 — Implementation Plan

## Overview

Replace the strict drill-down cascade (Main → Sub → Items) with progressive disclosure across 3 surfaces using `CategoryCascadeFilter`: express order, menu management, and inventory management. Items visible on landing grouped by main/sub category. Search always filters items, not categories. Improved breadcrumb navigation.

## Surfaces Affected

1. **Express order** — `app/dashboard/orders/express/create-order/page.tsx`
2. **Menu management** — `components/features/admin/menu-items-client.tsx`
3. **Inventory management** — `components/features/admin/inventory-items-client.tsx`

Note: No separate quick order page exists. The "quick order" card on `/dashboard/orders` routes to express order.

## Approach

### 1. CategoryCascadeFilter Component (`components/features/admin/category-cascade-filter.tsx`)

**Current:** 3 render states (no main → main options, main selected → sub options, sub selected → breadcrumb + search). Search filters categories when no sub-category selected, filters items when sub-category selected.

**Changes:**

- Always render category buttons + search together (no conditional hiding of categories when searching)
- Search input placeholder: always "Search menu items..." (not "Search main categories..." / "Search sub categories...")
- Remove `filteredMainCategories` / `filteredSubCategories` logic — search no longer filters category buttons
- Breadcrumb: show "All Categories > [Main] > [Sub]" with clickable segments to navigate back
- Category buttons remain visible at all times as a filtering mechanism, not a drill-down gate
- Single clear "All Categories" button to reset to unfiltered state

### 2. Consumer Components — Grouped Item Display

**Current:** `canBrowseItems` gate blocks item display until categories selected or search active.

**Changes:**

- Remove `canBrowseItems` gate — items always display
- Add grouping logic: group `filteredItems` by `mainCategory`, then by `category` within each main group
- When no main category selected: show all items grouped by main → sub
- When main category selected: show items for that main, grouped by sub
- When sub category selected: show items flat (current behavior)
- Render group headers with main category label and sub category label

### 3. Express Order Page (`app/dashboard/orders/express/create-order/page.tsx`)

**Current:** `canBrowseItems` gates menu card display. Server action `expressSearchMenuAction` already supports optional category filtering.

**Changes:**

- Remove `canBrowseItems` gate
- Group menu cards by main category then sub category
- Search always triggers `expressSearchMenuAction` with optional category params (already supported)
- On landing (no category, no search): fetch all available items

### 4. E2E Tests (`e2e/menu-category-cascade.spec.ts`)

**Changes:**

- Remove assertions for prompt text ("Select a main category to start browsing menu items.")
- Update tests to expect items visible on landing
- Update search tests to verify items are filtered (not categories)
- Update navigation tests for new breadcrumb pattern
- Update `revealFirstExpressMenuCard` helper if needed

## Files to Modify

1. `components/features/admin/category-cascade-filter.tsx` — search UX + breadcrumb
2. `components/features/admin/menu-items-client.tsx` — remove gate, add grouping
3. `components/features/admin/inventory-items-client.tsx` — remove gate, add grouping
4. `app/dashboard/orders/express/create-order/page.tsx` — remove gate, add grouping
5. `e2e/menu-category-cascade.spec.ts` — update tests
6. `e2e/helpers/express-menu.ts` — update helper if needed

## Architecture Decisions

- No new components — grouping logic inline in each consumer (keeps it simple)
- No new server actions — `expressSearchMenuAction` already supports optional filters
- No schema changes — purely UI/UX
- Category buttons remain visible at all times (filter chips, not drill-down gates)

## Risks

- R-001: Express order performance with all items loaded on landing (mitigation: server-side pagination or lazy loading if needed)
- R-002: E2E test breakage across multiple specs (mitigation: update tests in same PR)
