# Release Ticket: REQ-015 — Staff Pot Bonus Tracker

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-03-28
**Requirement ID:** REQ-015
**Risk Level:** MEDIUM
**PR:** [Will be linked when PR is created]

---

## Summary

Adds a Staff Pot (team bonus) system that tracks daily revenue performance against a configurable target. Revenue above the daily target contributes a percentage to a shared pot, split between Kitchen and Bar teams at month end. Includes configuration in settings (super-admin only), tracker page with monthly countdown and daily breakdown (admin + super-admin), and sidebar nav link.

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** Models, services, server actions, pages, components, unit tests, E2E tests
- **Human Reviewer of AI Code:** Pending (MEDIUM risk — second reviewer required)
- **Components Regenerated:** None

## Implementation Details

**Files Created:**

- `models/staff-pot-snapshot-model.ts` — monthly snapshot model
- `services/staff-pot-service.ts` — pot calculation from daily reports
- `app/actions/admin/staff-pot-actions.ts` — server actions (config + data)
- `app/dashboard/staff-pot/page.tsx` — tracker page
- `app/dashboard/staff-pot/staff-pot-client.tsx` — tracker client component
- `components/features/admin/staff-pot/staff-pot-config-form.tsx` — config form

**Files Modified:**

- `models/system-settings-model.ts` — added staff-pot-config key
- `services/system-settings-service.ts` — added get/update staff pot config
- `app/dashboard/settings/page.tsx` — added Staff Pot config card
- `components/features/admin/dashboard-nav.tsx` — added Staff Pot nav link

**Dependencies Added/Changed:** None

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence                                      |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| Unit (Vitest)    | 14    | 14     | 0      | META-COMPLY portal: wawagardenbar-app/REQ-015 |
| E2E (Playwright) | 12    | 12     | 0      | META-COMPLY portal: wawagardenbar-app/REQ-015 |

## Security Evidence

| Check            | Result                     | Evidence                                               |
| ---------------- | -------------------------- | ------------------------------------------------------ |
| SAST             | 0 new high/critical        | META-COMPLY portal: wawagardenbar-app/REQ-015          |
| Dependency Audit | 0 unaccepted high/critical | META-COMPLY portal: wawagardenbar-app/REQ-015          |
| Access Control   | PASS — role-based          | Git: `compliance/evidence/REQ-015/security-summary.md` |

## Acceptance Criteria

- [x] Config section in settings (super-admin only)
- [x] Configurable: daily target, bonus %, split ratio, staff counts
- [x] Config persists
- [x] Tracker page at /dashboard/staff-pot (admin + super-admin)
- [x] Nav link in sidebar
- [x] Monthly countdown with days remaining
- [x] Summary cards: total pot, qualifying days, kitchen/bar per-person
- [x] Daily breakdown table with green/red indicators
- [x] How It Works section showing current config
- [x] Month navigation (previous months)
- [x] Pot calculation matches business rules
- [x] All existing tests pass
- [ ] Independent review completed
- [ ] UAT verification

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Access control correct (config: super-admin, tracker: admin+super-admin)
- [ ] Pot calculation matches issue example (₦70k/day, 25 days = ₦6,250/person)
- [ ] No sensitive data committed

---

## Audit Trail

| Date       | Action                   | Actor            | Notes                  |
| ---------- | ------------------------ | ---------------- | ---------------------- |
| 2026-03-28 | Requirement created      | William + Claude | Risk: MEDIUM           |
| 2026-03-28 | Implementation completed | Claude Code      | Full feature + tests   |
| 2026-03-28 | Tests passed             | Claude Code      | Unit 14/14 + E2E 12/12 |
| 2026-03-28 | UAT verification         | Pending          | Awaiting deployment    |
| --         | Submitted for review     | --               | PR # pending           |
