# Test Scope — REQ-038

**Risk Level:** MEDIUM (financial-data write path exercised; cross-kind service relaxation; new server-side safety check)
**Requirement:** Restock sellable inventory from expense + per-MenuItem expense unit override
**GitHub Issue:** [#84](https://github.com/metasession-dev/wawagardenbar-app/issues/84)
**Date:** 2026-05-17

## Test Approach

Builds on REQ-034's expense → inventory link infrastructure. The financial write path (StockMovement + Inventory $inc + CostHistory weighted-average + reversal-on-failure + D10 unit conversion) is already well-tested for kitchen-ingredient kind; relaxing the kind guard to accept `menu-item` adds no new transaction shape. The new safety surface is the per-MenuItem `expenseUnitOverride` — locked-unit semantics enforced at BOTH the UI and the service, with the service the load-bearing gate.

**Universal gates:**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Dependency audit: 0 new high/critical (REQ-034 baseline preserved)
- Vitest unit + service: baseline + ~12 new tests (validateExpenseUnitAgainstOverride helper + sellable apply/reverse + override enforcement at service)
- Playwright E2E: extended `kitchen/expense-link.spec.ts` (and optional new `expense-sellable-restock.spec.ts`) with 5–6 walks; per-AC PNGs via `evidenceShot` helper
- Human review per project policy (one reviewer, MEDIUM risk)

## In Scope

1. **MenuItem schema** — `expenseUnitOverride?: string` (UoM-registry id; `undefined` = no lock). Mirror in interface.
2. **MenuItem editor** — Purchase unit dropdown sourced from active UoM-registry units. Tip text explains the lock.
3. **Expense form** — rename existing kitchen-link label; add "Update inventory count" checkbox + sellable dropdown; lock Unit field when sellable's MenuItem has `expenseUnitOverride` set.
4. **Service relaxation** — `services/expense-inventory-link-service.ts` accepts BOTH kinds. Apply + reverse paths both work for sellable.
5. **Pure helper** — `validateExpenseUnitAgainstOverride({ expenseUnit, override })` in `lib/expense-inventory-link.ts`. Generic over unit id; not bottles-hardcoded.
6. **Service-side enforcement** — service rejects apply when expense.unit ≠ override. Defence in depth.
7. **D10 unit conversion** — continues to fire on the sellable path (e.g. `5 kg → 5000 g` if someone buys a kitchen-sized quantity in a different unit; rare for sellable but the conversion logic is shared).

## Out of Scope

- Per-category default expense unit (e.g. all items in "Beer" default to bottles). v1 is per-item.
- Multi-unit-pack expansion ("1 case = 24 bottles" → +24 currentStock automatically). v1 expects the operator to type `24` directly.
- Selling-price changes — this is purely a restock path; pricing logic unchanged.
- Restoring soft-archived items (covered by REQ-037 which already shipped).
- Unifying with the deductStock 'waste'/'damage'/'theft' surfaces — those are out-of-band today; bundling here is a different REQ.

## Test Types

- **Unit (Vitest):** pure helper `validateExpenseUnitAgainstOverride` (~5 tests, generic over unit ids); MenuItem form component test for the dropdown (~2 tests).
- **Service (Vitest with Mongoose mocks):** sellable kind apply path (~3 tests) + sellable reverse path (~2 tests) + service-side override enforcement (~2 tests, including the rejection test naming both units).
- **E2E (Playwright):** 5–6 walks covering label rename, Bottles scenario, Cans scenario (generic), "Any" scenario, edit-and-reverse pattern, customer-menu regression. Each captures per-AC PNG via `evidenceShot`.
- **Manual UAT:** thin — focus on the cross-unit scenarios (Bottles + Cans) on UAT to verify the dropdown is genuinely generic.

## Risks

1. **Service kind guard relaxed too broadly** → applies to non-existent kinds. Mitigated by explicit `kind in ('kitchen-ingredient', 'menu-item')` allowlist; non-matching kinds still rejected with the same error pattern.
2. **Override enforcement bypassed at UI** → operator types a different unit somehow. Mitigated by service-side check (AC5) — UI lock is defence in depth, not the load-bearing gate.
3. **Helper accidentally bottles-hardcoded** → fails when operator picks Cans. Mitigated by AC5 generic-over-unit-id test using two different ids.
4. **REQ-037 soft-archive interaction** → archived sellables appear in the new dropdown. Mitigated by inheriting the existing `archivedAt: { $exists: false }` filter at the listing source.
5. **Customer-menu query regression** → archived menu-items leak to customer menu (would be a REQ-034 D11 regression). Mitigated by AC6 regression test.
6. **D10 unit conversion regression on sellable path** → kg expense doesn't convert when linked to a bottle inventory. Mitigated by AC4 test that explicitly exercises a cross-unit case on sellable.
