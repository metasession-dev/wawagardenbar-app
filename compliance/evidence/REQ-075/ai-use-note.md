# REQ-075 — AI use note

## What the AI did

- Read issue [#322](https://github.com/metasession-dev/wawagardenbar-app/issues/322) and audited every `mainCategory` reference across the codebase (27+ sites in 11 components, 8 services, 3 actions, the public API, models, interfaces).
- Asked 4 high-stakes decisions up-front via `AskUserQuestion` before writing any production code (drop Mongoose enum / `other` aggregate / breaking API contract / `[REQ-075]` bracket convention).
- Authored a 7-phase implementation: new `MainCategoryService` + new `MainCategoriesForm` + 6 new server actions + new E2E spec + 19 new unit-test cases + 27+ call-site updates + 6-doc evidence pack + release ticket + RTM row + SRS amendments + implementation plan.
- Updated REQ-071's spec test for the breaking envelope change in the same PR.
- Did NOT run focused E2E against UAT — that lands after the UAT auto-deploy from the develop push.

## Honest framing of limitations

**V1 pins service-layer correctness, not UI flow.** The new E2E spec `e2e/admin/main-categories-config.spec.ts` exercises `MainCategoryService` directly against UAT Mongo. The settings UI form (drag-reorder, inline rename, the delete-confirm dialog) is operator-walked manually at UAT — UI-driven E2E for the settings card is deferred to a follow-up REQ. This matches the pattern from REQ-070 / REQ-073 / REQ-074.

**`icon` field is persisted but not surfaced on the customer menu.** The registry shape includes an optional `icon` field; the new MainCategoriesForm lets the admin set one; but `components/features/menu/menu-item.tsx` still falls back to the legacy two-emoji branch (🥤 for drinks, 🍽️ for anything else). Routing the registry's icon through `MenuItemWithStock` is a future REQ; the shape is forward-compatible.

**Per-main badge palette stays default.** Three inventory client components were generalised to show the registry's `label` for any main category, but the colour palette (orange-50 for food, blue-50 for drinks pre-REQ-075) is dropped rather than per-category. Adding a `colour` field is a future REQ.

**Staff-pot eligibility gate intentionally unchanged.** `staff-pot-service.ts` continues to require both food + drink snapshots to be approved at month-end for the bonus to trigger. Other main categories are skipped at the inventory-loss aggregation with `console.warn`. Extending the gate to new main categories needs an explicit operator decision per category — out of scope.

**Sales-summary public envelope kept the 2-bucket shape.** `app/api/public/sales/summary/route.ts` was NOT changed to a registry-driven envelope. Items in non-food/drink main categories aggregate into the food bucket with `console.warn`. The single BREAKING contract change in this REQ is on `/api/public/menu/categories` — adding a second would have been a heavier scope expansion.

## What the operator validated

- The 4 plan-time AskUserQuestion choices (drop enum / `other` aggregate / breaking API contract / `[REQ-075]` brackets).
- Will validate at PR review + during the manual UAT walkthrough (7 steps documented in `test-scope.md`).
- Will confirm at portal UAT review before approving the release PR to main.

## Reproducibility

Unit tests:

```bash
npx vitest run __tests__/services/main-category-service.test.ts
```

Full vitest pack:

```bash
npx vitest run
```

Focused E2E against UAT (after UAT auto-deploys this branch's develop merge):

```bash
BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  MONGODB_URI=$MONGODB_UAT_EXTERNAL_URI \
  MONGODB_DB_NAME=wawagardenbar_uat \
  npx playwright test e2e/admin/main-categories-config.spec.ts e2e/api/public-contracts-authenticated.spec.ts --project=regression --reporter=list
```

Manual UAT walkthrough — 7 steps in `test-scope.md` under "Manual UAT — required this cycle". The default seed mirrors `food` + `drinks` so existing customer-menu paths require zero operator action to keep working.

## Carryover learnings (saved to memory)

This REQ is a single tracked REQ release path with a BREAKING public API contract change. The release PR carries `[REQ-075]` in the title (per `feedback_pr_title_req_brackets`). The `feedback_phase3_release_ticket_mandatory` memory applies: the release ticket + 7 evidence markdowns must land on develop BEFORE the release PR is opened.

Per `feedback_no_prod_db_touches`: no production DB writes required. UAT is sufficient for both E2E and the manual walkthrough.
