# Release Ticket: REQ-011 — Remove preset filter on dashboard tabs page

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-03-25
**Requirement ID:** REQ-011
**Risk Level:** LOW
**PR:** [Will be linked when PR is created]

---

## Summary
Removed the preset "open" status filter on the dashboard/orders/tabs page so it loads showing all tabs regardless of status, with no filters pre-selected.

## AI Involvement
- **AI Tool Used:** Claude Code (Opus 4.6)
- **AI-Generated Files:** `app/dashboard/orders/tabs/page.tsx` (modified), `components/features/admin/tabs/dashboard-tabs-filter.tsx` (modified)
- **Human Reviewer of AI Code:** William
- **Components Regenerated:** none

## Implementation Details
**Files Modified:**
- `app/dashboard/orders/tabs/page.tsx` — removed `statuses: ['open']` filter from server-side data fetch, renamed function from `getOpenTabs` to `getAllTabs`
- `components/features/admin/tabs/dashboard-tabs-filter.tsx` — changed initial `selectedStatuses` state from `['open']` to `[]`

**Dependencies Added/Changed:**
- No dependency changes

## Test Evidence
| Test Type | Count | Passed | Failed | Evidence |
|-----------|-------|--------|--------|----------|
| TypeScript | -- | PASS | 0 | 0 errors |
| SAST | 213 rules | PASS | 0 | 0 findings |

## Security Evidence
| Check | Result | Evidence |
|-------|--------|----------|
| SAST | 0 high/critical | META-COMPLY portal: wawagardenbar-app/REQ-011 |
| Dependency Audit | 0 new high/critical | META-COMPLY portal: wawagardenbar-app/REQ-011 |
| Access Control | N/A | No auth changes |
| Audit Log | N/A | No admin action changes |

## Acceptance Criteria
- [x] Dashboard tabs page loads with no preset status filter (all tabs shown)
- [x] Filter component initializes with no statuses selected
- [x] Clear filters resets to empty state (not back to "open")
- [x] Users can still manually select any status filter
- [x] TypeScript clean
- [x] SAST clean
- [x] AI use documented

## Risk Assessment
- No risks introduced — purely cosmetic/UX change
- No new dependencies

---

## Reviewer Checklist
- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed (if applicable)
- [ ] No hallucinated dependencies

---

## Audit Trail
| Date | Action | Actor | Notes |
|------|--------|-------|-------|
| 2026-03-25 | Requirement created | Claude Code | Risk: LOW |
| 2026-03-25 | Implementation completed | Claude Code | 2 files modified |
| 2026-03-25 | Tests passed | Claude Code | TSC + SAST: clean |
