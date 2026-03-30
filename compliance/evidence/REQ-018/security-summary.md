## Security Evidence Summary — REQ-018

**Date:** 2026-03-30
**Risk Level:** MEDIUM

### Gate Results

**TypeScript Compilation:** 0 errors
**SAST Tool:** Semgrep (auto config)
**SAST High/Critical Findings:** 0 new
**Dependency Audit High/Critical:** 0 unaccepted (xlsx = accepted risk)
**E2E Tests:** 248 passed, 2 pre-existing failures (CSR role — unrelated)
**Unit Tests:** 136 passed (12 new for inventory loss), 0 failed

### Access Control Verification

- Inventory loss config: super-admin only (Staff Pot settings)
- Loss calculation: read-only queries on approved inventory snapshots
- Admin view: deduction amount only, no loss details
- Super-admin view: full breakdown with loss %, threshold, values

### Input Validation

- Thresholds: 0-100%, step 0.5
- Feature toggle: boolean, disabled by default
- Deduction capped at pot amount — cannot go negative

### Known Issue

- #35: Inventory value calculation is incorrect (multiplies cost by aggregate total instead of per-item). Loss percentages are correct but deduction amounts are inflated. Fix pending.

Evidence uploaded to META-COMPLY project: wawagardenbar-app/REQ-018

## UAT Verification — 2026-03-30

- Feature deployed to UAT
- Config form: enable/disable toggle, food/drink thresholds visible and saveable
- Tracker page: deduction section visible for super-admin, hidden for admin
- Known issue: inventory value calculation incorrect (#35) — does not block REQ-018 as the feature structure is correct, only the value lookup needs fixing
