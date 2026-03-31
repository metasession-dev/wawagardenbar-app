## Security Evidence Summary — REQ-018

**Date:** 2026-03-31 (updated)
**Risk Level:** MEDIUM

### Gate Results

**TypeScript Compilation:** 0 errors
**SAST Tool:** Semgrep (auto config)
**SAST High/Critical Findings:** 0 new
**Dependency Audit High/Critical:** 0 unaccepted (xlsx = accepted risk)
**E2E Tests:** 260 passed, 1 pre-existing failure (CSR dialog — unrelated)
**Unit Tests:** 136 passed (12 new for inventory loss), 0 failed

### Access Control Verification

- Inventory loss config: super-admin only (Staff Pot settings)
- Loss calculation: read-only queries on approved inventory snapshots
- Month finalization: super-admin only, blocked for current/future months
- Finalization override: super-admin only, requires explicit confirmation
- Admin view: simplified Inventory Care with progress bars, no raw values
- Super-admin view: full breakdown with loss %, threshold, values, deductions
- Checklist data: admin and super-admin (read-only status)

### Input Validation

- Thresholds: 0-100%, step 0.5
- Feature toggle: boolean, disabled by default
- Deduction capped at pot amount — cannot go negative
- Finalization gate: blocked until last-day snapshots approved and sales cutoff complete

### Resolved Issues

- ~~#35: Inventory value calculation incorrect~~ — Fixed (per-item aggregation + inventoryId in snapshot payload + menuItemId fallback)
- ~~#38: Deduction display misleading~~ — Fixed (show uncapped deduction with cap indicator)

Evidence uploaded to META-COMPLY project: wawagardenbar-app/REQ-018

## UAT Verification — 2026-03-30

- Feature deployed to UAT
- Config form: enable/disable toggle, food/drink thresholds visible and saveable
- Tracker page: deduction section visible for super-admin, Inventory Care for admin
- Known issue #35 noted — subsequently fixed

## UAT Verification — 2026-03-31 (post-fix)

- All fixes deployed to UAT (CI green: 3 successful runs)
- #35 fix verified: food inventory value now shows correctly
- Backfill script run: 9 snapshots updated, 442 items fixed
- Month-end finalization UI verified: checklist, readiness gate, override flow
- Deduction display verified: uncapped amounts with cap indicator shown
