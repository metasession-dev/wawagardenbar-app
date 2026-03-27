# Test Scope — REQ-013

**Risk Level:** HIGH
**Requirement:** Make payment method mandatory for all order and tab payments
**GitHub Issue:** #10
**Date:** 2026-03-26

## Test Approach

Full verification and validation per Test Strategy high-risk requirements.

**Universal gates (mandatory — verified locally AND in CI):**
- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Security testing (mandatory for HIGH):**
- [x] Access control: no new endpoints; existing admin-only restrictions unchanged
- [x] Audit logging: payment method included in all existing audit log entries
- [x] Input validation: backend rejects payment requests without a payment method; paymentMethod validated against enum
- [x] Error handling: no sensitive data in error responses

**Additional high-risk testing:**
- [ ] Independent review: second human reviewer required before merge
- [x] Penetration testing consideration: not warranted — tightens validation on existing flows
- [x] Performance impact: one additional aggregation query on Tab.partialPayments for daily report; indexed by paidAt
- [x] Regression scope: verify daily report totals unchanged for historical data; verify all payment flows still work; verify express close tab unaffected

## Validation Approach

- Verify payment method is mandatory in tab payment dialog (full payment)
- Verify payment method is mandatory in express close tab flow
- Verify payment method is mandatory in order payment dialog
- Verify backend rejects payment without payment method
- Verify paymentMethod is set on orders when tab is closed
- Verify partial payments appear in daily report on the day made with correct payment method
- Verify final tab payment appears on closing day with correct payment method
- Verify no double-counting between partial payments and order totals
- Verify "Unspecified" no longer appears for new payments

## AI Involvement

- AI tool: Claude Code (Claude Opus 4.6)
- Code categories AI will generate: service logic, report aggregation, validation
- Elevated review required for: financial report aggregation logic, payment method propagation
- Regeneration protocol: none planned

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
