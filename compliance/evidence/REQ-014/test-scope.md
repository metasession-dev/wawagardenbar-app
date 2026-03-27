# Test Scope — REQ-014

**Risk Level:** MEDIUM
**Requirement:** Add reconciliation checkbox for orders and tabs
**GitHub Issue:** #11
**Date:** 2026-03-27

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

- [x] Reconciled checkbox is displayed alongside every tab on `/dashboard/orders/tabs`
- [x] Reconciled checkbox is displayed alongside every standalone order (not associated with a tab) on `/dashboard/orders`
- [x] Orders belonging to a tab do NOT show an individual reconciliation checkbox
- [x] Clicking the checkbox persists the reconciled status immediately
- [x] Reconciled state records timestamp (`reconciledAt`) and admin user (`reconciledBy`)
- [x] Filters on tabs page include reconciliation status options (All / Reconciled / Not Reconciled)
- [x] Filters on orders page include reconciliation status options (All / Reconciled / Not Reconciled)
- [x] Reconciliation status is visible at a glance (checked/unchecked)
- [x] All existing E2E tests continue to pass (no regressions)
- [ ] Independent review: second human reviewer required before merge

## Data Model Changes

- `Tab` model: add `reconciled` (boolean), `reconciledAt` (Date), `reconciledBy` (ObjectId ref User)
- `Order` model: add `reconciled` (boolean), `reconciledAt` (Date), `reconciledBy` (ObjectId ref User)

## AI Involvement

- AI tool: Claude Code (Claude Opus 4.6)
- Code categories AI will generate: model changes, server actions, UI components, filter logic
- Elevated review required for: data model changes, server action auth
- Regeneration protocol: none planned
