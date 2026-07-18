# ADR-001: Preserve report attribution at sale time

**Status:** Proposed
**Date:** 2026-07-18
**Deciders:** WGB maintainer and independent REQ-094 plan reviewer
**Related:** REQ-094, #439, #514

## Context

Financial reports currently need category and main-category data for historical orders, but an order item does not persist those fields. Resolving the category from the current `MenuItem` changes the apparent history when an administrator reclassifies a menu item. Profitability reporting also uses `createdAt` and UTC day labels while the Daily Report uses the configured WAT business-day contract.

Historical data without a sale-time category cannot be recovered with certainty. Backfilling it from the current menu item is useful as an operational fallback, but is not equivalent to historical evidence.

## Decision

1. Persist immutable `mainCategoryAtSale` and `categoryAtSale` fields on each new order item from the authoritative menu item at the time the order is created.
2. Report read paths prefer these immutable fields. Any row that lacks them uses a documented fallback with an explicit provenance value such as `legacy_current_menu_fallback`; the UI and exported report metadata must not describe it as sale-time attribution.
3. Date selection and daily profitability labels use the existing shared WAT business-date helper and the configured cutoff. `createdAt` is not the report-attribution key for paid orders.
4. The migration is additive, dry-runnable, idempotent, and non-destructive. It records counts and provenance; it does not overwrite a populated immutable snapshot.
5. Inventory snapshot calendar dates use the same WAT-normalisation utility rather than server-local `Date#setHours`.

## Consequences

- New sales retain stable category attribution after catalogue maintenance.
- Legacy reporting remains usable but honestly communicates its lower historical certainty.
- The order-item schema grows additively and requires all order-creation paths to populate the same fields.
- Report results may visibly distinguish historical fallback rows until older records acquire reliable source evidence, if ever.
- Rollback can return to the previous read path without deleting additive fields or migration provenance.

## Alternatives considered

- **Resolve categories exclusively from current menu items:** Rejected because it silently rewrites financial history after reclassification.
- **Backfill current categories and call them historical:** Rejected because it creates misleading audit evidence.
- **Freeze a full menu-item document in every order:** Rejected for now because the two report-attribution fields are the minimal data needed; existing order-item price and cost snapshots already cover the financial values.
- **Keep UTC/server-local dates:** Rejected because it conflicts with the existing business-day reporting model around WAT cutoffs.

## Approval

This ADR becomes **Accepted** only with the independent HIGH-risk plan approval for REQ-094. It must be updated with reviewer and date at that checkpoint.
