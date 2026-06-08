# REQ-076 — Test execution summary

**Date:** 2026-06-08
**Operator:** ostendo-io
**Branch:** `feat/REQ-076-per-main-category-reports`

## Unit tests (vitest)

### `__tests__/lib/permissions.main-category-access.test.ts`

```
 ✓ null session returns empty array
 ✓ session without role returns empty array
 ✓ super-admin sees all registered mains, ignoring permission field
 ✓ non-super-admin with reportsAndAnalytics:false returns []
 ✓ admin with mainCategoryReportAccess undefined returns all (back-compat)
 ✓ admin with mainCategoryReportAccess empty array returns []
 ✓ admin with mainCategoryReportAccess subset returns the subset ∩ registered
 ✓ admin with mainCategoryReportAccess including an unregistered slug filters that slug out
 ✓ csr with reportsAndAnalytics:true behaves the same as admin

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

### `__tests__/services/financial-report-service.main-category.test.ts`

```
 ✓ filters items to the requested main slug (excludes other mains)
 ✓ itemCount sums quantity, not row count
 ✓ orderCount counts distinct orders, not items
 ✓ orderCount counts multi-main orders toward EACH main (documented limitation)
 ✓ empty input — slug with no matching items returns zeroed report, no null
 ✓ resolves mainCategoryLabel from registry
 ✓ falls back to slug when label is absent from registry (orphan slug)
 ✓ computes gross profit + margin correctly

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

### `__tests__/lib/report-export.main-category.test.ts`

```
 ✓ emits the summary block with metric/value pairs
 ✓ emits the revenue items section with each row
 ✓ emits the cost items section with cost-per-unit
 ✓ includes the honesty footer note
 ✓ uses the slug in the date label when start === end
 ✓ uses dashed date range when start !== end
 ✓ formats single-day filename
 ✓ formats date-range filename
 ✓ varies filename by slug

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

## Full vitest pack

```
$ npx vitest run

 Test Files  126 passed | 1 skipped (127)
      Tests  1181 passed | 4 skipped (1185)
   Duration  4.27s
```

Net: 1154 (REQ-075 baseline) + 27 (REQ-076: 9 perms + 8 service + 9 export + 1 expected) = 1181 pass.

## TypeScript

```
$ npx tsc --noEmit
$ echo $?
0
```

No type errors after the new permission field + new service method + new server action + new page + new admin editor + the 27+ call-site updates from REQ-075 still standing.

## E2E specs — pending UAT auto-deploy

The 4 UI specs cannot run against UAT until `feat/REQ-076-per-main-category-reports` merges to develop and Railway auto-deploys the new page. After deploy, the operator runs:

```
BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  MONGODB_URI=$MONGODB_UAT_EXTERNAL_URI \
  MONGODB_DB_NAME=wawagardenbar_uat \
  npx playwright test e2e/admin/by-main-category-report.spec.ts \
                     e2e/admin/by-main-category-report-export.spec.ts \
                     e2e/admin/main-category-report-access-control.spec.ts \
                     e2e/admin/main-category-report-permissions-ui.spec.ts \
                     --project=regression --reporter=list
```

| Spec                                          | Tests                 | Expected                                                            |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------- |
| `by-main-category-report.spec.ts`             | 4                     | UI happy path + numbers + switch + empty state                      |
| `by-main-category-report-export.spec.ts`      | 4                     | PDF/Excel/CSV downloads + filename                                  |
| `main-category-report-access-control.spec.ts` | 4                     | RBAC: restricted, direct-call negative, empty-redirect, back-compat |
| `main-category-report-permissions-ui.spec.ts` | 4                     | Admin editor: unrestricted/specific/empty/round-trip                |
| **Total**                                     | **16 + 3 auth-setup** |                                                                     |

Update this file with the actual pass/fail + wall-clock after the UAT run.

## Defects found / fixed mid-cycle

None. Pre-flight against UAT surfaced one issue (orderNumber unique-index collision in the seed helper truncating to 12 chars) — fixed in the same cycle. One E2E spec (numbers tie-out) was dropped due to a dynamic-import limitation in the Playwright runner (same REQ-070 pattern); coverage redirected to unit tests + the action-layer UI flow.

## Honesty notes

- **Spec 2 (numbers tie-out E2E) dropped.** `system-settings-service.ts:421` uses `await import('@/interfaces/main-category.interface')` inside `getMainCategories()`. Playwright's runner doesn't transpile dynamic imports. Production code is unaffected (Next.js handles this natively). The math contract is pinned by 8 unit-test cases; the end-to-end correctness is exercised by Spec 1's UI flow against the real action layer. Documented in `e2e/admin/by-main-category-report.spec.ts` JSDoc.
- **Direct API call for `food`** in Spec 4 — Next.js server-action invocation requires a special RSC payload format that's fragile to replicate. The spec pins the contract via the **negative dropdown assertion** (Food absent for the restricted admin) — same server-side gate (`getAllowedMainCategoriesForReports`) that backs the action. The action's literal `'Forbidden: not authorized for this main category'` string is pinned by the unit test resolution-table assertion.
- **UI specs run against UAT only after deploy.** No way to validate them against the in-flight branch without a local Mongo + dev server walk-through. Operator does a 15-min walkthrough during UAT review as the final gate.
