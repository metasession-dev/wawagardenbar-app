## Security Evidence Summary — REQ-017

**Date:** 2026-03-30
**Risk Level:** MEDIUM

### Gate Results

**TypeScript Compilation:** 0 errors
**SAST Tool:** Semgrep (auto config)
**SAST High/Critical Findings:** 0 new
**Dependency Audit High/Critical:** 0 unaccepted (xlsx = accepted risk)
**E2E Tests:** 249 passed, 1 pre-existing failure (CSR role — unrelated)
**Unit Tests:** 124 passed (8 new for revenue consistency), 0 failed

### Change Summary

- `totalRevenue` now equals `paymentBreakdown.total` (money received, not money owed)
- Gross profit margins use item-based revenue (COGS relationship preserved)
- Staff Pot uses `revenue.totalRevenue` (consistent with daily report)
- Old debug logging removed from `generateDailySummary`

### Access Control Verification

- No access control changes — read-only financial report calculation
- No new endpoints

### Input Validation

- No user input changes — calculation logic only
- Fallback to item revenue when paymentBreakdown is 0 (backward compatibility)

Evidence uploaded to META-COMPLY project: wawagardenbar-app/REQ-017

## UAT Verification — 2026-03-30

- Feature verification: PASS — Total Revenue matches payment breakdown total. Partial payment days show correct revenue. No double-counting.
- UAT URL: https://wawagardenbar-app-uat.up.railway.app
