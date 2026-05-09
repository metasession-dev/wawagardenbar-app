# Test Scope — REQ-034

**Risk Level:** HIGH (financial-data write path; multi-collection writes; new role + permissions; cross-cutting menu-query change; new optimistic-deduction transaction pattern)
**Requirement:** Recipes + Production + Kitchen-Ingredient Inventory + Kitchen/Bar/Waiting roles
**GitHub Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Date:** 2026-05-09

## Test Approach

HIGH-risk additive feature. Two new collections (Recipe, Production), two modified collections (Inventory + `kind` discriminator, Expense + inventory link), one extended collection (StockMovement + production category + ref), three new role enum values, optimistic-deduction transaction pattern (no `withTransaction` available — both prod and UAT Mongo are standalone).

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Dependency audit: 0 new high/critical vulnerabilities (REQ-035 baseline preserved — mongoose 8.23.1)
- Vitest unit suite: 517 baseline + ~25 new tests all pass
- Playwright E2E: existing suites unchanged + new kitchen flow spec
- Human code review via PR (×2 — HIGH risk + AI-prompts artefact required)

**Risk-tier-specific gates:**

- AI prompt log compiled before merge (`ai-prompts.md`) per HIGH-risk policy
- Two-PR split: PR1 = data-model + roles + Expense link; PR2 = Recipes + Production
- Migration script (`backfill-inventory-kind.ts`) executed on UAT before code merges, on prod post-deploy
- Replica-set verification confirms standalone Mongo → optimistic-deduction pattern (not `withTransaction`)

## In Scope

### Phase A — data model + roles + Expense link

1. **Inventory.kind discriminator** — `'menu-item' | 'kitchen-ingredient'`, default `'menu-item'`. Backfill script idempotent.
2. **Customer-menu query guard** — every customer-facing menu query filters `kind: 'menu-item'`. Touchpoints: `services/category-service.ts` (3 sites), `app/actions/admin/express-actions.ts`, `app/actions/admin/order-edit-actions.ts` (2 sites).
3. **Expense → Inventory link** — optional `linkedInventoryId` + `stockMovementId` on Expense. Save bumps `Inventory.currentStock` + recomputes weighted-average `cost` + emits `StockMovement{category:'restock'}`. Edit reverses prior + creates fresh. Delete voids the linked movement (no physical delete).
4. **Block-on-negative reversal** — Expense edit/delete refuses if reversal would drive `currentStock < 0`.
5. **Three new roles** — `kitchen | bar | waiting` added to enum across interfaces + Mongoose model + session/auth-middleware/permissions/tab-restrictions.
6. **Kitchen role default-deny allowlist** — only `/dashboard/kitchen/*` permitted; every other dashboard route returns 403.
7. **Bar/waiting csr-equivalent access** — wherever `csr` appears in `lib/permissions.ts` section roles, `bar | waiting` added.
8. **Settings UI role dropdown** — Settings > Admins lists kitchen / bar / waiting alongside existing options.
9. **Inventory dashboard tabs** — Sellable / Kitchen tabs (kitchen tab hidden from kitchen role).

### Phase B — Recipes + Production

10. **Recipe model** — `targetMenuItemId`, `yieldPortions`, `ingredients[].{inventoryId,quantity,unitId}`, `notes`, `isActive`. Server validates: targetMenuItemId is `kind:menu-item`, ingredients are `kind:kitchen-ingredient`, no duplicate ingredients, yield > 0, ingredient `unitId` shares dimension with inventory's unitId per REQ-033 registry.
11. **Production model** — `recipeId`, `targetMenuItemId`, `batchCount`, `expectedYield`, `actualYield`, `yieldVariance`, `ingredientsDeducted` snapshot in inventory unit, `stockMovementIds`, `performedBy`, `performedAt`, `status`, `reasonNote`, `notes`.
12. **Optimistic-deduction execution** — `Inventory.updateOne({_id, currentStock: {$gte: required}}, {$inc: {currentStock: -required}})`; treat 0-modified as ingredient short → abort + reversal pass. Add `actualYield` portions to MenuItem inventory at end.
13. **Void window** — within 24h: super-admin, optional reason. Past 24h: super-admin, mandatory `reasonNote` persisted on every reversal `StockMovement`.
14. **Recipe deactivation** — `isActive=false` hides from "Make a batch" dropdown; past Production records intact (snapshot).
15. **Kitchen pages** — `/dashboard/kitchen/recipes`, `/dashboard/kitchen/recipes/[recipeId]`, `/dashboard/kitchen/production`.

### Regression

16. REQ-013 tip-amount field unchanged.
17. REQ-026 Inventory + StockMovement audit log unchanged.
18. REQ-030/031 customization-linked deduction unchanged (operates on `_id`, not `kind`).
19. REQ-032 financial-report aggregator + `paymentBreakdown.total` invariant unchanged.
20. REQ-033 UoM registry unchanged; Recipe consumes registry as a read-only dependency.
21. REQ-035/036 tip capture surfaces unchanged.

## Out of Scope

- **AdminPayOrderDialog** ("Process Payment" on existing orders) currently has no tip section (predates REQ-035 surfaces). Not addressed here; tracked as separate follow-up.
- **Threshold-based auto-prep** ("when stock < N, auto-create a production task"). Future enhancement.
- **Scheduled prep** ("every Monday 9am, run a batch of pepper soup"). Future enhancement.
- **Soft-warn-with-override** on production pre-flight. v1 is strict-block.
- **Bar/waiting role-specific restrictions.** Only the role enum entries added in this REQ; restrictions deferred to future REQs.
- **Cost-method alternatives** (FIFO, last-purchase). v1 is weighted-average only.
- **Same-dimension cross-unit conversion library.** v1 uses REQ-033 registry's existing dimension flag; conversion factor lookup delegated to a thin `convertToInventoryUnit()` helper.

## Test Types

- **Unit (Vitest):** pure helpers (recipe-execution, expense-inventory-link, weighted-average cost, dimension validator), service-layer methods (recipe-service, production-service, expense action edit/delete), permission gates (kitchen default-deny, bar/waiting csr-equivalent).
- **Integration (Vitest with Mongoose mocks):** transactional production execution, reversal pass on partial failure, void within/past 24h, recipe deactivation flow.
- **E2E (Playwright):** end-to-end kitchen flow (create recipe → make batch → verify Daily Report attribution → void within 24h).
- **Manual UAT:** `compliance/evidence/REQ-034/uat-checklist.md` covers AC1–AC16.

## Risks

1. **Race condition between concurrent productions** — pre-flight passes for both, both deduct, second goes negative. Mitigated by optimistic `$inc` with `currentStock: {$gte: required}` guard; 0-modified = ingredient short = abort.
2. **Reversal pass crash mid-flight** — if process dies between deduction and reversal, drift remains. Documented in security-summary; manual Inventory adjustment available as recovery.
3. **Customer-menu query missing the `kind` filter on a new touchpoint** — every new menu query in future REQs must include the filter or kitchen ingredients leak to the customer menu. Mitigated by service-layer wrapper + lint check (TODO).
4. **Kitchen role permission drift** — new dashboard surfaces inherit deny by default for kitchen, but a developer might inadvertently add `kitchen` to another section's roles list. Mitigated by E2E test asserting kitchen user can NOT hit `/dashboard/orders`, `/dashboard/finance`, `/dashboard/settings`.
5. **Dimension-mismatch validation missed at recipe save** — could allow kg→ml in storage. Mitigated by server-side validation + unit test covering cross-dimension rejection.
