# Implementation Plan — REQ-034

**Risk Level:** HIGH
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Date:** 2026-05-09

## Codebase reconnaissance findings (2026-05-09)

These shape the implementation. Confirmed by reading the tree, not assumed from the issue.

1. **REQ-033 dimension flag** — `interfaces/unit-of-measurement.interface.ts` exposes `UoMCategory = 'count' | 'mass' | 'volume' | 'other' | 'time'`. This is the "dimension" flag for Resolution #1. **However, only `mass` (kg/g) and `volume` (litres/ml) have natural conversion factors.** `count` units (bottles, crates, packs, eggs, plates) are non-fungible — a recipe needing "2 eggs" cannot consume "1 carton" without an explicit pack-size, which is out of v1 scope. **Refined Resolution #1:** mass and volume support conversion via a small factor table; `count`, `other`, `time` require strict `unitId` equality between recipe and inventory.
2. **Inventory cost tracking** — `models/inventory-model.ts` has `costPerUnit` marked **`@deprecated`** in favour of `InventoryItemCostHistory` rows. Resolution #2 (weighted-average cost) implementation: every Expense→Inventory link writes a new `InventoryItemCostHistory` row with `cost = expense.amount / expense.quantity`; "current cost" is the row weighted-average across all rows for that inventory id (computed at read time, OR cached on Inventory if perf demands). This avoids reviving a deprecated field and stays consistent with REQ-026 patterns.
3. **Mongo deployment** — both prod and UAT are STANDALONE (`hello.setName` undefined, no `hosts` array). `withTransaction` unavailable. Resolution #3: optimistic deduction with reversal pass.
4. **Customer-menu query touchpoints** — confirmed in `services/category-service.ts` (3 sites at L32, L60, L91 per issue), `app/actions/admin/express-actions.ts`, `app/actions/admin/order-edit-actions.ts`. Add `kind: 'menu-item'` filter at each site.

## Single-PR plan

All scope ships in one PR develop → main after UAT (user override 2026-05-09: bundled, no soak gate). Branch: `req-034/scaffold` carries scaffold + implementation; merged to develop, then PR opened.

---

## Order of work

The following 12 steps are ordered for safe progression: schema first, then services, then UI, then E2E. Tests are written before each step's implementation per `feedback_tests_before_push.md`.

1. **Extend role enum + Mongoose validator + interface mirrors.** kitchen / bar / waiting added; default-deny for kitchen wired in step 6.
2. **Add `Inventory.kind` discriminator + backfill script.** Run script against UAT.
3. **Customer-menu query guards** — add `kind: 'menu-item'` to every menu query.
4. **Inventory dashboard tabs** — Sellable / Kitchen.
5. **Expense → Inventory link** — schema fields, helper module, service-layer wiring (save / edit / delete), expense form UI dropdown, weighted-average cost via `InventoryItemCostHistory`, block-on-negative reversal.
6. **Lock down kitchen role** — default-deny allowlist on `/dashboard/kitchen/*`. Bar/waiting stay csr-equivalent.
7. **Settings UI role dropdown** — add Kitchen / Bar / Waiting options.
8. **Recipe model + service** — schema, validation (target/ingredient kind, no duplicates, dimension match), CRUD.
9. **Production model + service** — schema, optimistic deduction with reversal pass, void with 24h reasonNote enforcement.
10. **Pure helpers** — `lib/recipe-execution.ts`, `lib/dimension-conversion.ts` (mass + volume factor table).
11. **Kitchen pages + components** — `/dashboard/kitchen/recipes`, `/dashboard/kitchen/production`, recipe-builder, make-batch-dialog, production-history.
12. **E2E spec** — full flow: recipe → batch → report → void.

Tests-first commits land before each implementation step. RTM flips DRAFT → TESTED at the end of step 12; → APPROVED at Stage 5 finalize.

### Files (create)

- `lib/expense-inventory-link.ts` — `buildStockMovementFromExpense`, `computeWeightedAverageCost`, `validateReversalDoesNotNegate`
- `scripts/backfill-inventory-kind.ts` — idempotent
- `__tests__/lib/expense-inventory-link.test.ts`
- `__tests__/lib/permissions-roles.test.ts`
- `__tests__/lib/inventory-kind.test.ts`
- `__tests__/services/category-service.kind-filter.test.ts`
- `__tests__/services/expense-inventory-link.test.ts`
- `__tests__/services/expense-inventory-link.reversal.test.ts`
- `__tests__/components/expense-form.add-to-inventory.test.tsx`

### Files (modify)

