# Test Scope — REQ-015

**Risk Level:** MEDIUM
**Requirement:** Staff Pot — daily revenue bonus tracker with monthly countdown
**GitHub Issue:** #15
**Date:** 2026-03-28

## Test Approach

Full verification per Test Strategy medium-risk requirements.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Additional medium-risk testing:**

- [ ] Independent review: second human reviewer required before merge

## Acceptance Criteria

### Configuration (Super-Admin only)

- [x] Staff Pot configuration section visible in `/dashboard/settings` for super-admins
- [x] Configuration NOT visible to admin or lower roles
- [x] Configurable fields: daily revenue target, bonus percentage, kitchen/bar split ratio, kitchen staff count, bar staff count
- [x] Configuration persists across page reloads
- [x] Validation: target > 0, percentage 0-100, staff counts >= 0, split ratios sum to 100

### Tracker Page (Admin + Super-Admin)

- [x] Staff Pot tracker page at `/dashboard/staff-pot` accessible to admin and super-admin
- [ ] Page NOT accessible to CSR or customer roles
- [x] Link to tracker page visible on main dashboard
- [x] Monthly countdown shows current day and days remaining
- [x] Current month summary shows: total pot, qualifying days, projected month-end pot, per-person bonus (kitchen/bar)
- [x] Daily breakdown table with: date, daily revenue, target, surplus/deficit, pot contribution
- [x] Green/red visual indicators for above/below target days
- [ ] Page is mobile-friendly

### Data Accuracy

- [x] Pot contribution = max(0, dailyRevenue - target) \* bonusPercentage
- [x] Daily revenue sourced from FinancialReportService
- [x] Per-person bonus = (potTotal \* splitRatio) / staffCount
- [x] Monthly cycle resets on 1st of each month
- [ ] All existing E2E tests continue to pass (no regressions)

## Data Model Changes

- New `StaffPotConfig` model (singleton): dailyTarget, bonusPercentage, kitchenSplitRatio, barSplitRatio, kitchenStaffCount, barStaffCount
- New `StaffPotSnapshot` model (monthly): month, year, totalPot, qualifyingDays, dailyEntries[]

## AI Involvement

- AI tool: Claude Code (Claude Opus 4.6)
- Code categories: model, service, server actions, pages, components, unit tests, E2E tests
- Elevated review required for: access control, financial calculations
- Regeneration protocol: none planned
