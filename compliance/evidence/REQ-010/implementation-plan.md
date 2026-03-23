# Implementation Plan — REQ-010

**Requirement:** REQ-010
**GitHub Issue:** #4
**Risk Level:** MEDIUM
**Date:** 2026-03-22

## Approach

Add a `paymentBreakdown` field to the `DailySummaryReport` interface, aggregate payment totals by method during report generation, and display the breakdown as a new card row on the daily report page between the key metrics and the export buttons.

## Files to Modify

- `services/financial-report-service.ts` — Add `paymentBreakdown` to `DailySummaryReport` interface, aggregate `paymentMethod` from paid orders in both `generateDailySummary` and `generateDateRangeSummary`
- `app/dashboard/reports/daily/daily-report-client.tsx` — Add payment breakdown cards between key metrics and export buttons

## Files to Create

None — this is a modification to existing files only.

## Architecture Decisions

- Aggregate at the service layer (not UI) so the data is available for export too
- Use the existing `orders` query (already filtered to `paymentStatus: 'paid'`) — no additional DB query needed
- Handle missing/null `paymentMethod` as "Unspecified" for orders that were marked paid without a method
- Display as a row of cards matching the existing key metrics card style

## Dependencies

None

## Risks / Considerations

- Some orders may have `paymentMethod: null` if they were paid before the field was consistently populated — handle gracefully as "Unspecified"
- The `paymentMethod` enum in the order model is `'card' | 'transfer' | 'ussd' | 'phone' | 'cash'` — display "POS" for "card" to match business terminology
