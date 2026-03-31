# Implementation Plan — REQ-018

**Requirement:** REQ-018
**GitHub Issue:** #34
**Risk Level:** MEDIUM
**Date:** 2026-03-30

## Approach

Three workstreams: (1) extend Staff Pot config with loss deduction settings, (2) build inventory loss calculation service that queries approved snapshots, (3) integrate deductions into Staff Pot tracker with role-based display.

## Files to Modify

### Configuration

- `services/system-settings-service.ts` — add `inventoryLossEnabled`, `foodLossThreshold`, `drinkLossThreshold` to `getStaffPotConfig` / `updateStaffPotConfig` return types and defaults
- `services/staff-pot-service.ts` — add `StaffPotConfig` fields, integrate loss calculation into `getMonthData`, add deduction fields to `StaffPotMonthData`
- `components/features/admin/staff-pot/staff-pot-config-form.tsx` — add enable/disable toggle, food/drink threshold inputs

### Staff Pot Service

- `services/staff-pot-service.ts` — new method `calculateInventoryLoss(month, year, config)` that:
  1. Queries `InventorySnapshot` for approved snapshots in the date range
  2. Aggregates by `mainCategory` (food/drinks)
  3. Calculates loss % per category: `sum(discrepancy where negative) / sum(systemInventoryCount) * 100`
  4. Calculates deduction: `max(0, actualLoss% - threshold%) * totalInventoryValue / 100`
  5. Returns `{ foodLossPercent, drinkLossPercent, foodDeduction, barDeduction, foodInventoryValue, drinkInventoryValue }`

### Staff Pot Tracker UI

- `app/dashboard/staff-pot/staff-pot-client.tsx` — update summary cards to show deductions, role-split display:
  - Admin: "Inventory adjustment: -₦X" on team card, adjusted per-person bonus, motivational text
  - Super-admin: full breakdown table with loss %, threshold, value, deduction calculation

### Server Actions

- `app/actions/admin/staff-pot-actions.ts` — ensure `getStaffPotDataAction` serializes the new deduction fields

### Models

- `models/staff-pot-snapshot-model.ts` — add `foodLossPercent`, `drinkLossPercent`, `kitchenDeduction`, `barDeduction` to the snapshot schema for historical records

## Architecture Decisions

- **Query approved snapshots only** — pending/rejected snapshots are not finalized and should not affect the pot
- **Loss = negative discrepancies only** — positive discrepancies (found more than expected) don't offset losses. This prevents hiding waste by overstocking.
- **Inventory value from costPerUnit** — use `Inventory.costPerUnit` for the value calculation. If unavailable, fall back to menu item price. Cost-based is more accurate for loss accounting.
- **Deduction capped at pot amount** — kitchen/bar deduction cannot exceed the respective pot. Minimum payout is ₦0.
- **Feature disabled by default** — `inventoryLossEnabled: false`, `foodLossThreshold: 2`, `drinkLossThreshold: 3` as defaults

## Dependencies

- None — no new packages required

## Risks / Considerations

- Months with no approved snapshots will show 0% loss and no deduction — this is correct
- The `costPerUnit` field on Inventory may be 0 or missing for some items — fall back to menu item price
- Historical snapshots before this feature existed won't have deduction data — finalized snapshots will store it going forward
- Negative discrepancies in snapshot items are currently stored as the raw delta (can be positive or negative) — need to only sum items where `discrepancy < 0`
