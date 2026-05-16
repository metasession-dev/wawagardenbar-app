# AI Prompts — REQ-037

**Tool:** Claude Code (Claude Opus 4.7, 1M context)
**Date:** 2026-05-16
**Reviewer:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy)

## Originating user prompt

> Operator: "we need to be able to edit kitchen ingredients including deleting them, create a gh issue"
> (2026-05-15)

Issue #83 was filed in response, with the AC set worked through in dialogue:

- Edit scope: name, COGS category, min/max thresholds. **Unit and currentStock excluded** to preserve audit-trail integrity.
- Delete is **soft** (`archivedAt`), **not physical**, so StockMovement / Expense / CostHistory back-refs remain valid.
- **Active-recipe guard** on delete; named-recipe error so the operator can deactivate them first.
- Listing surfaces (Inventory tab, Recipe builder dropdown, Expense form dropdown) filter archived rows from a **single source** — `InventoryService.listByKind`.

## Implementation prompt

> Operator: "implement issue #83"
> (2026-05-16)

Implementation plan was surfaced for review before any code landed (per the MEDIUM/HIGH-risk impl-plan-review rule). User approved without modification.

## Test scope prompt

> Operator: "when doing the e2e tests ensure you write and execute as many as possible to meet all the AC"
> (2026-05-16)

In response, the test-plan AC mapping was extended to enumerate **15 individual E2E tests** covering every AC1–AC5 behaviour (see `test-plan.md`). E2E is the load-bearing gate for the operator-facing surfaces; vitest covers service-layer correctness.

## AI-generated artefacts

- All five evidence files in `compliance/evidence/REQ-037/`
- `compliance/pending-releases/RELEASE-TICKET-REQ-037.md`
- Schema additions to `Inventory` + `MenuItem` models
- `updateKitchenIngredientAction` + `deleteKitchenIngredientAction` in `app/actions/admin/kitchen-ingredient-actions.ts`
- `RecipeService.findActiveRecipesReferencingInventory`
- `EditKitchenIngredientDialog` + `DeleteKitchenIngredientDialog` components
- Filter additions to `InventoryService.listByKind` and `pending-expense-actions.ts`
- All vitest + Playwright tests
- All commit messages

## Human review focus

For the reviewer:

1. **Soft-delete semantics** — confirm `archivedAt` is the right pattern (consistent with existing soft-archive elsewhere in the codebase?).
2. **Active-recipe guard** — confirm the recipe-reference lookup is correct: `Recipe.ingredients[].inventoryId` and `Recipe.isActive: true`.
3. **Listing filter centralisation** — confirm `InventoryService.listByKind` is the right single-source for the archived filter, and that no direct `InventoryModel.find({ kind })` calls leak past it.
4. **Auth gate parity** — confirm both new actions follow the same gate as the REQ-034 / D7 create action.
5. **E2E coverage** — confirm the 15-test matrix in `test-plan.md` covers every AC1–AC5 behaviour without obvious holes.
