# Test Scope — REQ-017

**Risk Level:** MEDIUM
**Requirement:** Total Revenue should reflect money received, not money owed
**GitHub Issue:** #26 (implementation), #30 (retroactive SDLC compliance)
**Date:** 2026-03-30

## Test Approach

Full verification per Test Strategy medium-risk requirements. This is a retroactive compliance exercise — the code change (commit `8faaae0`) is already on develop.

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Additional medium-risk testing:**

- [ ] Independent review: second human reviewer required before merge

## Existing Tests Reviewed

| Test File                                              | Impact                                                                                 | Action                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------- |
| `e2e/daily-report-payments.spec.ts:293`                | Asserts `totalDelta == tabTotal` — should still pass since partial + final = tab total | Verify passes              |
| `e2e/daily-report-payments.spec.ts` (open tab block)   | Checks cash delta only, does not check totalRevenue                                    | Add totalRevenue assertion |
| `__tests__/reports/payment-method-aggregation.test.ts` | Tests aggregation math, not totalRevenue output                                        | No change needed           |
| `__tests__/staff-pot/staff-pot-calculation.test.ts`    | Uses revenue input parameter, not report output                                        | No change needed           |

## Acceptance Criteria

- [x] Total Revenue = paymentBreakdown.total (Cash + POS + Transfer + USSD + Phone)
- [x] Total Revenue on a partial-payment-only day = partial payment amount (not ₦0)
- [x] Total Revenue on a tab-close day = final payment amount (not full tab total)
- [x] Total Revenue across multiple days = sum of all payments (no double-counting)
- [x] Food/drink item breakdown remains item-based (unchanged)
- [x] Gross profit margins use item revenue (not payment total) for COGS relationship
- [x] Staff Pot daily revenue matches daily report Total Revenue
- [x] Old debug logging removed from generateDailySummary
- [x] All existing E2E tests pass (no regressions)
- [ ] Independent review: second human reviewer required before merge
- [ ] UAT verification

## AI Involvement

- AI tool: Claude Code (Claude Opus 4.6)
- Code already committed: `8faaae0` — this REQ retroactively covers it
- Tests and compliance artifacts being added now
