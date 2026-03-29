# Implementation Plan — REQ-015

**Requirement:** REQ-015
**GitHub Issue:** #15
**Risk Level:** MEDIUM
**Date:** 2026-03-28

## Approach

Three workstreams: (1) configuration model and settings UI, (2) staff pot service that computes daily contributions from existing revenue data, (3) tracker page with monthly countdown, summary, and daily breakdown table. Uses the existing `SystemSettingsModel` key-value store for config (add new key) and a new `StaffPotSnapshot` model for monthly history.

## Files to Create

### Models

- `models/staff-pot-snapshot-model.ts` — monthly snapshot: `{ month, year, totalPot, qualifyingDays, dailyEntries: [{ date, revenue, target, surplus, contribution }], kitchenPayout, barPayout, finalized }`

### Services

- `services/staff-pot-service.ts` — `StaffPotService` with methods:
  - `getCurrentMonthData(config)` — iterates days from month start to today, calls `FinancialReportService.generateDailySummary` for each day, computes contributions
  - `getMonthData(month, year, config)` — same but for historical months, checks for snapshot first
  - `finalizeMonth(month, year)` — creates/updates snapshot at month end

### Server Actions

- `app/actions/admin/staff-pot-actions.ts` — `getStaffPotConfigAction`, `updateStaffPotConfigAction` (super-admin only), `getStaffPotDataAction` (admin + super-admin), `getStaffPotHistoryAction`

### Pages

- `app/dashboard/staff-pot/page.tsx` — tracker page (server component, auth check)
- `app/dashboard/staff-pot/staff-pot-client.tsx` — client component with countdown, summary cards, daily table

### Components

- `components/features/admin/staff-pot/staff-pot-config-form.tsx` — config form for settings page

## Files to Modify

### Settings

- `models/system-settings-model.ts` — add `'staff-pot-config'` to key enum
- `services/system-settings-service.ts` — add `getStaffPotConfig()` / `updateStaffPotConfig()` methods
- `app/dashboard/settings/page.tsx` — add Staff Pot config card (super-admin only)

### Navigation

- `components/features/admin/dashboard-nav.tsx` — add Staff Pot nav item for admin + super-admin roles

## Architecture Decisions

- **Config storage:** Use existing `SystemSettingsModel` (key-value store) with a new `'staff-pot-config'` key — follows established pattern, no new model needed for config
- **Daily data:** Compute from `FinancialReportService.generateDailySummary` per day — no separate daily storage. This is slightly expensive for a full month (up to 31 queries) but ensures data is always fresh and consistent with the financial report
- **Snapshots:** `StaffPotSnapshot` stores finalized monthly results for historical view — avoids recomputing old months
- **Access control:** Config = super-admin only (checked in server action). Tracker page = admin + super-admin (checked in layout). Nav item uses `roles: ['admin', 'super-admin']`
- **No new permissions key:** Both admin and super-admin see the tracker. Config is role-checked in the server action, not via `IAdminPermissions`

## Dependencies

- None — no new packages required

## Risks / Considerations

- Iterating 31 days of `generateDailySummary` may be slow on first load — consider caching or showing a loading state
- Revenue includes partial payments (from REQ-013 fix) — this is correct for the pot calculation since partial payments represent cash received
- Historical months before the feature existed will show empty data — acceptable
- Config defaults (target: 50000, percentage: 5, split: 50/50, staff: 2/2) used when no config exists
