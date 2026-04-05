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

- ~~#35: Inventory value calculation incorrect~~ — **Fixed** in `80a7538` (per-item aggregation) and `24936a3` (inventoryId in snapshot payload).

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** Service logic, config form, UI, unit tests, E2E updates
- **Human Reviewer:** Pending (MEDIUM risk)

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence                                      |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| Unit (Vitest)    | 136   | 136    | 0      | META-COMPLY portal: wawagardenbar-app/REQ-018 |
| E2E (Playwright) | 261   | 260    | 1\*    | META-COMPLY portal: wawagardenbar-app/REQ-018 |

\* 1 pre-existing failure (CSR role dialog test, unrelated to REQ-018)

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
- [x] Inventory value calculation fix (#35)
- [x] E2E: inventory snapshot submission/approval flow (13 tests)
- [x] Month-end finalization with config freezing (#36)
- [x] menuItemId cost fallback for snapshot items missing inventoryId
- [x] Admin "Inventory Care" view with progress bars
- [x] Monthly checklist with finalization status
- [ ] Independent review

---

## Post-Deploy Migration (REQUIRED)

After merging to main and deploying, run the backfill script against the **production database** to patch existing approved snapshots missing `inventoryId`:

```bash
npx tsx scripts/backfill-snapshot-inventory-ids.ts "mongodb://[PROD_CONNECTION_STRING]"
```

**Why:** Snapshots created before commit `24936a3` omitted `inventoryId` on all items. Without the backfill, those snapshots rely on the `menuItemId` fallback for cost lookup — which works, but the backfill ensures data is clean.

**Impact if skipped:** Food inventory values for old snapshots will still calculate correctly via the fallback. New snapshots are unaffected. The backfill is recommended but not blocking.

**Already run on UAT:** 2026-03-31 — 9 snapshots updated, 442 items fixed.

---

## Audit Trail

| Date       | Action              | Actor            | Notes                            |
| ---------- | ------------------- | ---------------- | -------------------------------- |
| 2026-03-30 | Requirement created | William + Claude | Risk: MEDIUM                     |
| 2026-03-30 | Implementation done | Claude Code      | Feature + 12 unit + E2E update   |
| 2026-03-30 | UAT verified        | William          | Known issue #35 noted            |
| 2026-03-31 | #35 fix complete    | Claude Code      | inventoryId in snapshot payload  |
| 2026-03-31 | E2E tests added     | Claude Code      | 13 snapshot + regression tests   |
| 2026-03-31 | #36 implemented     | Claude Code      | Finalization, fallback, admin UI |
| 2026-03-31 | UAT backfill run    | Claude Code      | 9 snapshots, 442 items fixed     |
