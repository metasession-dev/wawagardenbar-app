# Release Ticket: REQ-018 — Inventory Loss Deduction for Staff Pot

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-03-30
**Requirement ID:** REQ-018
**Risk Level:** MEDIUM
**PR:** Included in next develop → main merge

---

## Summary

Extends the Staff Pot with inventory loss deductions. When enabled, inventory losses above configurable thresholds (food and drink separately) are deducted from the relevant team's pot. Admin view shows deduction amount only; super-admin view shows full loss breakdown.

## Known Issue

- #35: Inventory value calculation incorrect — deduction amounts are inflated. Loss percentages are correct. Fix pending.

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** Service logic, config form, UI, unit tests, E2E updates
- **Human Reviewer:** Pending (MEDIUM risk)

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence                                      |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| Unit (Vitest)    | 136   | 136    | 0      | META-COMPLY portal: wawagardenbar-app/REQ-018 |
| E2E (Playwright) | 248   | 248    | 0      | META-COMPLY portal: wawagardenbar-app/REQ-018 |

## Acceptance Criteria

- [x] Enable/disable toggle in config
- [x] Separate food and drink loss thresholds configurable
- [x] Loss % calculated from approved inventory snapshots
- [x] Excess loss deducted from relevant pot
- [x] No deduction when at or below threshold
- [x] Admin view: deduction amount only, motivational text
- [x] Super-admin view: full breakdown table
- [x] Per-person bonus reflects deduction
- [x] Feature disabled by default
- [x] 12 unit tests + E2E updates
- [ ] Inventory value calculation fix (#35)
- [ ] Independent review

---

## Audit Trail

| Date       | Action              | Actor            | Notes                          |
| ---------- | ------------------- | ---------------- | ------------------------------ |
| 2026-03-30 | Requirement created | William + Claude | Risk: MEDIUM                   |
| 2026-03-30 | Implementation done | Claude Code      | Feature + 12 unit + E2E update |
| 2026-03-30 | UAT verified        | William          | Known issue #35 noted          |
