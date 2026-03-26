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
- E2E suite: all pass
- Human code review via PR

**Security testing (mandatory for HIGH):**
- [ ] Access control: partial payment endpoint restricted to admin/super-admin roles
- [ ] Audit logging: partial payments produce AuditLog entries with amount, note, payment type
- [ ] Input validation: amount must be positive and less than outstanding balance; note is mandatory and non-empty; Zod/manual validation on server action
- [ ] Error handling: no sensitive data in error responses; graceful handling of concurrent payments

**Additional high-risk testing:**
- [ ] Independent review: second human reviewer required before merge
- [ ] Penetration testing consideration: not warranted — uses existing payment flow patterns with additional validation
- [ ] Performance impact: no new queries beyond existing tab lookup; partial payments stored as embedded array
- [ ] Regression scope: verify full payment flow still works after changes; verify express close tab unaffected; verify daily report payment method breakdown handles partial payments

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

- [ ] "Customer wants to pay" popup on tabs includes a partial payment option
- [ ] Partial payment requires a mandatory note before submission
- [ ] Partial payment does not close the tab
- [ ] Tab view displays all partial payments in chronological order (amount, note, timestamp)
- [ ] Outstanding balance is correctly updated after each partial payment
- [ ] Multiple partial payments can be made on the same tab over time
- [ ] Regular orders do NOT have a partial payment option
- [ ] Final tab closure settles the full remaining balance
- [ ] All security testing items pass
- [ ] All validation items confirmed
- [ ] Independent review completed
