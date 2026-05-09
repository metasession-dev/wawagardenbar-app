# Release Ticket: REQ-034 — Recipes + Production + Kitchen-Ingredient Inventory + Kitchen/Bar/Waiting roles

**Status:** DRAFT (scaffold)
**Date:** 2026-05-09
**Requirement ID:** REQ-034
**Risk Level:** HIGH (financial-data write path; multi-collection writes; new role + permissions; cross-cutting menu-query change; new optimistic-deduction transaction pattern)
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Blocked by:** REQ-033 (#73) — UoM registry must ship and soak ≥1 week first. **Anchored:** REQ-033 prod-deployed 2026-05-04; soak elapses **2026-05-11**.
**PR Split:** Two PRs — (a) data-model + Inventory.kind + Expense link + roles; (b) recipes + production.

---

## Summary

Adds three capabilities to the kitchen workflow:

1. **Kitchen-ingredient inventory** — extend the existing Inventory collection with a `kind: 'menu-item' | 'kitchen-ingredient'` discriminator. Customer-menu queries filter to `'menu-item'` only. Inventory dashboard gains Sellable / Kitchen tabs.
2. **Recipes + Production** — kitchen staff author recipes (target menu item + ingredients + yield) and record production events ("made N batches"). Production deducts ingredients from kitchen inventory and adds yield portions to the target MenuItem inventory in a single optimistic-deduction sequence with reversal-pass on failure (Mongo is standalone, no `withTransaction`).
3. **Three new staff roles** — `kitchen` (default-deny allowlist on `/dashboard/kitchen/*`), `bar` and `waiting` (csr-equivalent until future REQs narrow them). Settings UI gains a role dropdown for all three.

Operational case the feature targets: kitchen staff at start of service authors a "Pepper Soup" recipe (200g goat meat, 30ml palm oil, 5g salt, 2g pepper → 4 portions). When 2 batches are made, the system deducts 400g/60ml/10g/4g from kitchen inventory and adds 8 portions to the Pepper Soup menu-item inventory. Daily Financial Report's per-portion COGS picks up the weighted-average cost from `InventoryItemCostHistory`.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** all model + service + helper + test scaffolding; UI dropdown wiring (mirrors REQ-033 + REQ-035 patterns); migration script.
- **Human Reviewers:** ostendo-io + 1 additional reviewer (HIGH risk → 2 reviewers required per Risk-Tiered Review Policy).
- **Components Regenerated:** None — every change is a targeted edit.
- **Prompt log:** `compliance/evidence/REQ-034/ai-prompts.md` (compiled before merge).

HIGH risk — 2 reviewers + AI-prompts artefact required. Risk warrants the bump because: financial-data write path, new transaction pattern, new role with permissions implications, and cross-cutting customer-menu query change.

---

## Implementation Details

(See `compliance/evidence/REQ-034/implementation-plan.md` for the full file-level plan.)

### Phase A — data model + roles + Expense→Inventory link

**Files Created:**

- `lib/expense-inventory-link.ts` — `buildStockMovementFromExpense`, `computeWeightedAverageCost`, `validateReversalDoesNotNegate`
- `scripts/backfill-inventory-kind.ts` (idempotent)
- `__tests__/lib/{expense-inventory-link,permissions-roles,inventory-kind}.test.ts`
- `__tests__/services/{category-service.kind-filter,expense-inventory-link,expense-inventory-link.reversal}.test.ts`
- `__tests__/components/expense-form.add-to-inventory.test.tsx`

**Files Modified:**

- `models/inventory-model.ts` (+ `kind`)
- `models/expense-model.ts` (+ `linkedInventoryId`, `stockMovementId`)
- `models/stock-movement-model.ts` (+ `productionId` ref)
- `models/user-model.ts` (extend role enum)
- `interfaces/{user,api-key,order,tab,inventory,expense}.interface.ts` (mirrors)
- `lib/{session,auth-middleware,permissions,tab-restrictions}.ts` (kitchen default-deny + bar/waiting csr-equivalent)
- `services/{inventory,category}-service.ts` (kind-aware filters)
- `app/actions/admin/{express,order-edit}-actions.ts` (menu kind filters)
- `app/actions/finance/{expense,pending-expense}-actions.ts` (auto-link + reversal block)
- `components/features/finance/expense-form.tsx` (Add-to-inventory dropdown)
- `app/dashboard/inventory/{page,inventory-items-client}.tsx` (Sellable / Kitchen tabs)
- `app/dashboard/settings/admins/page.tsx` (role dropdown)
- `compliance/RTM.md`

### Phase B — Recipes + Production

**Files Created:**

- `models/{recipe,production}-model.ts`, `interfaces/{recipe,production}.interface.ts`
- `services/{recipe,production}-service.ts`
- `lib/{recipe-execution,dimension-conversion}.ts`
- `app/actions/kitchen/{recipe,production}-actions.ts`
- `app/dashboard/kitchen/{recipes/page,recipes/[recipeId]/page,production/page}.tsx`
- `components/features/kitchen/{recipe-builder,recipe-list,make-batch-dialog,production-history}.tsx`
- `__tests__/lib/{recipe-execution,dimension-conversion}.test.ts`
- `__tests__/services/{recipe-service,recipe-service.deactivation,production-service.preflight,production-service.optimistic,production-service.void,cost-aggregation}.test.ts`
- `e2e/kitchen/recipe-and-production.spec.ts`

### Schema additions

- `Inventory.kind: 'menu-item' | 'kitchen-ingredient'` (default `'menu-item'`)
- `Expense.linkedInventoryId?: ObjectId`, `Expense.stockMovementId?: ObjectId`
- `StockMovement.productionId?: ObjectId`, category enum extended with `'production'`
- `Recipe` — net-new collection
- `Production` — net-new collection
- `User.role` / `ApiKey.role` enum extended with `'kitchen' | 'bar' | 'waiting'`

---

## Acceptance Criteria

(See `compliance/evidence/REQ-034/test-plan.md` for the canonical AC list and AC↔test mapping.)

---

## Test Plan

`compliance/evidence/REQ-034/test-plan.md`

---

## Quality Gates

(populated post-CI for Phase A and Phase B.)

- [ ] TypeScript: 0 errors (`tsc --noEmit`) — `gates/tsc.txt`
- [ ] Unit tests: 517 baseline + ~25 new = ~542 total — `gates/vitest-summary.txt`
- [ ] E2E: `e2e/kitchen/recipe-and-production.spec.ts` passes
- [ ] Build: `npm run build` succeeds
- [ ] Semgrep: 0 findings on REQ-034 changed files
- [ ] Dependency audit: 0 unaccepted high/critical (mongoose 8.23.1 baseline preserved)
- [ ] CI Pipeline: PASS (Quality Gates ✓ Register Release ✓ Upload Evidence ✓)
- [ ] Compliance validator: `bash scripts/validate-compliance-artifacts.sh` passes

---

## Rollback Plan

**Phase A:** Revert the merge commit. Schema additions are additive optional fields with defaults — reverting code does not break existing rows. Roles enum is additive; pre-existing users untouched.

**Phase B:** Revert the merge commit. Recipe + Production collections are net-new; deletion is no-op for everyone except kitchen staff. Restored Phase A capabilities (Inventory.kind, expense link) remain functional.

The backfill script writes only when `kind` is unset. Re-running it post-rollback is a no-op.

---

## Post-Deploy Actions

1. **Run backfill script on production:** `npx tsx scripts/backfill-inventory-kind.ts`. Inspect log — every existing Inventory row tagged `kind: 'menu-item'`. Idempotent re-run reports 0 updates.
2. **Verify customer menu** on production — public menu API + admin order-creation surfaces show only `kind:'menu-item'` items.
3. **Spot-check role assignment** — assign a test user the kitchen role; verify they hit `/dashboard/kitchen/recipes` only and 403 elsewhere.
4. **Spot-check expense link** — record a Direct Cost expense linked to a kitchen-ingredient; verify Inventory.currentStock bumps + cost-history row created.
5. **Spot-check production execution** — make 1 batch of a recipe; verify ingredients deducted + MenuItem inventory bumped + Daily Report COGS picks up weighted-average cost.
6. **Spot-check production void** — within 24h: super-admin only, optional reason. Past 24h: super-admin only, mandatory reason.

No soak window required for downstream features.

---

## Sign-off

- [ ] Implementation complete
- [ ] All quality gates pass on develop
- [ ] Backfill script run on UAT, log inspected
- [ ] META-COMPLY / DevAudit UAT approval obtained
- [ ] PR (Phase A) merged to main
- [ ] PR (Phase B) merged to main
- [ ] Backfill script run on production, log inspected
- [ ] Production smoke (recipe author + production execute + report) green
