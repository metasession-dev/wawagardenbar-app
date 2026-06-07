# REQ-075 — AI prompts captured

## Cycle entry

Operator framing (from #117 close + REQ-074 close-out): _"we need to be able to configure the 'Main Category' int eh dashboard settings… create an issue with all the details."_

That triggered an `Explore` audit of every `mainCategory` reference in the codebase. Output: 27+ hardcoded sites across 11 components, 8 services, 3 actions, the public API, and the customer menu. Result was issue [#322](https://github.com/metasession-dev/wawagardenbar-app/issues/322) which the operator then asked to implement:

> _"implement https://github.com/metasession-dev/wawagardenbar-app/issues/322"_

## Plan-mode review (4 confirm questions)

Before coding, the assistant asked 4 high-stakes decisions via `AskUserQuestion`:

1. **Drop Mongoose enum on `MenuItem.mainCategory`?** — Operator: yes.
2. **Aggregate non-food/drink slugs in `financial-report-service.ts` into an `other` bucket with `console.warn`?** — Operator: yes.
3. **Breaking API contract on `/api/public/menu/categories` envelope + same-PR amendment to REQ-071's SRS spec?** — Operator: yes.
4. **`[REQ-075]` square-brackets in every commit subject?** — Operator: yes (per `feedback_pr_title_req_brackets`).

The 7-phase plan was confirmed, branch `feat/REQ-075-configurable-main-categories` cut from develop, and implementation proceeded.

## In-cycle scope decisions

**Decision 1**: New `IMainCategoryConfig` shape includes `icon?` and `portionsEnabled?`. Both are persisted in the registry but only `portionsEnabled` is wired through to the admin form gate in this REQ — `icon` plumbing on the customer-facing surface is deferred to a follow-up (the registry shape is forward-compatible).

**Decision 2**: `MainCategoryService.rename` uses sequential 3-step writes (no `withTransaction`), matching the precedent at `services/production-service.ts`. Partial-failure recovery is "re-run rename until counts converge" — idempotent because step 1 becomes a no-op on retry.

**Decision 3**: Reference-counted delete refuses on BOTH `MenuItem` count > 0 AND sub-category list non-empty. Both reads happen before any write; the error message names both counts so the operator knows whether to migrate menu items or drain the sub-category list (or both).

**Decision 4**: `MenuCategoriesForm` reworked from two hardcoded `food` / `drinks` tabs to dynamic-tabbed over the registry. The dynamic-tab form key is `Record<string, IMenuCategoryConfig[]>` — when a new main category appears in the registry, an empty tab appears here automatically, ready for sub-category authoring.

**Decision 5**: `getMainCategoriesAction` server action is read-only and unauthenticated. The same data is already exposed publicly via `/api/public/menu/categories`. This decision saves wiring an `admin-or-super-admin` gate around every admin client component that reads filter options. Mutations stay super-admin-only.

**Decision 6**: `staff-pot-service.ts` continues to require `food` + `drink` snapshots only for the eligibility gate. Other main categories are explicitly skipped with `console.warn`. Extending the gate would require an operator decision per category — out of scope.

**Decision 7**: Customer-facing `menu-item.tsx` icon emoji branch left as the legacy two-emoji fallback (drinks 🥤, default 🍽️). Routing the registry's `icon` field through `MenuItemWithStock` is a future REQ; the registry shape is ready for it.

## Decisions NOT made by AI

- Whether to drop Mongoose enum (high-stakes schema relaxation): assistant flagged the trade-off; operator decided.
- Whether to take the BREAKING API contract change: assistant flagged the alternative (versioned route shim); operator decided.
- "Other" aggregate vs silently routing to `drink`: assistant proposed both shapes; operator chose the explicit `other` bucket with log line.
- `[REQ-075]` square-brackets convention: operator-enforced via memory.

## AI tool

- **Tool:** Claude Opus 4.7 via Claude Code (CLI).
- **Scope:** 1 new interface file + 1 new service file + 1 new admin form component + 1 new E2E spec + 1 new unit-test file (19 cases) + 6 new server actions + 27+ call-site updates spanning services / components / actions / pages / API / models / interfaces + 6-doc evidence pack + release ticket + RTM row + SRS amendments + implementation plan.
- **Verification:** tsc 0 errors; full vitest 1154 pass / 4 skip / 0 fail; the 19 new MainCategoryService cases all pass under 600ms. E2E + UAT walkthrough to land at UAT-deploy time.
