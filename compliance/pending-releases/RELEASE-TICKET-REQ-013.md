# Release Ticket: REQ-013 — Mandatory Payment Method and Partial Payments in Report

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-03-26
**Requirement ID:** REQ-013
**Risk Level:** HIGH
**PR:** [Will be linked when PR is created]

---

## Summary

Makes payment method selection mandatory for all payment flows (tab full payment, express close tab, order payment) and includes partial payments in the daily financial report. Fixes "Unspecified" payment method entries and ensures partial payment amounts are attributed to the correct date and method without double-counting with order totals.

## AI Involvement
- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** `services/tab-service.ts` (payment method propagation), `services/financial-report-service.ts` (partial payment aggregation), `__tests__/reports/payment-method-aggregation.test.ts`
- **Human Reviewer of AI Code:** Pending (HIGH risk — second reviewer required)
- **Components Regenerated:** None

## Implementation Details
**Files Modified:**
- `services/tab-service.ts` — Propagate paymentMethod to orders on tab close
- `services/financial-report-service.ts` — Include partial payments in daily report aggregation; prevent double-counting
- `__tests__/reports/payment-method-aggregation.test.ts` — Unit tests for aggregation logic

**Dependencies Added/Changed:**
- No dependency changes

## Test Evidence
| Test Type | Count | Passed | Failed | Evidence |
|-----------|-------|--------|--------|----------|
| E2E (Playwright) | 148 | 148 | 0 | META-COMPLY portal: wawagardenbar-app/REQ-013 |
| Unit (Vitest) | 85 | 85 | 0 | META-COMPLY portal: wawagardenbar-app/REQ-013 |

## Security Evidence
| Check | Result | Evidence |
|-------|--------|----------|
| SAST | 0 new high/critical | META-COMPLY portal: wawagardenbar-app/REQ-013 |
| Dependency Audit | 0 unaccepted high/critical | META-COMPLY portal: wawagardenbar-app/REQ-013 |
| Access Control | PASS — no new endpoints, admin-only restrictions unchanged | Git: `compliance/evidence/REQ-013/security-summary.md` |
| Audit Log | PASS — payment method included in audit entries | Git: `compliance/evidence/REQ-013/security-summary.md` |

## Acceptance Criteria
- [x] "Customer wants to pay" popup on tabs requires payment method selection before submission
- [x] Express close tab requires payment method selection before submission
- [x] Order payments require payment method selection before submission
- [x] Submit/confirm button disabled until payment method selected
- [x] Backend rejects payment requests without a payment method
- [x] No new "Unspecified" entries in daily report
- [x] Partial payments appear in daily report on day made with correct payment method
- [x] Final tab closure payment appears on closing day with correct payment method
- [x] paymentMethod set on all orders when tab is closed
- [x] No double-counting between partial payments and order totals
- [x] Revenue totals remain accurate across single-day and date-range reports
- [x] All security testing items pass
- [ ] Independent review completed
- [x] All E2E tests passing (148/148)
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean
- [x] AI use documented

## Risk Assessment
- Historical orders without paymentMethod will still show as "Unspecified" — only new payments are affected
- One additional MongoDB query for Tab.partialPayments per report — acceptable performance impact
- No new dependencies introduced

---

## Reviewer Checklist
- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed
- [ ] No hallucinated dependencies

---

## Audit Trail
| Date | Action | Actor | Notes |
|------|--------|-------|-------|
| 2026-03-26 | Requirement created | William + Claude Code | Risk: HIGH |
| 2026-03-26 | Implementation completed | Claude Code | Payment method propagation + report aggregation |
| 2026-03-26 | AI code reviewed | Pending | services/tab-service.ts, services/financial-report-service.ts |
| 2026-03-26 | Tests passed | Claude Code | E2E 148/148 + Unit 85/85 + SAST: clean |
| 2026-03-26 | UAT verification | Pending | Awaiting UAT deployment |
| -- | Submitted for review | -- | PR # pending |
