# Release Ticket: REQ-017 — Total Revenue Reflects Money Received

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-03-30
**Requirement ID:** REQ-017
**Risk Level:** MEDIUM
**PR:** Included in next develop → main merge

---

## Summary

Total Revenue in the Daily Financial Report and Staff Pot tracker now equals the payment breakdown total (Cash + POS + Transfer + USSD + Phone) — money actually received that day. Previously it used item-based revenue which didn't include partial payments and didn't match the payment breakdown.

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** Service changes, unit tests, E2E test updates
- **Human Reviewer:** Pending (MEDIUM risk — second reviewer required)

## Implementation Details

**Files Modified:**

- `services/financial-report-service.ts` — totalRevenue = paymentBreakdown.total; margins use item revenue; debug logging removed
- `services/staff-pot-service.ts` — uses revenue.totalRevenue for pot calculation

**Files Created:**

- `__tests__/reports/total-revenue-consistency.test.ts` — 8 unit tests

**Files Updated:**

- `e2e/daily-report-payments.spec.ts` — open-tab scenario asserts totalRevenue includes partials

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence                                      |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| Unit (Vitest)    | 124   | 124    | 0      | META-COMPLY portal: wawagardenbar-app/REQ-017 |
| E2E (Playwright) | 249   | 249    | 0      | META-COMPLY portal: wawagardenbar-app/REQ-017 |

## Security Evidence

| Check            | Result                     | Evidence                                               |
| ---------------- | -------------------------- | ------------------------------------------------------ |
| SAST             | 0 new high/critical        | META-COMPLY portal: wawagardenbar-app/REQ-017          |
| Dependency Audit | 0 unaccepted high/critical | META-COMPLY portal: wawagardenbar-app/REQ-017          |
| Access Control   | No changes                 | Git: `compliance/evidence/REQ-017/security-summary.md` |

## Acceptance Criteria

- [x] Total Revenue = paymentBreakdown.total
- [x] Partial-payment-only day: totalRevenue > 0
- [x] Tab close day: no double-counting
- [x] Food/drink item breakdown unchanged
- [x] Gross profit margins use item revenue
- [x] Staff Pot consistent with daily report
- [x] Debug logging removed
- [x] All existing tests pass
- [ ] Independent review completed
- [ ] UAT verification

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] totalRevenue = paymentBreakdown.total verified
- [ ] No regressions in existing reports

---

## Audit Trail

| Date       | Action              | Actor            | Notes                      |
| ---------- | ------------------- | ---------------- | -------------------------- |
| 2026-03-30 | Requirement created | William + Claude | Risk: MEDIUM (retroactive) |
| 2026-03-30 | Tests added         | Claude Code      | 8 unit + 1 E2E update      |
| 2026-03-30 | All gates passed    | CI               | 124 unit + 249 E2E         |
| 2026-03-30 | UAT verification    | Pending          |                            |
