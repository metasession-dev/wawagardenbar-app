# Implementation Plan — REQ-014

**Requirement:** REQ-014
**GitHub Issue:** #11
**Risk Level:** MEDIUM
**Date:** 2026-03-27

## Approach

Add `reconciled`, `reconciledAt`, `reconciledBy` fields to both Tab and Order models. Create a server action to toggle reconciliation status. Add a checkbox to each tab card on the tabs list page and each standalone order (no tabId) on the orders page. Update both pages' filters to support All/Reconciled/Not Reconciled.

## Files to Modify

### Data Model

- `interfaces/tab.interface.ts` — add `reconciled`, `reconciledAt`, `reconciledBy` to ITab
- `interfaces/order.interface.ts` — add `reconciled`, `reconciledAt`, `reconciledBy` to IOrder
- `models/tab-model.ts` — add fields to schema
- `models/order-model.ts` — add fields to schema

### Server Actions

- `app/actions/tabs/tab-actions.ts` — add `toggleTabReconciliationAction(tabId: string)`
- `app/actions/admin/order-management-actions.ts` — add `toggleOrderReconciliationAction(orderId: string)`

### UI — Tabs Page

- `components/features/admin/tabs/dashboard-tabs-list-client.tsx` — add reconciliation checkbox to each tab card; update local Tab interface to include reconciled fields
- `components/features/admin/tabs/dashboard-tabs-filter.tsx` — add reconciliation filter (All/Reconciled/Not Reconciled)
- `app/actions/tabs/tab-actions.ts` — update `getDashboardFilteredTabsAction` to accept `reconciled` filter param

### UI — Orders Page

- `components/features/admin/order-queue.tsx` — add reconciliation checkbox to standalone orders (where `tabId` is absent); add reconciliation filter
- `app/actions/admin/order-management-actions.ts` — update `getOrdersAction` to accept `reconciled` filter param; include `reconciled`, `reconciledAt`, `tabId` in serialized response

## Architecture Decisions

- **Toggle action pattern:** A single toggle action (not separate reconcile/unreconcile) — simpler API, mirrors checkbox UX
- **Immediate persistence:** Each checkbox toggle calls a server action immediately (optimistic UI with revert on error)
- **Filter approach:** Tabs use server-side filtering (existing pattern); orders use the existing `getOrdersAction` with a new `reconciled` filter param
- **Standalone orders only:** The orders page only shows reconciliation checkbox for orders where `tabId` is null/undefined — tab orders are reconciled at the tab level

## Dependencies

- None — no new packages required

## Risks / Considerations

- Existing tabs and orders will have `reconciled: undefined` — treat as `false` in UI and queries
- The orders list currently uses client-side filtering; reconciliation filter will use server-side via `getOrdersAction` for consistency
