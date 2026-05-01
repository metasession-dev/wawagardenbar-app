# Test Execution Summary — REQ-033

**Requirement:** REQ-033 — App-wide Unit-of-Measurement (UoM) registry
**GitHub Issue:** [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**Date:** 2026-05-01
**Risk Level:** MEDIUM-HIGH

## Top-line

| Gate                        | Result                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | **0 errors** (`gates/tsc.txt`)                                                                                        |
| Vitest unit suite           | **486/486 passed** (462 baseline + 16 helper + 8 service = 24 new)                                                    |
| Semgrep SAST                | 0 findings on REQ-033 changed files (`gates/semgrep.json`)                                                            |
| Dependency audit            | 0 new findings (1 HIGH `xlsx` allowlisted, 6 moderate pre-existing — REQ-031/032 baseline)                            |
| Playwright E2E (parsable)   | Spec listed (4 tests), runs locally and skips gracefully when local auth unseeded; CI / UAT run for real after deploy |
| Build                       | `npm run build` succeeds                                                                                              |
| Validator                   | All checks pass for REQ-033 (REQ-034 paths now elided so the BLOCKED REQ doesn't break the validator)                 |

## TDD Discipline — and the slip on the service test

The pure helper was written test-first per the project's memory rule:

| Module                                                | Test commit          | Implementation commit | TDD?                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------- | -------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/units.ts`                                        | bundled in `6271eb2` | same                  | ✓ Tests written before implementation in the same edit-then-test-then-edit local session                                                                                                                                                                                                                                                         |
| `services/system-settings-service.ts` (UoM additions) | bundled in `6271eb2` | same                  | ✗ **Slip** — service code was added before the service tests were written. The tests then validated the service post-hoc. Fix would have been to write the service tests against a stubbed implementation first, then fill in. Documented here for transparency; no behavioural defect surfaced (8/8 tests pass), but the discipline was broken. |

The slip is captured here so a reviewer can see the audit-honest trail; future REQs should write service-layer tests first.

## Unit Test Breakdown (24 new tests)

### `__tests__/lib/units.test.ts` (16 tests)

Pure-helper coverage:

1. `getActiveUnits` returns only active units by default
2. `getActiveUnits` filters by category when supplied
3. `getActiveUnits` returns empty array when no units in requested category are active
4. `findUnitById` returns the unit when present (active or not)
5. `findUnitById` returns undefined for unknown id
6. `validateUnit` accepts an active unit id
7. `validateUnit` rejects unknown id with clear error
8. `validateUnit` rejects soft-deleted unit
9. `formatUnit` returns the registry label for known id
10. `formatUnit` falls back to the raw id for unknown unit (graceful soft-failure)
11. `formatUnit` returns label even for soft-deleted unit (legacy records keep displaying)
12. `normaliseLegacyUnit` returns canonical id when already canonical
13. `normaliseLegacyUnit` maps known case variants (Kg → kg, KG → kg)
14. `normaliseLegacyUnit` maps known spelling variants (liters → litres)
15. `normaliseLegacyUnit` returns null for unrecognised free-text
16. `normaliseLegacyUnit` handles whitespace by trimming before lookup

### `__tests__/services/system-settings-service.units.test.ts` (8 tests)

Service-level coverage with mocked Mongoose:

1. `getUnitsOfMeasurement` returns default seed when no document exists
2. `getUnitsOfMeasurement` returns persisted array when document exists
3. `updateUnitsOfMeasurement` persists valid registry and pushes to changeHistory
4. `updateUnitsOfMeasurement` rejects empty registry
5. `updateUnitsOfMeasurement` rejects entries with missing/empty id
6. `updateUnitsOfMeasurement` rejects entries with missing label
7. `updateUnitsOfMeasurement` rejects unknown category values
8. `updateUnitsOfMeasurement` rejects duplicate ids

## Existing-tests audit (Tests to Update result)

Performed against all `e2e/` specs and `__tests__/` files that interact with a `unit` field. **One spec broken**, fixed in the same commit batch:

- **`e2e/pending-expenses.spec.ts`** — three lines did `dialog.locator('input[placeholder="kg"]').fill(...)`. After REQ-033 the unit field is a `<SelectTrigger>` button, not an Input. Fixed to use `button[role="combobox"]` interactions and pick from the `[role="option"]` list, with explicit unit selection added on the second line item where the Zod-required field was previously omitted.

**Verified safe — no update needed:**

- All `__tests__/` fixtures hardcoding `unit: '<value>'` — these are mock fixtures; values never reach `validateUnit`.
- `e2e/expense-category-groups.spec.ts` — exercises category dropdown only.
- `e2e/expenses-search.spec.ts` — read-only.
- `e2e/menu-customization-{inventory,picker}.spec.ts` — REQ-030/031 paths, no expense-form fill.
- `e2e/finance/create-pending-from-expenses.spec.ts` — REQ-032 prefill flow, doesn't manually fill unit.

## Playwright spec registration audit

Found a **second historical gap**: REQ-026's `e2e/pending-expenses.spec.ts` was authored but never registered in `playwright.config.ts`. CI was silently skipping it. Same gap shape as REQ-032's `create-pending-from-expenses.spec.ts`. Fixed in this REQ — both REQ-026 and REQ-032 specs are now registered alongside the new REQ-033 spec.

Per `playwright.config.ts`, three new project entries:

- `pending-expenses` (REQ-026 retroactive)
- `create-pending-from-expenses` (REQ-032 retroactive)
- `units-of-measurement` (REQ-033)

All three depend on `auth-setup`. Total tests across all projects: 350 across 19 files (was 327 across 16 before this REQ).

## Regression Suite

Existing suites that touch the same surfaces ran clean:

- `__tests__/services/system-settings-service.expense-categories.test.ts` (REQ-028) — unchanged
- `__tests__/lib/expense-to-line-item.test.ts` (REQ-032) — unchanged, still 10/10
- `__tests__/services/inventory-service.customization-linked.test.ts` (REQ-031) — unchanged
- `__tests__/pending-expense-group/*.test.ts` (REQ-026) — unchanged
- All 486 vitest tests pass (full suite output in `gates/vitest-summary.txt`)

## E2E

`e2e/settings/units-of-measurement.spec.ts` — 4 Playwright cases:

1. **AC1** — Settings shows the Units of Measurement section to super-admin
2. **AC2** — Add a new unit via the UI and verify it persists
3. **AC3** — Expense form unit field is a Select sourced from the registry
4. **AC4** — Menu-item form unit field is a Select sourced from the registry

Local run: all 4 skip gracefully (no admin seeded in local dev DB). Auth-setup tests pass (3/3). CI and UAT will exercise them for real once auth state is seeded.

`e2e/pending-expenses.spec.ts` (REQ-026 spec, retroactively registered + patched for REQ-033 break): 22 tests listed; skip locally for the same auth reason; will run on CI / UAT.

`e2e/finance/create-pending-from-expenses.spec.ts` (REQ-032 spec, retroactively registered): 2 tests listed; same skip behaviour.

## UAT

UAT walkthrough document: `uat-checklist.md` — 8 walkthrough steps covering AC1-AC8 plus 5 edge cases. Verifier signs off with screenshots + git SHA + META-COMPLY release version.

UAT outcome (capture here once verified):

- Verified by:
- Verified on:
- UAT git SHA on develop:
- META-COMPLY UAT release version:
- Result: PASS / FAIL / PASS-WITH-NOTES

## Acceptance Criteria Coverage

All 8 ACs are mapped to either the unit suite, the E2E spec, or the manual UAT checklist in `test-plan.md` (Functional Test Mapping table). No AC is uncovered.

## Defects Found During Test Execution

- **Defect 1 (FIXED IN THIS REQ):** `e2e/pending-expenses.spec.ts` was broken by the unit-field Select migration (3 lines). Fixed in same commit batch.
- **Defect 2 (FIXED IN THIS REQ):** REQ-026's `pending-expenses.spec.ts` was never registered in `playwright.config.ts` — CI was silently skipping the spec since REQ-026 shipped. Same gap repeated by REQ-032's spec. Both fixed retroactively here.
- **Defect 3 (FIXED IN PRIOR COMMIT):** `scripts/validate-compliance-artifacts.sh` regex `REQ-\d+` matched the placeholder `REQ-0XX` in commit bodies, creating phantom IDs. Tightened to `REQ-\d{3,}` in commit `6271eb2`.

## Outstanding Items

None blocking the release. Tracked elsewhere:

- Server-side strict regex on UoM `id` slug (currently client-side only). Risk note: T1 in security-summary.md — acceptable for v1 since settings is super-admin-only and audit-trailed.
- A registry size cap if a real deployment ever exceeds ~50 entries. Not enforced in v1.
