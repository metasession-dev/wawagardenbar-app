# Release Ticket: REQ-034 — Recipes + Production + Kitchen-Ingredient Inventory + Kitchen/Bar/Waiting roles

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-12 (status flip; scaffold 2026-05-09)
**Requirement ID:** REQ-034
**Risk Level:** HIGH (financial-data write path; multi-collection writes; new role + permissions; cross-cutting menu-query change; new optimistic-deduction transaction pattern)
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Blocked by:** REQ-033 (#73) — UoM registry shipped 2026-05-04. Soak window waived per user override (2026-05-09): UAT testing on develop is the substantive gate.
**PR plan:** Single bundled PR develop → main after UAT (per user direction).
**CI Run:** [25703823360](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25703823360) — Quality Gates ✓ Register Release ✓ Upload Evidence ✓ (rerun green after META-COMPLY slug restore)
**Git SHA:** `9b19c430f0254f3616d0f0f18eff8f7d78ac69d9` (develop, post-CVE-fix)

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

### Files Created — data model + roles + Expense→Inventory link

- `lib/expense-inventory-link.ts` — `buildStockMovementFromExpense`, `computeWeightedAverageCost`, `validateReversalDoesNotNegate`
- `scripts/backfill-inventory-kind.ts` (idempotent)
- `__tests__/lib/{expense-inventory-link,permissions-roles,inventory-kind}.test.ts`
- `__tests__/services/{category-service.kind-filter,expense-inventory-link,expense-inventory-link.reversal}.test.ts`
- `__tests__/components/expense-form.add-to-inventory.test.tsx`

### Files Modified — data model + roles + Expense→Inventory link

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

### Files Created — Recipes + Production

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

- [x] TypeScript: 0 errors (`tsc --noEmit`) — `compliance/evidence/REQ-034/gates/tsc.txt`
- [x] Unit tests: **662 passed / 4 skipped** post-walkback (was 718 pre-walkback; net -56 from D5 — see `test-execution-summary.md`) — `compliance/evidence/REQ-034/gates/vitest-summary.txt`
- [x] E2E: `e2e/kitchen/recipe-and-production.spec.ts` registered in `playwright.config.ts` (`kitchen-recipe-and-production` project); CI Playwright run green.
- [x] Build: `npm run build` — CI green (Quality Gates job 75513048988).
- [x] Semgrep: 0 findings on REQ-034 changed files (`lib/**`, `services/**`, `app/actions/kitchen/**`) — `compliance/evidence/REQ-034/gates/semgrep.json`.
- [x] Dependency audit: 0 unaccepted high/critical. CVE fix in `9b19c43` (next / fast-uri / fast-xml-builder via `npm audit fix`; lockfile-only). Remaining: 1 high `xlsx` (already CI-allowlisted) + 3 moderates below the high/critical gate. Evidence: `compliance/evidence/REQ-034/gates/npm-audit.json`.
- [x] CI Pipeline: PASS — [run 25703823360](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25703823360) (Quality Gates ✓ Register Release ✓ Upload Evidence ✓; Upload Evidence required a single rerun after META-COMPLY admin restored the missing project slug — defect D2 in `test-execution-summary.md`).
- [x] Compliance evidence uploaded to META-COMPLY — release `v2026.05.12` (auto-resolved by `register-release` job).

---

## Rollback Plan

Single bundled revert. Schema additions are additive optional fields with defaults — reverting code does not break existing rows. Recipe + Production collections are net-new; deletion is no-op for non-kitchen users. Roles enum is additive; pre-existing users untouched. Backfill script writes only when `kind` is unset; re-running post-rollback is a no-op.

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

- [x] Implementation complete (12/12 steps merged to develop at `4159c9c`; CVE fix `9b19c43`)
- [x] All quality gates pass on develop (CI run 25703823360 — Quality Gates + Upload Evidence both green)
- [x] Backfill script run on UAT, log inspected (2026-05-13 — 111 Inventory + 108 MenuItem updated; idempotent re-run = 0 candidates; logs at `compliance/evidence/REQ-034/gates/uat-backfill-{dryrun,live}.txt`; defect D3 in `test-execution-summary.md`)
- [x] **META-COMPLY / DevAudit UAT approval obtained** (2026-05-14 by ostendo-io after D8/D9/D10 fixes + D11 E2E backfill — develop SHA `5b577ae`; CI runs 25876585140 / 25877470599 / 25879684352 all green)
- [ ] PR merged to main (single bundled PR per user direction 2026-05-09)
- [ ] Backfill script run on production, log inspected
- [ ] D10 audit script run on production, results inspected (`scripts/audit-expense-link-units.ts` — flag any historical expense links whose `expense.unit` differs from `inventory.unit` for manual reconciliation)
- [ ] Production smoke (recipe author + production execute + report) green

---

## Audit Trail

| Date       | Action                                 | Actor           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-09 | Requirement scaffolded                 | ostendo-io      | HIGH risk; soak waived per user override; single bundled PR planned.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-09 | Steps 1–3 committed                    | ostendo-io + AI | Roles + Inventory.kind + customer-menu guards.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-11 | Steps 4–12 committed                   | ostendo-io + AI | Tabs, Expense link, role dropdown, Recipe + Production + E2E. 11 commits on req-034/scaffold.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-12 | Branch merged to develop               | ostendo-io      | `--no-ff` merge `4159c9c` preserves the 11-commit audit chain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-12 | CVE response (npm audit fix)           | ostendo-io + AI | Commit `9b19c43`; lockfile-only patch for `next` / `fast-uri` / `fast-xml-builder`. Unrelated to REQ-034 code; gates the merge to green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-12 | CI green                               | GitHub Actions  | Run [25703823360](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25703823360); Upload Evidence required a single rerun after META-COMPLY admin restored the missing project slug.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-12 | Tests passed                           | ostendo-io      | 718 vitest pass / 4 skipped; tsc 0; SAST 0 findings; npm audit 0 unaccepted high/critical.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-12 | RTM flipped to TESTED–PENDING SIGN-OFF | ostendo-io + AI | `compliance/RTM.md` row updated; evidence compiled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-05-12 | SDLC templates upgraded mid-cycle      | ostendo-io + AI | Synced sdlc-v1.22.0 (push-early Stage 3 + Release Approval Gate rename + opt-in UAT) and hotfix v1.22.1 ([DevAudit #286](https://github.com/metasession-dev/devaudit/pull/286) — export `META_COMPLY_BASE_URL` for `upload-evidence.sh`). Earlier b10f1b0 evidence uploads warn-skipped under broken v1.22.0; this push backfills them under v1.22.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-13 | UAT backfill executed                  | ostendo-io + AI | Inventory dashboard on UAT surfaced D3: Sellable + Kitchen tabs `(0)` while stats reported 111 total items. Root cause: 111 pre-existing Inventory + 108 MenuItem documents had no `kind` field (Mongo `find({kind:...})` excludes field-missing docs; Mongoose default only applies to new writes). Resolution: ran `scripts/backfill-inventory-kind.ts` against UAT via Railway public Mongo proxy. 111 Inventory + 108 MenuItem updated; idempotent re-run reports 0 candidates. Dashboard refreshed and visually confirmed by user. Logs: `gates/uat-backfill-{dryrun,live}.txt`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-13 | D4 kitchen-role parent-layout fix      | ostendo-io + AI | Newly-created kitchen-role user bounced to `/unauthorized` on UAT. Patched via `requireDashboardAccess()` helper allowing kitchen through the parent dashboard layout. Subsequently reverted as part of the D5 walk-back.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-05-13 | D5 design walk-back                    | ostendo-io + AI | User reviewed UAT and decided the existing PermissionsEditor was the right shape — the three new roles (kitchen/bar/waiting) were over-engineering. Walk-back commit: added `kitchenManagement: boolean` to IAdminPermissions; PermissionsEditor gained the Kitchen Management toggle (ChefHat icon); `/dashboard/kitchen/*` gated by `requirePermission('kitchenManagement')`; kitchen server actions switched to permission check; kitchen/bar/waiting removed from UserRole + ApiKeyRole; `lib/admin-role-presets.ts` deleted; `lib/permissions.ts`/`lib/session.ts`/`lib/auth-middleware.ts`/`app/dashboard/layout.tsx`/`app/dashboard/page.tsx`/`create-admin-dialog.tsx`/`admin-list.tsx`/`admin-service.ts`/`admin-management-actions.ts` reverted to pre-step-1 shapes; `inventory-tabs.ts` role-visibility helper removed; `production-service.void.test.ts` BLOCKED test renamed kitchen→csr; `seed-e2e-admins.ts` + `admin-login.ts` updated to include kitchenManagement. Kitchen _feature_ work unchanged. 662 vitest pass; tsc 0 errors. Operator to delete the UAT test user manually. See defects D4 + D5 in `test-execution-summary.md` and the verification-phase block in `ai-prompts.md`. |
| 2026-05-14 | D8 / D9 / D10 / D11 fixes              | ostendo-io + AI | Commit `54f6d1b` (D8 sidebar split Recipes + Production; D9 route split `/kitchen` landing hub vs `/kitchen-display` legacy order grid + breadcrumb labelMap; D10 expense → inventory unit conversion bug fix with new `convertExpenseQuantityToInventoryUnit` helper + service-layer threading + new `scripts/audit-expense-link-units.ts`; D11 UAT-checklist Steps 1–7 backfilled into 6 new Playwright spec files asserting numeric side effects). Commit `bdfa3d1` adds `daily-report-regression.spec.ts` covering Step 8's first two items (DFR renders + AC14 production-doesn't-move-revenue). Commit `5b577ae` adds operator-facing user manual at `user-manuals/kitchen-management.md`. Residual manual UAT trimmed from ~50 items to 6 (pre-flight ops scripts + sign-off ceremony). 691 vitest pass; tsc 0; all three CI runs green.                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-14 | UAT approval recorded                  | ostendo-io      | UAT signed off on develop SHA `5b577ae`. CI runs 25876585140 / 25877470599 / 25879684352 all green; Compliance Evidence Upload green. Ticket cleared for the develop → main PR.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
