# Test Plan — REQ-034

**Requirement:** Recipes + Production + Kitchen-Ingredient Inventory + Kitchen/Bar/Waiting roles
**Risk Level:** HIGH
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Date:** 2026-05-09

## Acceptance Criteria

(Mirrored from issue #74 for clarity.)

- **AC1** — Inventory rows split by `kind`; existing rows backfilled to `'menu-item'`.
- **AC2** — Customer-order menu queries never return kitchen-ingredient inventory.
- **AC3** — Inventory dashboard shows Sellable / Kitchen tabs (kitchen tab hidden from kitchen role).
- **AC4** — Roles `kitchen`, `bar`, `waiting` added to enum + Settings dropdown. Kitchen users access ONLY `/dashboard/kitchen/*` (default-deny everywhere else); bar/waiting users get csr-equivalent access.
- **AC5** — Expense form shows "Add to inventory" only for Direct Cost; dropdown filtered to kitchen-ingredient.
- **AC6** — Saving expense with link auto-creates StockMovement + bumps inventory + recomputes weighted-average cost in a single optimistic write sequence with reversal-pass on failure.
- **AC7** — Editing/deleting expense voids the prior movement and creates the reversal (audit preserved, no physical deletion). Edit/delete blocked if reversal would drive `currentStock` negative.
- **AC8** — Recipe builder rejects: non-existent inventory, wrong kind, duplicate ingredients, yield ≤ 0, cross-dimension unit (mass↔volume etc.).
- **AC9** — Recipe ingredient unit MUST share dimension (mass / volume / count) with inventory unit per REQ-033 registry; conversion applied at deduction time.
- **AC10** — Production pre-flight blocks if any ingredient is short (after unit conversion).
- **AC11** — Production deducts ingredients via optimistic `$inc` with `currentStock: { $gte: required }` guard; treats 0-modified as "ingredient short, abort"; on any failure mid-batch, runs reversal pass over already-deducted ingredients.
- **AC12** — Actual yield defaults to expected, overrideable; variance recorded.
- **AC13** — Voiding a production reverses every linked StockMovement. Within 24h: super-admin, reason optional. Past 24h: super-admin, reason **required** and persisted on the reversal movements.
- **AC14** — Per-portion COGS calculation downstream still works using `Inventory.cost` weighted average (regression).
- **AC15** — REQ-030/031 customization-linked deduction unchanged (regression).
- **AC16** — Recipe deactivation hides from "Make a batch" dropdown; past Production records render correctly via snapshot.

## AC ↔ Test Mapping

### Phase A tests

| AC  | Test                                                                                                                           | Type      |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| AC1 | `__tests__/lib/inventory-kind.test.ts` — Inventory schema accepts `kind`; default is `'menu-item'`; backfill script idempotent | Unit      |
| AC2 | `__tests__/services/category-service.kind-filter.test.ts` — every menu query filters `kind:'menu-item'`                        | Unit      |
| AC4 | `__tests__/lib/permissions-roles.test.ts` — new roles in enum; kitchen default-deny; bar/waiting csr-equivalent                | Unit      |
| AC5 | `__tests__/components/expense-form.add-to-inventory.test.tsx` — dropdown visible only for Direct Cost                          | Component |
| AC6 | `__tests__/services/expense-inventory-link.test.ts` — save creates movement + bumps stock + weighted-average cost              | Unit      |
| AC7 | `__tests__/services/expense-inventory-link.reversal.test.ts` — edit/delete reversal flow + block-on-negative                   | Unit      |

### Phase B tests

| AC         | Test                                                                                                                                              | Type        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| AC8        | `__tests__/services/recipe-service.test.ts` — validation rejects all failure modes                                                                | Unit        |
| AC9        | `__tests__/lib/recipe-execution.test.ts` — same-dimension passes; cross-dimension rejected                                                        | Unit        |
| AC10       | `__tests__/services/production-service.preflight.test.ts` — blocks when any ingredient short                                                      | Unit        |
| AC11       | `__tests__/services/production-service.optimistic.test.ts` — atomic deduction + reversal pass on partial failure                                  | Integration |
| AC12       | `__tests__/lib/recipe-execution.test.ts` — `computeYieldVariance` cases                                                                           | Unit        |
| AC13       | `__tests__/services/production-service.void.test.ts` — within 24h vs past 24h; reasonNote enforcement                                             | Unit        |
| AC14       | `__tests__/services/cost-aggregation.test.ts` — per-portion COGS regression                                                                       | Unit        |
| AC15       | Existing REQ-030/031 customization-linked deduction tests in `__tests__/services/` unchanged (regression baseline; verified via full suite green) | Regression  |
| AC16       | `__tests__/services/recipe-service.deactivation.test.ts` — past Production renders, dropdown hides                                                | Unit        |
| End-to-end | `e2e/kitchen/recipe-and-production.spec.ts` — full flow: recipe → batch → report → void                                                           | E2E         |

## Test Data

- Recipe: "Pepper Soup" → 4 ingredients (goat meat 200g, palm oil 30ml, salt 5g, pepper 2g) → yields 4 portions per batch.
- Inventory state at test start: goat meat 1000g, palm oil 500ml, salt 100g, pepper 50g, pepper-soup MenuItem 0 portions.
- Make batch with batchCount=2, actualYield=8 (no waste): expect ingredient deductions of 400g/60ml/10g/4g and MenuItem inventory bumped by 8.
- Make batch with batchCount=2, actualYield=7 (1 portion burned): variance = -1.

## Migration Plan

1. **Phase A merge:** `scripts/backfill-inventory-kind.ts` runs on UAT before code deploys (sets `kind:'menu-item'` on every existing row). Idempotent.
2. **Phase A post-deploy on prod:** Re-run backfill on prod. Expected count: every existing Inventory row updated once.
3. **Phase B merge:** No additional migration. New Recipe + Production collections start empty.

## Open Items at Scaffold Time

- [ ] Confirm two-PR split is acceptable (Phase A + Phase B as separate PRs).
- [ ] Confirm `Inventory.cost` field exists from REQ-026. If not, add it in Phase A and backfill from existing expense history (or default to 0 with admin-edit instruction).
- [ ] Confirm dimension flag exists on REQ-033 unit registry rows.
