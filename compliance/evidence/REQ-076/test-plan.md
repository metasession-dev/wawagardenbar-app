# REQ-076 — Test plan

**Requirement ID:** REQ-076
**Risk:** MEDIUM
**Related issue:** [#332](https://github.com/metasession-dev/wawagardenbar-app/issues/332)
**Date:** 2026-06-08

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                                             | Test                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | Super-admin opens `/dashboard/reports/by-main-category` → sees all enabled mains in the dropdown.                                                                                                     | `e2e/admin/by-main-category-report.spec.ts` — AC1                                                                                                                                                                                                                                                                                                                                             |
| AC2 | Picking a main + date range renders revenue + costs + 6 summary cards (revenue, cost, gross profit, margin, item count, order count) + per-item tables.                                               | `e2e/admin/by-main-category-report.spec.ts` — AC2 + AC2-switch                                                                                                                                                                                                                                                                                                                                |
| AC3 | Numbers tie out with the aggregate daily report's per-main slice for the same date.                                                                                                                   | `__tests__/services/financial-report-service.main-category.test.ts` (8 cases pinning filter / itemCount / orderCount / empty-input / label-resolution / cost + gross profit math). E2E spec dropped due to dynamic-import limitation in Playwright runner (same REQ-070 pattern). Spec 1's UI flow exercises the action-layer math end-to-end against real UAT Mongo as the additional check. |
| AC4 | Admin with `mainCategoryReportAccess: ['drinks']` opens the page → dropdown shows ONLY "Drinks".                                                                                                      | `e2e/admin/main-category-report-access-control.spec.ts` — AC4                                                                                                                                                                                                                                                                                                                                 |
| AC5 | Same admin's direct action call for `food` → literal `'Forbidden: not authorized for this main category'`.                                                                                            | `__tests__/lib/permissions.main-category-access.test.ts` (7 cases) pins the resolution table. `e2e/admin/main-category-report-access-control.spec.ts` — AC5 pins the negative dropdown assertion (server-resolved allowed list excludes 'food' for this admin).                                                                                                                               |
| AC6 | Super-admin opens admin permissions page → sees the new Main-Category Report Access section. Toggling Unrestricted / specific / empty → save → DB persists correctly. Reload renders the saved state. | `e2e/admin/main-category-report-permissions-ui.spec.ts` — 4 tests                                                                                                                                                                                                                                                                                                                             |
| AC7 | PDF / Excel / CSV exports produce files with correct numbers + main slug + date in filename.                                                                                                          | `e2e/admin/by-main-category-report-export.spec.ts` — 4 tests; `__tests__/lib/report-export.main-category.test.ts` (9 cases) on CSV content + filename pattern                                                                                                                                                                                                                                 |
| AC8 | Pre-REQ-076 admin (field undefined) continues to see all mains (back-compat).                                                                                                                         | `e2e/admin/main-category-report-access-control.spec.ts` — AC8; `__tests__/lib/permissions.main-category-access.test.ts` (undefined-back-compat case)                                                                                                                                                                                                                                          |

## Surfaces / contracts under test

| Surface                                            | Source-of-truth                                                          | Pinned by                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| `MainCategoryReport` interface                     | `services/financial-report-service.ts`                                   | unit AC3 + E2E AC2                                  |
| `generateMainCategoryReport` math                  | same                                                                     | unit AC3 (8 cases)                                  |
| Server-action 2-gate auth                          | `app/actions/reports/report-actions.ts:generateMainCategoryReportAction` | unit (resolution table) + E2E AC4 (dropdown filter) |
| `IAdminPermissions.mainCategoryReportAccess` field | `interfaces/admin-permissions.interface.ts`                              | unit AC4-AC8 + E2E AC4/AC6/AC8                      |
| `getAllowedMainCategoriesForReports` helper        | `lib/permissions.ts`                                                     | unit (9 cases — every resolution-table row)         |
| Page server-side redirect on no-access             | `app/dashboard/reports/by-main-category/page.tsx`                        | E2E AC4 (empty-array redirect)                      |
| Admin permission editor persistence                | `components/features/admin/main-category-report-access-editor.tsx`       | E2E AC6 (4 tests)                                   |
| PDF/Excel/CSV export filenames + content           | `lib/report-export.ts`                                                   | unit (9 cases) + E2E AC7 (4 tests)                  |

## Test environment

- **Unit:** vitest + mocked Mongo + mocked `SystemSettingsService`. No network, no DB. 26 cases (9 perms + 8 service + 9 export).
- **E2E:** Playwright + UAT URL + UAT Mongo (read+write at storage layer via the shared `e2e/helpers/main-category-report-seed.ts`). Synthetic past date 2020-01-01 + `e2e-req076-*` prefix for collision-free coexistence with real UAT data.
- **API contracts:** server action `generateMainCategoryReportAction` — RBAC gate pinned by unit + UI selector assertion.

## Quality gates

| Gate                           | Expected                                             | Actual (2026-06-08)         |
| ------------------------------ | ---------------------------------------------------- | --------------------------- |
| `npx tsc --noEmit`             | exit 0                                               | exit 0                      |
| `npx vitest run` (full)        | 1154 baseline + 27 new = 1181 pass / 4 skip / 0 fail | 1181 pass / 4 skip / 0 fail |
| Focused E2E (UAT) — 4 UI specs | pending UAT auto-deploy after develop merge          | _to confirm after merge_    |

## Out of scope

- Charts on the per-main page (the daily report has a Charts tab; this REQ ships tables-only)
- Per-customer / per-staff per-main breakdown
- Per-main report scheduling / email digest
- Pro-rated payment / tip allocation (operator-rejected at plan time)
- Bulk editing `mainCategoryReportAccess` across multiple admins
- E2E coverage of the service-layer math (dropped to dynamic-import limitation — pinned by unit tests + UI flow instead)
