# Implementation Plan — REQ-038

**Risk Level:** MEDIUM
**Issue:** [#84](https://github.com/metasession-dev/wawagardenbar-app/issues/84)
**Date:** 2026-05-17

## Codebase reconnaissance findings (2026-05-17)

1. **REQ-034 already built the financial machinery.** `services/expense-inventory-link-service.ts` `applyExpenseInventoryLink` + `reverseExpenseInventoryLink` handle the StockMovement + `Inventory.$inc(currentStock)` + `InventoryItemCostHistory` weighted-average + block-on-negative reversal. Single kind guard at L66 prevents non-kitchen kinds; that's the only gate to relax.
2. **REQ-034 D10 unit conversion is in `lib/expense-inventory-link.ts`** as `convertExpenseQuantityToInventoryUnit`. Kind-agnostic — fires on the relaxed path automatically.
3. **`MenuItem` schema** lives in `models/menu-item-model.ts` + `interfaces/menu-item.interface.ts`. Optional new field `expenseUnitOverride?: string` is additive; no migration.
4. **UoM registry** is `SystemSettingsService.getUnitsOfMeasurement()` per REQ-033; returns active units with stable ids. The Purchase unit dropdown queries it server-side at form load.
5. **MenuItem editor lives at `components/features/admin/` likely as `menu-item-form.tsx`** (verify path at impl time; the Explore agent identified the location via REQ-034 / D7 mentions).
6. **Expense form is `components/features/finance/expense-form.tsx`** per the REQ-034 D7 + D10 commits. The kitchen-link dropdown is a known surface; the sellable surface mirrors it below.
7. **REQ-037 soft-archive filter** uses `archivedAt: { $exists: false }`. The sellable dropdown reuses that filter at its data source.

## Single-PR plan

Ships in the bundled PR with REQ-039 + REQ-040.

## Order of work

Tests-first per `[[feedback_tests_before_push]]`:

1. **Schema** — add `expenseUnitOverride?: string` to `MenuItem` interface + model.
2. **Pure helper** — `validateExpenseUnitAgainstOverride` in `lib/expense-inventory-link.ts` + unit tests (5+ tests covering match / mismatch / override-unset / expenseUnit-unset, generic over unit id).
3. **Service relaxation** — drop the `kind !== 'kitchen-ingredient'` guard at `services/expense-inventory-link-service.ts:66`; allow the allowlist `'kitchen-ingredient' | 'menu-item'`. Add `validateExpenseUnitAgainstOverride` call before the $inc write. Vitest tests for sellable apply + reverse + override enforcement (~5 tests).
4. **MenuItem editor** — Purchase unit dropdown sourced from active UoM-registry units; "Any (operator chooses at expense time)" default; tip text. Component test for the dropdown wiring (2 tests).
5. **Expense form** — rename existing label to "Add to kitchen inventory (optional)"; add "Update inventory count" checkbox below; reveal sellable dropdown when checked; lock Unit field when `expenseUnitOverride` is set on the picked item.
6. **E2E** — extend `e2e/kitchen/expense-link.spec.ts` (or new `e2e/expense-sellable-restock.spec.ts`) with 5–6 walks using `evidenceShot(page, 'REQ-038', 'AC<n>-...')`.
7. **UAT-checklist** — thin (cross-unit Bottles + Cans verification + edit-reversal pattern).

## Files (create)

- `__tests__/components/menu-item-form.purchase-unit.test.tsx` (~50 lines, 2 tests)
- `e2e/expense-sellable-restock.spec.ts` _(optional — could extend `kitchen/expense-link.spec.ts` instead; impl-time call)_

## Files (modify)

- `interfaces/menu-item.interface.ts` (+ `expenseUnitOverride?: string`)
- `models/menu-item-model.ts` (mirror)
- `services/expense-inventory-link-service.ts` (relax kind guard + add override enforcement)
- `lib/expense-inventory-link.ts` (+ `validateExpenseUnitAgainstOverride` helper)
- `components/features/admin/menu-item-form.tsx` (+ Purchase unit dropdown — verify path)
- `components/features/finance/expense-form.tsx` (rename label + add sellable surface + Unit lock)
- `__tests__/lib/expense-inventory-link.test.ts` (+ 5 helper tests; generic-over-unit-id assertion)
- `__tests__/services/expense-inventory-link.test.ts` (+ 3 sellable apply tests + 2 override enforcement)
- `__tests__/services/expense-inventory-link.reversal.test.ts` (+ 2 sellable reverse tests)
- `e2e/kitchen/expense-link.spec.ts` (extend with sellable walks; or split out to new spec)
- `compliance/RTM.md`

## AC coverage

All 8 ACs (AC1–AC8) ship in this REQ's commits.

## Risk register

| Risk                                             | Mitigation                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Kind guard relaxed too broadly                   | Explicit allowlist `kind in ('kitchen-ingredient', 'menu-item')`; non-matching kinds rejected with same error pattern |
| UI lock bypassed → unit mismatch silently writes | Service-side `validateExpenseUnitAgainstOverride` call before $inc; rejects with clear error                          |
| Helper bottles-hardcoded                         | Generic-over-unit-id test with Bottles AND Cans                                                                       |
| REQ-037 archived sellables surface in dropdown   | Filter `archivedAt: { $exists: false }` at the listing source                                                         |
| D10 unit conversion regression on sellable       | AC4 explicitly exercises a cross-unit case on sellable path                                                           |
| Customer menu surface regression                 | AC6 regression test asserts unchanged customer rendering                                                              |
| Operator confused by Purchase unit "Any" default | Tip text under dropdown explains the lock semantics + when to use Any                                                 |

## Backout

Single-commit revert. `expenseUnitOverride` on existing MenuItem documents is benign (no query filter depends on it). The relaxed kind guard returns to its REQ-034 shape; sellable-link writes stop. UI surfaces revert to pre-REQ-038 shapes.

## AI involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** all schema additions, service edits, helpers, UI changes, all SDLC artefacts, all tests, all commit messages.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit.
- **Prompt log:** `compliance/evidence/REQ-038/ai-prompts.md`
