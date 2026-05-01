# Test Plan — REQ-033

**Requirement:** REQ-033 — App-wide Unit-of-Measurement registry (prereq for recipes)
**Risk Level:** MEDIUM-HIGH
**GitHub Issue:** [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**Date:** 2026-05-01

## Acceptance Criteria

- **AC1** — Settings page exposes a Units of Measurement section (super-admin only). Audit history (changeHistory) is visible.
- **AC2** — Add / edit / soft-delete UoM through the UI works.
- **AC3** — Expense form's unit field is a Select fed by the registry; free-text input is removed.
- **AC4** — Menu-item form's unit field is a Select fed by the registry; the hardcoded SelectItem list is removed.
- **AC5** — Backfill script (`scripts/backfill-unit-values.ts`) normalises existing `Expense.unit` and `Inventory.unit` values to registry IDs; unrecognised values reported in stdout for manual review.
- **AC6** — Pure helpers (`getActiveUnits`, `validateUnit`, `findUnitById`) covered by unit tests.
- **AC7** — Regression: existing expense / menu-item flows unchanged for end users beyond the dropdown source. All 462 baseline tests still pass.
- **AC8** — Soft-deleting a UoM that's still referenced by existing data is allowed (read-only display continues); creating new records requires an active UoM.

## UoM Registry Schema

```typescript
type UnitOfMeasurement = {
  id: string; // stable slug, e.g. 'kg', 'litres', 'portions'
  label: string; // display label, e.g. 'Kilograms (kg)'
  category: 'mass' | 'volume' | 'count' | 'time' | 'other';
  isActive: boolean;
};
```

**Seed data:** `portions, bottles, pieces, kg, litres, units, g, ml, each` (renames `liters` → `litres` for consistency).

## Tests to Add

- [ ] `__tests__/lib/units.test.ts` — pure helpers `getActiveUnits(registry, category?)`, `findUnitById(registry, id)`, `validateUnit(registry, id)`. ~8 tests covering: returns active only by default, filter by category, lookup by id returns undefined for unknown, validation rejects unknown id, validation accepts active id, deactivated unit rejected for new records but found by lookup, empty registry handled, mixed-case id normalised.
- [ ] `__tests__/services/system-settings-service.units.test.ts` — service-level CRUD for the new key. ~5 tests covering: get returns seed array on first read, update appends to changeHistory, update with invalid shape rejected, soft-delete sets isActive false (does not remove), get-active-only filter at service layer.
- [ ] `e2e/settings/units-of-measurement.spec.ts` — Playwright: super-admin opens Settings → Units of Measurement → adds a new UoM (`tablespoons`) → edits its label → soft-deletes it → verifies it's no longer in the Expense form dropdown but still resolves on a record that already references it. Skips gracefully if super-admin login fails.

## Tests to Update

- [ ] None — existing suites are unaffected by the dropdown-source change. The migration of seed values is backfill-only.

## Tests to Remove

None.

## Functional Test Mapping

| Acceptance Criterion                         | Test File                                                  | Test Name                                                                         |
| -------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| AC1 — Settings UoM section, super-admin gate | `e2e/settings/units-of-measurement.spec.ts`                | "AC1: Settings shows Units of Measurement section for super-admin"                |
| AC2 — CRUD via UI                            | `e2e/settings/units-of-measurement.spec.ts`                | "AC2: Add / edit / soft-delete a UoM works end-to-end"                            |
| AC3 — Expense form Select                    | `e2e/settings/units-of-measurement.spec.ts`                | "AC3: Expense form unit field is a Select sourced from the registry"              |
| AC4 — Menu-item form Select                  | `e2e/settings/units-of-measurement.spec.ts`                | "AC4: Menu-item form unit field is a Select sourced from the registry"            |
| AC5 — Backfill script                        | manual UAT walkthrough                                     | Documented in `uat-checklist.md` — staff runs script, inspects stdout, checks DB  |
| AC6 — Pure helpers                           | `__tests__/lib/units.test.ts`                              | All 8 helper tests                                                                |
| AC6 — Service CRUD                           | `__tests__/services/system-settings-service.units.test.ts` | All 5 service tests                                                               |
| AC7 — Regression                             | full vitest + playwright suites                            | 462 baseline tests + new tests; no existing-flow churn                            |
| AC8 — Soft-delete behaviour                  | `__tests__/lib/units.test.ts`                              | "validateUnit — deactivated unit found by lookup but rejected for new validation" |

## Non-Functional Tests

- **Security**: AC1 RBAC gate (super-admin only). Reuses existing `requireSuperAdmin` helper; same audit trail mechanism as REQ-028.
- **Performance**: registry has <50 entries in any realistic scenario; helpers are O(N) lookups. No load testing required.
- **Accessibility**: settings UoM form follows the existing ExpenseCategoriesForm a11y pattern (labelled inputs, keyboard navigation, focus management).

## Out of Scope (per design decision)

- Conversion factors between UoM (future enhancement).
- Tenant-scoped or locale-specific UoM (single global registry).
- Auto-mapping of ambiguous free-text values during backfill (script reports them for manual review).
