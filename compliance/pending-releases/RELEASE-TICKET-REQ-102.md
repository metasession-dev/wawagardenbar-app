# Release Ticket: REQ-102 — Triple menu pricing (default/show/happy-hour) + bulk "Edit All" page

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-09-04
**Requirement ID:** REQ-102
**Risk Level:** HIGH
**Issue:** [#696](https://github.com/metasession-dev/wawagardenbar-app/issues/696)
**Implementation branch:** `feat/REQ-102-triple-menu-pricing`

## Summary

Every menu item gets a `showPrice` and `happyHourPrice` alongside the existing `price`, each activated by its own independently-configurable daily time window (Show Price Window, Happy Hour Window) in Settings. Precedence when windows overlap: happy-hour > show > default; a manual price override (existing REQ-089 feature) always wins over all three. Adds a bulk "Edit All" page for reviewing/editing cost/default/show/happy-hour price, name, main category, category, and availability across every menu item, filterable by category, linked from the top of `/dashboard/menu`.

Classified HIGH risk (not MEDIUM, unlike the REQ-100/REQ-101 reporting-only bugs that precede it in this pricing-code lineage) because this REQ changes the price actually charged at the point of sale, not just a report display — a precedence bug here has immediate financial impact.

## AI contributors

| Tool        | Version  | Commits                                                                                      | Date       |
| ----------- | -------- | -------------------------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | 9 commits on `feat/REQ-102-triple-menu-pricing` (plan + implementation + tests + compliance) | 2026-09-04 |

## Implementation details

- `models/menu-item-model.ts`, `interfaces/menu-item.interface.ts` — new required `showPrice`/`happyHourPrice` fields; `models/menu-item-price-history-model.ts` extends the existing full-snapshot history row to carry both.
- `scripts/migrate-show-happy-hour-prices.ts` — backfill script for existing `MenuItem` documents (must run before/at deploy — see Operator action below).
- `services/price-history-service.ts`, `app/actions/admin/price-management-actions.ts`, `components/features/admin/price-update-form.tsx`, `price-history-viewer.tsx` — extend the existing audited price-management convention to all three prices.
- `models/settings-model.ts`, `services/settings-service.ts` (`isShowPriceActive()`, `isHappyHourActive()`, `resolveActivePriceField()`), `components/features/admin/settings-form.tsx` — two new independent daily windows, mirroring the existing `businessHours` pattern.
- `lib/order-line-totals.ts` + all three order-creating call sites (`express-actions.ts`, `order-edit-actions.ts`, `app/api/public/orders/route.ts`) — resolve the active price field before the existing manual-override branch.
- `services/category-service.ts`, `components/features/menu/menu-item.tsx`, `menu-item-detail-modal.tsx` — public menu displays the server-resolved active price (`displayPrice`).
- `app/dashboard/menu/edit-all/page.tsx` (new), `components/features/admin/menu-edit-all-table.tsx` (new), `updateMenuItemRowAction` in `app/actions/admin/menu-actions.ts` (new) — bulk edit page, reusing the super-admin RBAC gate and audited price-history convention.
- `app/actions/admin/kitchen-ingredient-actions.ts`, `app/api/public/menu/route.ts`, `scripts/seed-food-menu.ts`, `seed-drinks-menu.ts`, `seed-e2e-fixtures.ts` — fixed to supply the new required fields (discovered while setting up local e2e infra; these would have broken CI's e2e setup step for every future REQ once the schema change merged).
- `docs/ADR/ADR-004-time-window-price-precedence.md` — centralizes precedence in `resolveActivePriceField()`.
- `docs/SRS.md` — `REQ-MENUMGT-008`/`REQ-MENUMGT-009`/`REQ-ORDER-006`/`REQ-MENU-008` (new), `REQ-SETTINGS-001` (updated).
- `compliance/risk-register.md` — `R-024` through `R-027` (all OPEN, residual low × high).
- Tests: 4 new unit test files, 7 existing files reconciled with new fixtures/mocks; 4 new e2e spec files (12 tests), authored via the `e2e-test-engineer` skill.

## Verification

- Unit: 1,412 passed, 4 skipped (full suite) — up from 1,406 pre-REQ.
- E2E: 12/12 new tests passing across 3 consecutive clean local runs (dev server + disposable Docker Mongo, matching CI's recipe). Full historical regression pack (not a required pre-merge gate per `Test_Policy.md`) attempted locally as extra diligence but could not complete due to shared-machine memory contention; CI's `feature-e2e.yml` is the project's documented safety net for that layer.
- TypeScript/ESLint: 0 errors. SAST (Semgrep): 0 findings. No new dependencies.
- Full detail: `compliance/evidence/REQ-102/test-execution-summary.md`.

## Operator action required before/at deploy

Run `npx tsx scripts/migrate-show-happy-hour-prices.ts` against each environment's database (dev/UAT/prod) to backfill `showPrice`/`happyHourPrice` on existing `MenuItem` documents, before or immediately after this REQ's code reaches that environment. AC9 + risk R-025 track this.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. HIGH risk triggered the Phase 1 plan-approval checkpoint; the operator reviewed and approved the plan (issue #696 comment thread) before Phase 2 implementation began. The operator will review the PR + perform the portal UAT review before Production approval, and must run the migration script per "Operator action required" above.
