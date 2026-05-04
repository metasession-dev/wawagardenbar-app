# Implementation Plan — REQ-033

**Requirement:** REQ-033 — App-wide Unit-of-Measurement (UoM) registry (prereq for REQ-034)
**GitHub Issue:** [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**Risk Level:** MEDIUM-HIGH (financial-data-adjacent, 25+ migration sites, no schema removal)
**Date:** 2026-05-01

## Approach

Reuse the existing `SystemSettingsModel` (`models/system-settings-model.ts`) — same pattern as REQ-028 expense-categories — with built-in `changeHistory` audit trail. Add a new key `'units-of-measurement'` whose `value` is an array of `UnitOfMeasurement` records. Replace the hardcoded SelectItem list in `menu-item-form.tsx` and the placeholder text input in `expense-form.tsx` with a registry-fed Select. Provide an idempotent backfill script that normalises existing free-text `unit` values to registry IDs, reporting unrecognised values for manual review.

**No unit conversion in v1** — strict-match-only between any two unit fields. Conversion factors are documented as future enhancement; punt the pit-of-bugs.

## Order of operations

1. Define the `UnitOfMeasurement` interface + Zod schema.
2. Write pure helpers + tests (`lib/units.ts` + `__tests__/lib/units.test.ts`) — TDD.
3. Add SystemSettingsService getter/setter for the new key + tests.
4. Add server action + super-admin guard.
5. Build settings UI form (mirrors `ExpenseCategoriesForm`).
6. Replace Expense form unit input with Select.
7. Replace Menu-item form unit SelectItem list with Select.
8. Write the backfill script (idempotent, audit-file-emitting).
9. Run backfill on develop / UAT, manually inspect unrecognised-value report.
10. Add E2E spec.
11. SDLC artefact gates (validator).

## Files to Create

- `interfaces/unit-of-measurement.interface.ts` — `UnitOfMeasurement` type + `UoMCategory` enum.
- `lib/units.ts` — pure helpers `getActiveUnits(registry, category?)`, `findUnitById(registry, id)`, `validateUnit(registry, id)`. Single source of truth for registry interaction; no DB calls.
- `__tests__/lib/units.test.ts` — 8 unit tests for the pure helpers.
- `__tests__/services/system-settings-service.units.test.ts` — 5 service-level tests for the new key.
- `components/features/admin/units-of-measurement-form.tsx` — settings UI: list with category badge, add/edit dialog, soft-delete toggle. Follows `ExpenseCategoriesForm` shape exactly (CRUD with `useActionState` against the new server action). Audit history visible via the existing changeHistory accordion.
- `scripts/backfill-unit-values.ts` — one-shot migration:
  - Reads `Expense.unit` and `Inventory.unit` across all rows.
  - Normalises common variants (`Kg` → `kg`, `liters` → `litres`, `Portions` → `portions`, `pcs` → `pieces`).
  - Writes a `_uom-backfill-{timestamp}.json` audit file with original-value → new-value mappings.
  - Reports unrecognised values to stdout for manual review (does NOT auto-map ambiguous values).
  - Idempotent: skips rows whose `unit` value already matches a registry ID.
- `e2e/settings/units-of-measurement.spec.ts` — Playwright UAT spec covering AC1-AC4.
- `compliance/evidence/REQ-033/security-summary.md` (post-implementation, before merge)
- `compliance/evidence/REQ-033/test-execution-summary.md` (post-implementation, before merge)
- `compliance/evidence/REQ-033/uat-checklist.md` (mirrors REQ-032 pattern)
- `compliance/evidence/REQ-033/ai-prompts.md`, `ai-use-note.md`
- `compliance/evidence/REQ-033/gates/{tsc.txt,vitest-summary.txt,semgrep.json,dependency-audit.json}` (captured locally on the same SHA the META-COMPLY UAT release is cut from)

## Files to Modify

- `services/system-settings-service.ts` — add `getUnitsOfMeasurement()` (returns the registry array, lazy-init with seed data on first call), `updateUnitsOfMeasurement(units, updatedBy)`. Mirrors `getExpenseCategories`/`updateExpenseCategories`.
- `app/dashboard/settings/actions.ts` — add `updateUnitsOfMeasurementAction` (super-admin guard, Zod validation, `revalidatePath('/dashboard/settings')`).
- `app/dashboard/settings/page.tsx` — call `getUnitsOfMeasurement()` and render `<UnitsOfMeasurementForm initialUnits={units} />` between the Expense Categories and Menu Categories sections.
- `models/expense-model.ts` — `unit` field stays as String (no enum change); document via comment that values must match a registry ID. Validation happens in `lib/units.ts:validateUnit` at the action boundary, not at the schema layer (to allow legacy reads during backfill).
- `models/inventory-model.ts` — same.
- `interfaces/expense.interface.ts`, `interfaces/inventory.interface.ts` — no breaking changes; add JSDoc comments.
- `components/features/finance/expense-form.tsx` — replace the `<Input>` with placeholder `"kg"` (line ~149) with a `<Select>` populated from `getUnitsOfMeasurement()`. Show category badges in the dropdown for clarity.
- `components/features/admin/menu-item-form.tsx` — replace the hardcoded `<SelectItem>` list (lines ~558-570) with the same registry-fed Select.
- `components/features/admin/menu-item-edit-form.tsx` — same swap.
- `components/features/finance/expense-form.tsx`, expense-list, pending-expense-group-list, edit-expense-dialog, inventory-table, restock-recommendations-client, stock-adjustment-actions, stock-transfer-dialog — display sites: render the **label** from the registry rather than the raw id (e.g. `kg` → `"Kilograms (kg)"` on first display). Use a tiny `formatUnit(id, registry)` helper.
- `compliance/RTM.md` — REQ-033 row TESTED - PENDING SIGN-OFF after issue is filed (already DRAFT now).

## Risk Mitigation

- **Backfill writes an audit file** (`_uom-backfill-{timestamp}.json`) before mutating, so a rollback can replay original values.
- **Backfill is idempotent** — skips rows already matching a registry ID. Safe to re-run on UAT issues.
- **Unrecognised values are reported, not auto-mapped** — staff reviews stdout and manually fixes the 2-3 outliers before re-running.
- **Display sites render labels via a helper** — if a record references a since-deleted UoM, the helper falls back to the raw id (read continues, soft-failure).
- **Settings form is super-admin gated** — no new auth surface vs REQ-028.
- **Forms validate registry IDs at write time only** — legacy DB reads continue to work even if a few free-text values escape the backfill.

## Dependencies

- Blocks: REQ-034 (#74) — recipes need the registry to validate ingredient units against inventory units. REQ-034 cannot start until REQ-033 lands and soaks ≥1 week.
- Depends on: REQ-028 (settings registry pattern), REQ-026 (expense + inventory schemas).

## Definition of Done

- 13 unit tests pass (8 helper + 5 service)
- 462 + 13 = 475 unit tests pass overall (no regression)
- 1 new E2E spec passes on UAT (AC1-AC4)
- Backfill script run on UAT; unrecognised values reviewed and reconciled
- TypeScript: 0 errors
- Build: succeeds
- Compliance validator passes for REQ-033
- Manual UAT round-trip per `uat-checklist.md`: super-admin adds a new UoM, expense/menu-item forms pick it up, soft-delete removes it from new dropdowns but legacy records still display
