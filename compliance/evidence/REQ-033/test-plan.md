# Test Plan — REQ-033

**Requirement:** REQ-033 — App-wide Unit-of-Measurement registry (prereq for recipes)
**Risk Level:** MEDIUM-HIGH
**GitHub Issue:** [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**Date:** 2026-05-01

## Acceptance Criteria

- **AC1** — Settings page exposes a Units of Measurement section (super-admin only). Audit history (changeHistory) is visible.
- **AC2** — Add / edit / soft-delete UoM through the UI works.
- **AC3** — **Every form / dialog that renders a `unit` field** uses a registry-fed Select; no free-text Input remains. The canonical surface list (enumerated by `grep -rln 'placeholder="kg"\|name=".*\\.unit.*"' components/`):
  - `components/features/finance/expense-form.tsx` (Add Expense dialog)
  - `components/features/finance/edit-expense-dialog.tsx` (Edit recorded Expense)
  - `components/features/finance/edit-pending-group-dialog.tsx` (Edit Pending Expense Group — discovered late on UAT 2026-05-03 and fixed in a follow-up commit; this is why the AC is now invariant-phrased rather than surface-named)
- **AC4** — **Every form / dialog that renders a `unit` field on a MenuItem** uses a registry-fed Select; the hardcoded SelectItem list is removed. Surface list:
  - `components/features/admin/menu-item-form.tsx` (Add Menu Item)
  - `components/features/admin/menu-item-edit-form.tsx` (Edit Menu Item)
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

Audit performed in **two passes**:

1. **Components-side audit (canonical)** — `grep -rln 'placeholder="kg"\|name=".*\.unit.*"' components/` enumerates every component that renders a `unit` field. This is the input to AC3/AC4 above. The original migration missed `edit-pending-group-dialog.tsx` because the components-side grep was skipped; it was caught on UAT and patched in a follow-up commit. Future migrations of UI patterns must run the components-side grep first (saved as memory feedback `feedback_grep_before_migration.md`).
2. **Tests-side audit** — `grep -rln 'placeholder="kg"\|fill\(.*unit' e2e/ __tests__/` for files that exercise the field. Most are unaffected because they treat `unit` as an opaque string fixture that never reaches `lib/units.ts:validateUnit`. The exception is the one E2E spec that types into the previous free-text `<Input placeholder="kg">`:

- [x] **`e2e/pending-expenses.spec.ts`** — three lines previously did `dialog.locator('input[placeholder="kg"]').fill(...)`. After REQ-033 the unit field is a `<SelectTrigger>` button, not an input. The spec is updated to:
  - Replace the broken free-text fills with `Select` interactions (open the unit Select, pick a registry option).
  - Pre-existing line 138 (`'head'`), line 145 (`'litres'`), line 208 (`'month'`) are now Select picks against the registry's seeded units.
  - The second-line item in the multi-line submit test gets an explicit unit pick added since the form's Zod schema requires it.

**Verified safe — no update needed** (these all treat `unit` as a string fixture that stays inside mocks or seed data; no path runs `validateUnit`):

- `__tests__/lib/expense-to-line-item.test.ts` (REQ-032 — `unit: 'kg'` fixture)
- `__tests__/services/inventory-service.customization-linked.test.ts` (REQ-031 — `unit: 'units'`)
- `__tests__/inventory/crate-packaging.test.ts` (`unit: 'bottles'`)
- `__tests__/inventory/restock-recommendation-strategies.test.ts` (`unit: 'bottles'`)
- `__tests__/pending-expense-group/pending-expense-actions.test.ts` (REQ-026 — uses `unit: 'piece'`, non-canonical alias; works because mocked path)
- `__tests__/pending-expense-group/pending-expense-group-service.test.ts` (REQ-026 — `unit: 'kg'`)
- `e2e/expenses-search.spec.ts` (REQ-029 — read-only on the table; no form fill)
- `e2e/menu-customization-inventory.spec.ts` (REQ-030/031 — admin builder smoke; no expense-form fill)
- `e2e/menu-customization-picker.spec.ts` (REQ-031 — customer order journey)
- `e2e/expense-category-groups.spec.ts` (REQ-028 — exercises the category dropdown only; no unit interaction)
- `e2e/cost-snapshot.spec.ts`, `e2e/express-order-report.spec.ts` — no expense-form fill
- `e2e/finance/create-pending-from-expenses.spec.ts` (REQ-032 — opens dialog with prefill; doesn't manually fill unit)

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
