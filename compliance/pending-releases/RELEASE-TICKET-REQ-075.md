# Release Ticket: REQ-075 — Configurable main categories

**Status:** DRAFT
**Date:** 2026-06-07
**Requirement ID:** REQ-075
**Risk Level:** MEDIUM
**GitHub Issue:** [#322](https://github.com/metasession-dev/wawagardenbar-app/issues/322)
**Integration PR:** (this PR — to be opened against develop)
**Release PR:** (single-REQ release path, `[REQ-075]` brackets in PR title for derive-release-version attribution)
**Sign-off (dual-actor):** Pending portal UAT + Production approval.

---

## Summary

Makes `MenuItem.mainCategory` admin-configurable from `/dashboard/settings`. Pre-REQ-075 the value was a hardcoded `'food' | 'drinks'` union baked into 27+ call sites. This release introduces a `MainCategoryService` + a settings UI surface where the super-admin can rename, add, disable, and delete main categories, with reference-counted delete + sequential rename that cascades across every `MenuItem.mainCategory` row + per-main sub-category settings.

**BREAKING:** the `/api/public/menu/categories` envelope changes from `{ drinks, food }` to `{ mainCategories: [{ slug, label, order, subCategories[] }] }`. REQ-API-006 + REQ-071's SRS bullet are amended in the same release.

- **AC1-AC6 — Registry CRUD.** `MainCategoryService.create / update / reorder / rename / delete` operate against SystemSettings key `'main-categories'` with reserved/duplicate/format guards on create + rename.
- **AC5 — Sequential rename cascade.** 3 steps: `MenuItem.updateMany` → relocate `'menu-categories'.[slug]` → rewrite registry slug. Idempotent on partial failure.
- **AC6 — Reference-counted delete.** Blocks when `MenuItem` count > 0 OR sub-category list non-empty. Error message names both counts.
- **AC7 — BREAKING envelope on `/api/public/menu/categories`.**
- **AC8 — Settings route auth gate** (existing super-admin requirement on `/dashboard/settings`).

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** 1 new interface file + 1 new service + 1 new admin form + 1 new E2E spec + 19 new unit-test cases + 6 new server actions + 27+ call-site updates + 6-doc evidence pack + release ticket + RTM row + SRS amendments + implementation plan.
- **Operator action this cycle:** Confirmed the 4 plan-time AskUserQuestion choices (drop Mongoose enum / `other` aggregate bucket / breaking API contract / `[REQ-075]` bracket convention) BEFORE any production code was written. Will validate at PR review + during the manual UAT walkthrough + at portal UAT review.

## Implementation Details

**Files Added:**

- `interfaces/main-category.interface.ts` — `IMainCategoryConfig` + `DEFAULT_MAIN_CATEGORIES` + `MAIN_CATEGORY_SLUG_RE` + `RESERVED_MAIN_CATEGORY_SLUGS`.
- `services/main-category-service.ts` — CRUD + reference-counted-delete + sequential-rename.
- `components/features/admin/main-categories-form.tsx` — settings card.
- `e2e/admin/main-categories-config.spec.ts` — 4 tests pinning the service-layer contract.
- `__tests__/services/main-category-service.test.ts` — 19 unit-test cases.
- `compliance/plans/REQ-075/implementation-plan.md` (+ mirrored evidence-side copy).
- `compliance/evidence/REQ-075/{test-plan, test-execution-summary, test-scope, security-summary, ai-prompts, ai-use-note}.md` — 6-doc pack.

**Files Modified (production):**

- Schema: `models/menu-item-model.ts`, `models/inventory-snapshot-model.ts` (enum constraints removed); `interfaces/menu-item.interface.ts`, `interfaces/menu-settings.interface.ts`, `interfaces/inventory-snapshot.interface.ts` (free-form string).
- Services: `system-settings-service.ts` (getMainCategories + updateMainCategories), `category-service.ts` (new envelope), `financial-report-service.ts` (other bucket + console.warn), `staff-pot-service.ts` (console.warn skip), `inventory-snapshot-service.ts`, `restock-recommendation-service.ts`.
- Actions: `app/dashboard/settings/actions.ts` (6 new exports), `app/actions/admin/menu-actions.ts`, `app/actions/admin/kitchen-ingredient-actions.ts` (note), `app/actions/admin/staff-pot-actions.ts` (note), `app/actions/inventory/snapshot-actions.ts`, `app/actions/inventory/restock-recommendation-actions.ts`.
- Pages: `app/dashboard/settings/page.tsx`, `app/dashboard/menu/page.tsx`, `app/dashboard/menu/new/page.tsx`, `app/dashboard/menu/[itemId]/edit/page.tsx`, `app/menu/page.tsx`.
- API: `app/api/public/menu/route.ts`, `app/api/public/menu/categories/route.ts` (BREAKING + docstring), `app/api/public/sales/summary/route.ts`.
- Components: `menu-categories-form` (dynamic-tabbed), `menu-item-form`, `menu-item-edit-form`, `menu-items-table`, `category-navigation`, `menu-content`, `menu-item`, `menu-item-detail-modal`, `restock-recommendations-client`, `inventory-summary-client`, `snapshots-list-client`, `previous-inventory-updates-client`, `snapshot-details-client`.
- Docs: `docs/SRS.md` (new REQ-MENUMGT-005 row + REQ-API-006 amendment), `compliance/RTM.md` (new IN PROGRESS row).
- E2E: `e2e/api/public-contracts-authenticated.spec.ts` (REQ-071 envelope updated), `e2e/requirements-verification.spec.ts` (new REQ-MENUMGT-005 stub).

**Schema changes:** Mongoose `enum` constraint removed on `MenuItem.mainCategory` + `InventorySnapshot.mainCategory` + `InventorySnapshot.items[].mainCategory`. **No migration required** — default registry seed mirrors the legacy `food` + `drinks` pair so existing documents continue to match.

**New packages:** None. **New env vars:** None. **New auth surface:** Admin-only via existing `requireSuperAdmin`.

## Test Plan & Evidence

See `compliance/evidence/REQ-075/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1154 pass / 4 skip / 0 fail (**+19 cases** vs the post-REQ-074 baseline of 1135).
- TypeScript: 0 errors.
- E2E focused REQ-075 (UAT): pending UAT auto-deploy after develop merge.
- E2E REQ-071 envelope (updated to REQ-075 shape): pending UAT auto-deploy.

## Security & Compliance

See `security-summary.md`. Headline: mutations all funnel through `requireSuperAdmin`; slug validation rejects reserved + duplicate + invalid format; `changeHistory` audit trail preserved via `SystemSettingsService` pattern; the unauthenticated `getMainCategoriesAction` read exposes only data already public via `/api/public/menu/categories`. The BREAKING envelope is operator-acknowledged + REQ-API-006 amended.

## Pre-deploy operator checklist

- [ ] **External API consumers:** confirm any external integration pinned to the old `/api/public/menu/categories` `{ drinks, food }` envelope has been migrated to the new `{ mainCategories[…] }` shape. **This is BREAKING.**
- [ ] **Manual UAT walkthrough:** 7 steps in `test-scope.md` under "Manual UAT — required this cycle" (add a third main category, disable it, attempt delete on a referenced slug, rename + rename back).
- [ ] **No env-var setup, no DB migration.** Default seed mirrors the legacy `food` + `drinks` pair.

## Rollback Plan

Revert the integration PR. Schema relaxation is forward-compatible: existing documents already match the seed slugs `food` + `drinks`, so re-adding the Mongoose enum constraint post-revert would not invalidate any document (modulo any documents created mid-cycle under a non-seed slug, which the revert would orphan — operator should re-run rename on any such documents to drop them back to `food` / `drinks` before re-introducing the enum).

The API contract change is rolled back along with the route's docstring; external consumers should migrate to the old envelope on the rollback path.

## Deferred to follow-up REQs

| Item                                                              | Why                                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Per-main icon plumbing on customer surfaces                       | Registry stores `icon`; surfacing it on `menu-item.tsx` is a follow-up scope |
| Per-main badge colour palette                                     | Needs a `colour` field on `IMainCategoryConfig` + colour utility             |
| Drag-and-drop reorder (dnd-kit)                                   | V1 uses up/down buttons                                                      |
| Extending staff-pot eligibility gate to non-food/drink categories | Needs explicit operator decision per category                                |
| Versioned `/api/public/v1/menu/categories` shim                   | Operator opted into the breaking change                                      |

## Quality Gates

| Gate                                 | Expected                 | Actual (2026-06-07)         |
| ------------------------------------ | ------------------------ | --------------------------- |
| `npx tsc --noEmit`                   | exit 0                   | exit 0                      |
| `npx vitest run` (full)              | 0 failures               | 1154 pass / 4 skip / 0 fail |
| Unit tests for `MainCategoryService` | 19 pass                  | 19 pass                     |
| E2E focused REQ-075 (UAT)            | 4 pass                   | _pending UAT deploy_        |
| E2E REQ-071 envelope updated (UAT)   | 1 pass against new shape | _pending UAT deploy_        |

## Stage Approvals

- [x] Stage 1 — Plan (operator confirmed 4 high-stakes decisions via AskUserQuestion before coding)
- [x] Stage 2 — Implement + unit-test (19/19 new MainCategoryService cases pass; 1154/4/0 full vitest; tsc 0 errors)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR + manual walkthrough)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Single-REQ tracked release path — NOT a housekeeping bundle.
- PR title MUST carry `[REQ-075]` brackets per `feedback_pr_title_req_brackets` so `derive-release-version.sh` attributes evidence to the right release.
- The `feedback_phase3_release_ticket_mandatory` memory applies: this release ticket + 7 evidence markdowns must land on develop BEFORE the release PR is opened.
- BREAKING API contract change. Release notes must call this out so external consumers know to migrate.
