# Release Ticket: REQ-033 — App-wide Unit-of-Measurement (UoM) registry

**Status:** APPROVED - DEPLOYED
**Date:** 2026-05-01
**Approved:** 2026-05-04 — META-COMPLY UAT release v2026.05.03
**Merged:** 2026-05-04 15:13:27 UTC — merge commit `78de27e`
**Requirement ID:** REQ-033
**Risk Level:** MEDIUM-HIGH (financial-data-adjacent, 25+ migration sites)
**Issue:** [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**PR:** [#75](https://github.com/metasession-dev/wawagardenbar-app/pull/75) (merged)
**Prereq for:** REQ-034 ([#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)) — must soak ≥1 week before REQ-034 starts

---

## Summary

Replaces the free-text `unit` strings on `Expense`, `Inventory`, and `MenuItem` with a centralised **Unit-of-Measurement registry** stored in `SystemSettingsModel` under key `'units-of-measurement'`. Configurable in **Settings → Units of Measurement** (super-admin only). Drop-down forms (Expense, Menu-item) consume the registry instead of hardcoded SelectItem lists.

This is a **prerequisite** for REQ-034 (Recipes + Production + Kitchen Inventory): recipe ingredient units must validate against inventory units, which only works reliably when both sides reference the same registry.

**No unit conversion in v1.** Strict-match-only — recipes (REQ-034) and inventory must reference the same UoM `id`. Conversion factors are documented as future enhancement.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** UoM interface, pure helpers + tests, settings form component, server action, migration script, all SDLC artefacts.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit
- **Prompt log:** `compliance/evidence/REQ-033/ai-prompts.md`

MEDIUM-HIGH risk — no AI-involvement bump warranted because the change is contained, deterministic, all logic in pure helpers + service-layer methods that mirror REQ-028.

---

## Implementation Details

(See `compliance/evidence/REQ-033/implementation-plan.md` for the full file-level spec.)

**Files Created:**

- `interfaces/unit-of-measurement.interface.ts`
- `lib/units.ts` — pure helpers
- `__tests__/lib/units.test.ts` (8 tests)
- `__tests__/services/system-settings-service.units.test.ts` (5 tests)
- `components/features/admin/units-of-measurement-form.tsx`
- `scripts/backfill-unit-values.ts` (idempotent, audit-file-emitting)
- `e2e/settings/units-of-measurement.spec.ts`

**Files Modified:**

- `services/system-settings-service.ts` (+ get/update for new key)
- `app/dashboard/settings/actions.ts` (+ `updateUnitsOfMeasurementAction`)
- `app/dashboard/settings/page.tsx` (render the UoM form)
- `components/features/finance/expense-form.tsx` (Select replaces text input)
- `components/features/admin/menu-item-form.tsx` + `menu-item-edit-form.tsx` (Select replaces hardcoded list)
- Display sites across expense-list, inventory-table, stock-adjustment-actions etc. (render label via `formatUnit()` helper)

**No schema migration** — `unit` fields stay as String. Backfill normalises existing values to registry IDs.

---

## Acceptance Criteria

(See `compliance/evidence/REQ-033/test-plan.md` for the canonical AC list and AC↔test mapping.)

---

## Test Plan

`compliance/evidence/REQ-033/test-plan.md`

---

## Quality Gates

- [x] TypeScript: 0 errors (`tsc --noEmit`)
- [x] Lint: 0 errors
- [x] Unit tests: 13 new pass; 462 baseline still pass (475 total)
- [x] E2E: `e2e/settings/units-of-measurement.spec.ts` passes
- [x] Build: `npm run build` succeeds
- [x] Compliance validator: `bash scripts/validate-compliance-artifacts.sh` passes for REQ-033

---

## Rollback Plan

Single additive change. Rollback = revert the merge commit. The backfill script writes a `_uom-backfill-{timestamp}.json` audit file with original-value → new-value mappings before mutating; the rollback procedure replays that file in reverse to restore original free-text `unit` values. The UoM registry itself is purely additive — leaving it in place after rollback is harmless (forms revert to hardcoded lists).

---

## Post-Deploy Actions

1. **Run the backfill script** on production database after merge: `npx tsx scripts/backfill-unit-values.ts`. Inspect stdout for unrecognised values; reconcile manually.
2. **Verify Settings → Units of Measurement** page loads for super-admin and shows seed data.
3. **Spot-check** Expense form and Menu-item form unit dropdowns are sourced from the registry.
4. **Soak window**: minimum 1 week on UAT + production before REQ-034 starts. Reason: any UoM-related bugs surface during this period and are fixed cheaply, before recipe execution depends on registry correctness.

---

## Sign-off

- [x] Implementation complete
- [x] All quality gates pass on develop
- [x] Backfill script run on UAT, unrecognised values reconciled (69 rows migrated; audit `compliance/evidence/REQ-033/_uom-backfill-uat-2026-05-02.json`)
- [x] META-COMPLY UAT approval obtained — release v2026.05.03 (2026-05-04)
- [x] PR merged to main — PR #75, merge commit `78de27e` (2026-05-04 15:13:27 UTC)
- [x] Backfill script run on production — 80 rows migrated (59 expenses + 21 inventories); 29 unrecognised entries left as-is (numbers, composites, descriptors); audit `compliance/evidence/REQ-033/_uom-backfill-prod-2026-05-04.json`; `'monthly'` alias added to `LEGACY_UNIT_ALIASES` mid-run (caught 5 extra rows)
- [ ] Soak ≥ 1 week before REQ-034 starts (window opens 2026-05-04, REQ-034 cleared from 2026-05-11)
