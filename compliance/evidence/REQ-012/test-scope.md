# Test Scope — REQ-012

**Risk Level:** HIGH
**Requirement:** Add partial payment support for open tabs
**GitHub Issue:** #9
**Date:** 2026-03-26

## Test Approach

Full verification and validation per Test Strategy high-risk requirements.

**Universal gates (mandatory — verified locally AND in CI):**
- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass (138 passed, 10 pre-existing menu page failures unrelated to this change)
- Human code review via PR

**Security testing (mandatory for HIGH):**
- [x] Access control: partial payment endpoint restricted to admin/super-admin roles
- [x] Audit logging: partial payments produce AuditLog entries with amount, note, payment type
- [x] Input validation: amount must be positive and less than outstanding balance; note is mandatory and non-empty; server-side validation in both action and service
- [x] Error handling: no sensitive data in error responses; graceful handling of concurrent payments via Mongoose optimistic concurrency

**Additional high-risk testing:**
- [ ] Independent review: second human reviewer required before merge
- [x] Penetration testing consideration: not warranted — uses existing payment flow patterns with additional validation
- [x] Performance impact: no new queries beyond existing tab lookup; partial payments stored as embedded array
- [x] Regression scope: full payment flow unchanged; express close tab unaffected (uses completeTabPaymentManually which is not modified); daily report reads from Order paymentMethod — partial payments on Tab don't affect report until tab is closed

## Validation Approach

- Verify partial payment can be recorded on an open tab with mandatory note
- Verify tab remains open after partial payment
- Verify outstanding balance is correctly reduced
- Verify multiple partial payments display chronologically on tab details page
- Verify final payment settles remaining balance and closes tab
- Verify regular orders do NOT show partial payment option
- Verify daily report correctly reflects partial payment amounts by payment method

## AI Involvement

- AI tool: Claude Code (Claude Opus 4.6)
- Code categories AI will generate: data model changes, service logic, server actions, UI components
- Elevated review required for: payment validation logic, balance calculation
- Regeneration protocol: none planned

## Acceptance Criteria

- [x] "Customer wants to pay" popup on tabs includes a partial payment option
- [x] Partial payment requires a mandatory note before submission
- [x] Partial payment does not close the tab
- [x] Tab view displays all partial payments in chronological order (amount, note, timestamp)
- [x] Outstanding balance is correctly updated after each partial payment
- [x] Multiple partial payments can be made on the same tab over time
- [x] Regular orders do NOT have a partial payment option
- [x] Final tab closure settles the full remaining balance
- [x] All security testing items pass
- [ ] All validation items confirmed (pending UAT)
- [ ] Independent review completed