- `models/inventory-model.ts` (+ `kind`)
- `interfaces/inventory.interface.ts` (mirror)
- `models/expense-model.ts` (+ `linkedInventoryId`, `stockMovementId`)
- `interfaces/expense.interface.ts` (mirror)
- `models/stock-movement-model.ts` (+ `productionId` ref + `'production'` category)
- `models/user-model.ts` (extend role enum)
- `interfaces/user.interface.ts`, `interfaces/api-key.interface.ts`, `interfaces/order.interface.ts`, `interfaces/tab.interface.ts` (+ kitchen / bar / waiting)
- `lib/session.ts`, `lib/auth-middleware.ts`, `lib/permissions.ts`, `lib/tab-restrictions.ts` (kitchen default-deny + bar/waiting csr-equivalent)
- `services/inventory-service.ts` (kind-aware list filters)
- `services/category-service.ts` (3 menu queries gain `kind:'menu-item'` filter)
- `app/actions/admin/express-actions.ts` (1 menu query)
- `app/actions/admin/order-edit-actions.ts` (2 menu queries)
- `app/actions/finance/expense-actions.ts` + `app/actions/finance/pending-expense-actions.ts` (auto-link on save/edit/delete)
- `components/features/finance/expense-form.tsx` (+ Add-to-inventory dropdown)
- `app/dashboard/inventory/page.tsx` + `inventory-items-client.tsx` (Sellable / Kitchen tabs)
- `app/dashboard/settings/admins/page.tsx` (role dropdown)
- `compliance/RTM.md` (REQ-034 row → DRAFT → TESTED — flips after step 12)

### Files (create — recipes + production)

- `models/recipe-model.ts`, `interfaces/recipe.interface.ts`
- `models/production-model.ts`, `interfaces/production.interface.ts`
- `services/recipe-service.ts`, `services/production-service.ts`
- `lib/recipe-execution.ts` (`computeIngredientsForBatches`, `validateProductionPreFlight`, `computeYieldVariance`, `convertToInventoryUnit`)
- `lib/dimension-conversion.ts` (mass + volume factor table)
- `app/actions/kitchen/recipe-actions.ts`, `app/actions/kitchen/production-actions.ts`
- `app/dashboard/kitchen/recipes/page.tsx`, `app/dashboard/kitchen/recipes/[recipeId]/page.tsx`, `app/dashboard/kitchen/production/page.tsx`
- `components/features/kitchen/recipe-builder.tsx`, `components/features/kitchen/recipe-list.tsx`, `components/features/kitchen/make-batch-dialog.tsx`, `components/features/kitchen/production-history.tsx`
- `__tests__/lib/dimension-conversion.test.ts` (other test stubs already present from scaffold)

### AC coverage

All 16 ACs (AC1–AC16) ship in this PR.

---

## Risk register

| Risk                                                                      | Mitigation                                                                                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Concurrent productions race past pre-flight                               | `$inc` with `currentStock: { $gte: required }` guard; 0-modified = ingredient short, abort + reversal                                            |
| Reversal-pass crash mid-flight leaves drift                               | Documented in security-summary; manual Inventory adjustment available via existing REQ-026 path                                                  |
| New menu query in future REQ misses kind filter                           | E2E spec asserts every dashboard menu surface returns 0 kitchen-ingredient rows                                                                  |
| Kitchen permission drift on new dashboard surface                         | Default-deny by enumeration in `lib/permissions.ts`; E2E asserts kitchen user 403s on /dashboard/orders, /dashboard/finance, /dashboard/settings |
| Cross-dimension validation missed at recipe save                          | Server-side validation + unit test covering cross-dimension rejection                                                                            |
| `count` units treated as same-dimension when they're not (eggs ≠ cartons) | `count`, `other`, `time` enforced as strict id-equality; only mass + volume support conversion                                                   |

## Backout

Single bundled revert (one merge commit). Schema additions are additive optional fields with defaults — reverting code does not break existing rows. Recipe + Production collections are net-new; deletion is no-op for everyone except kitchen staff. Roles enum is additive; pre-existing users untouched. The backfill script writes only when `kind` is unset; re-running post-rollback is a no-op.

## AI involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** all model + service + helper + test scaffolding; UI dropdown wiring (mirrors REQ-033 + REQ-035 patterns); migration script.
- **Human Reviewers:** ostendo-io + 1 additional reviewer (HIGH risk → 2 reviewers required per Risk-Tiered Review Policy).
- **Components Regenerated:** None — every change is a targeted edit.
- **Prompt log:** `compliance/evidence/REQ-034/ai-prompts.md` (compiled before merge).
