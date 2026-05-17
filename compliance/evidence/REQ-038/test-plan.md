# Test Plan — REQ-038 (Restock sellable inventory from expense + per-MenuItem expense unit override)

**Status:** DRAFT
**Date:** 2026-05-17
**Issue:** [#84](https://github.com/metasession-dev/wawagardenbar-app/issues/84)
**Risk Level:** MEDIUM (financial-data write path; cross-kind service relaxation; new operator-facing safety check)

## Scope

REQ-034 added the kitchen-ingredient restock path via Direct Cost expenses. This REQ ships the parallel sellable-side path PLUS a per-MenuItem `expenseUnitOverride` that locks the Expense form's Unit field when restocking unit-tracked items (bottles, cans, bags, pieces, …). The service-side override enforcement is the load-bearing safety check — defence in depth even if the UI lock is bypassed.

## Acceptance criteria

| AC  | Description                                                                                                                                                                                                                                              | Verification                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AC1 | `MenuItem.expenseUnitOverride?: string` schema field — UoM-registry id. Default undefined. MenuItem editor exposes a single "Purchase unit" dropdown sourced from active registry units, with "Any (operator chooses at expense time)" default           | Vitest schema test + component test for the dropdown wiring                                                             |
| AC2 | Existing Expense form "Add to inventory (optional)" label renamed to "Add to kitchen inventory (optional)" — no behaviour change                                                                                                                         | E2E label-assert in extended `e2e/kitchen/expense-link.spec.ts`                                                         |
| AC3 | Expense form: "Update inventory count" checkbox below the kitchen dropdown reveals a sellable-only "Sellable item to restock" dropdown. Selecting an item with `expenseUnitOverride` set disables the Unit dropdown and shows the locked label + tooltip | E2E walk + visual assertion via `evidenceShot`                                                                          |
| AC4 | `services/expense-inventory-link-service.ts` accepts BOTH `kind: 'menu-item'` and `kind: 'kitchen-ingredient'`. Apply path + reverse path both work for sellable inventory. REQ-034 D10 unit conversion still fires                                      | Vitest service test for sellable apply + reverse                                                                        |
| AC5 | Service-side override enforcement: if `expense.unit !== expenseUnitOverride` on the linked MenuItem, the apply call rejects with an error naming both units AND the override                                                                             | Vitest service test (mismatch rejected; match accepted; override unset = no-op; expenseUnit unset = legacy passthrough) |
| AC6 | Customer-menu surface untouched — same sellable items render with the same `currentStock`; how stock got there is invisible                                                                                                                              | Existing customer-menu E2E unchanged (regression check)                                                                 |
| AC7 | Tests: extended `expense-inventory-link.test.ts` (sellable + override) + new `validateExpenseUnitAgainstOverride` helper tests + MenuItem form component test + E2E walks                                                                                | tsc 0; vitest delta ≥ +10; E2E green; per-AC screenshots via `evidenceShot`                                             |
| AC8 | UAT walk covers: pick a unit (Bottles) → save → reopen → reflects; expense with "Update inventory count" → unit locked; transfer → currentStock incremented; second item with different unit (Cans) → proves dropdown is generic                         | `compliance/evidence/REQ-038/uat-checklist.md` walked                                                                   |

## AC ↔ test mapping

### Vitest

| AC  | Test                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `__tests__/models/menu-item.test.ts` — schema accepts `expenseUnitOverride`; legacy docs valid                             |
| AC1 | `__tests__/components/menu-item-form.purchase-unit.test.tsx` — Bottles selection persists `expenseUnitOverride: 'bottles'` |
| AC1 | `__tests__/components/menu-item-form.purchase-unit.test.tsx` — "Any" selection persists `undefined`                        |
| AC4 | `__tests__/services/expense-inventory-link.test.ts` — sellable kind: apply path bumps `Inventory.currentStock` correctly   |
| AC4 | `__tests__/services/expense-inventory-link.reversal.test.ts` — sellable kind: reverse path decrements correctly            |
| AC4 | `__tests__/services/expense-inventory-link.test.ts` — D10 unit conversion still fires (kg→g) for sellable                  |
| AC5 | `__tests__/lib/expense-inventory-link.test.ts` — `validateExpenseUnitAgainstOverride` match → no-op                        |
| AC5 | `__tests__/lib/expense-inventory-link.test.ts` — mismatch → throws naming both units + override                            |
| AC5 | `__tests__/lib/expense-inventory-link.test.ts` — override unset or 'any' → no-op                                           |
| AC5 | `__tests__/lib/expense-inventory-link.test.ts` — expenseUnit unset → legacy passthrough                                    |
| AC5 | `__tests__/lib/expense-inventory-link.test.ts` — generic over unit id (test with 'bottles' AND 'cans')                     |
| AC5 | `__tests__/services/expense-inventory-link.test.ts` — service apply rejects mismatched expense.unit                        |

### Playwright E2E (`e2e/kitchen/expense-link.spec.ts` extended + optionally new `e2e/expense-sellable-restock.spec.ts`)

| AC      | Test                                                                                                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC2     | Label "Add to kitchen inventory (optional)" present on the Direct Cost line; "Add to inventory" alone does not appear                                                            |
| AC3+AC5 | Sellable scenario: set Purchase unit to Bottles → add expense linked to the item → Unit field is disabled showing "Bottles" + tooltip → submit → currentStock incremented by qty |
| AC3+AC5 | Cans scenario: set Purchase unit to Cans on a different item → same flow → proves dropdown is generic, not bottles-hardcoded                                                     |
| AC3     | "Any" scenario: Purchase unit = Any → Unit dropdown stays editable                                                                                                               |
| AC4     | Edit a transferred sellable expense's quantity → reversal + re-apply pattern works (D10 path)                                                                                    |
| AC6     | Customer menu unaffected — assert the same sellable item still renders with the new currentStock                                                                                 |

Per-AC screenshots captured via `evidenceShot(page, 'REQ-038', 'AC<n>-...')` writing to `compliance/evidence/REQ-038/screenshots/`.

## Gates

- TypeScript: `tsc --noEmit` 0 errors
- Vitest: baseline + ~12 new tests all pass
- Playwright: extended specs green; per-AC PNGs uploaded under `compliance/evidence/REQ-038/screenshots/`
- Build: `npm run build` green
- Semgrep: 0 findings on changed paths
- Dependency audit: 0 unaccepted high/critical

## Regression

- REQ-034 kitchen-ingredient restock path: unchanged behaviour. Same service entrypoint, with the kind guard relaxed.
- REQ-034 D10 unit conversion: still fires; AC4 explicitly tests kg→g conversion on the sellable path.
- REQ-037 soft-archive: sellable dropdown filters `archivedAt: { $exists: false }` (no archived sellables surface).
- Customer-menu surface: unchanged. Same `kind: 'menu-item'` filter applies.
- Daily Financial Report: cost-history rows continue to update via the existing weighted-average path.
