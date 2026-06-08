# REQ-076 — Test scope

## In scope (this PR)

### Production code

- `interfaces/admin-permissions.interface.ts` — `mainCategoryReportAccess?: string[]` field added
- `lib/permissions.ts` — `getAllowedMainCategoriesForReports(session, allRegisteredMainSlugs): string[]` helper added
- `services/financial-report-service.ts` — new `MainCategoryReport` interface + `generateMainCategoryReport(startDate, endDate, mainCategorySlug)` method
- `app/actions/reports/report-actions.ts` — new `generateMainCategoryReportAction` with two-gate auth (`requireRole` + `getAllowedMainCategoriesForReports` intersect)
- `lib/report-export.ts` — three new sibling functions (`exportMainCategoryReportAsPDF/Excel/CSV`) + `buildMainCategoryReportCSV` (testable) + `mainCategoryReportFilename` (filename pattern)
- `app/dashboard/reports/by-main-category/page.tsx` — server component with auth gate + registry filter
- `app/dashboard/reports/by-main-category/by-main-category-report-client.tsx` — client component (selector + date picker + summary cards + revenue/cost tables + export buttons + honesty footer)
- `app/dashboard/reports/page.tsx` — added "By Main Category" tile
- `app/dashboard/settings/admins/[adminId]/permissions/page.tsx` — fetches enabled mains + passes to client
- `components/features/admin/permissions-management-client.tsx` — wires the new editor below the existing PermissionsEditor
- `components/features/admin/main-category-report-access-editor.tsx` — NEW: Unrestricted checkbox + per-main checkboxes

### Unit tests

- `__tests__/lib/permissions.main-category-access.test.ts` — 9 cases (every resolution-table row + a CSR-with-reports-and-analytics case)
- `__tests__/services/financial-report-service.main-category.test.ts` — 8 cases (filter / itemCount / orderCount / multi-main / empty-input / label-resolution / orphan-slug / cost+margin math)
- `__tests__/lib/report-export.main-category.test.ts` — 9 cases (CSV content + filename pattern variants)

### E2E specs

- `e2e/helpers/main-category-report-seed.ts` — shared seed utilities (NEW): `seedReportFixture` with 4 deterministic orders on 2020-01-01 (math known in advance), `seedAdminWithReportAccess`, `readAdminPermissions`, `cleanup*`
- `e2e/admin/by-main-category-report.spec.ts` — Spec 1: UI happy path (4 tests covering AC1, AC2, switch, empty state)
- `e2e/admin/by-main-category-report-export.spec.ts` — Spec 3: PDF/Excel/CSV downloads (4 tests covering AC7)
- `e2e/admin/main-category-report-access-control.spec.ts` — Spec 4: RBAC enforcement (4 tests covering AC4, AC5, empty-redirect, AC8)
- `e2e/admin/main-category-report-permissions-ui.spec.ts` — Spec 5: admin permission editor (4 tests covering AC6)

### Compliance

- `docs/SRS.md` — new REQ-MENUMGT-006 row in registry table + per-feature section in Feature Area 13
- `compliance/RTM.md` — new IN PROGRESS row above REQ-075
- `compliance/plans/REQ-076/implementation-plan.md` + mirrored evidence copy
- `compliance/evidence/REQ-076/{test-plan,test-execution-summary,test-scope,security-summary,ai-prompts,ai-use-note}.md` — 6-doc pack
- `compliance/pending-releases/RELEASE-TICKET-REQ-076.md`

## SRS items covered

| SRS ID                | Covered by         | Status                                   |
| --------------------- | ------------------ | ---------------------------------------- |
| REQ-MENUMGT-006 (NEW) | unit + 4 E2E specs | **Pinned** (UI specs pending UAT deploy) |

## Out of scope (deferred to follow-up REQs)

| Item                                                           | Why deferred                                                                                                                                         |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Charts on the per-main page                                    | The daily report has a Charts tab; per-main V1 is tables-only                                                                                        |
| Per-customer / per-staff per-main breakdown                    | Heavier scope; orthogonal data slicing                                                                                                               |
| Per-main report scheduling (daily email digest)                | Out of scope this REQ                                                                                                                                |
| Pro-rated payment / tip allocation across mains                | Operator-rejected at plan time as mathematically defensible but a fiction staff may not understand                                                   |
| Bulk editing `mainCategoryReportAccess` across multiple admins | One-by-one V1; bulk is future polish                                                                                                                 |
| Spec 2 — service-layer numbers tie-out E2E                     | Dynamic-import limitation in Playwright runner (REQ-070 pattern). Math contract pinned by unit tests; UI flow exercises end-to-end via action layer. |

## Manual UAT — required this cycle

Three short operator steps; the heavy functional testing is all in E2E.

### Step 1 — Visual styling sanity (~5 min)

Login as super-admin, open `/dashboard/reports/by-main-category`. Scan for:

- Summary cards layout (6 cards in a responsive grid)
- Revenue + cost tables render without overflow
- Honesty footer alert is visible at the bottom
- Dropdown + date picker controls are accessible on mobile breakpoint

E2E pins the test-ids; the visual rendering is the operator's call.

### Step 2 — Export readability (~5 min)

Pick Food + today's date. Click each export button. Open the downloaded files in real apps:

- PDF — opens in a PDF viewer (Preview / Adobe). Numbers align; headers present; honesty note footer visible.
- Excel — opens in a spreadsheet app (Numbers / Excel / Google Sheets). 3 sheets present (Summary, Revenue, Costs). Column widths look right.
- CSV — opens in a spreadsheet app. Same content; readable.

E2E pins content + filename; visual rendering of the binary files is the operator's call.

### Step 3 — RBAC live walkthrough (~5 min)

1. Open `/dashboard/settings/admins/<id>/permissions` for a non-super-admin test user
2. Untick "Unrestricted", select only Drinks, save
3. Log out, log in as that test admin
4. Navigate to `/dashboard/reports/by-main-category` — verify only Drinks appears in selector
5. Reset: log out, log back in as super-admin, tick Unrestricted on the test admin's permissions, save

E2E spec 4 pins the same flow programmatically; this is the operator's eyes-on confirmation against real session state.

**No env-var setup, no migration.** The new `mainCategoryReportAccess` field is optional + back-compat — existing admins see all mains until explicitly restricted.
