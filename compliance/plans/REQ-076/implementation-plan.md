# REQ-076 — Per-main-category reports + per-user access control (#332)

## Context

Follow-up to REQ-075 (configurable main categories — released v2026.06.08). Two coupled deliverables, operator-driven:

1. **Per-main-category report** that replicates the existing Daily Report (`/dashboard/reports/daily`) but scopes revenue / costs / gross profit / items to one main category at a time.
2. **Per-user access control** so specific admins can be limited to viewing reports for specific mains only (e.g. the "Food manager" sees Food only; super-admin sees everything).

Operator-confirmed at plan time:

- **New sibling page** `/dashboard/reports/by-main-category`. Daily report stays unchanged — no breaking shape change.
- **Omit payments + tips** from per-main reports — they're order-level + multi-category; payment / tip breakdowns stay on the aggregate daily report only.
- **`[REQ-076]` brackets in every commit subject** (CI release attribution).
- **E2E specs delegated to the `e2e-test-engineer` skill** per `feedback_invoke_e2e_test_engineer` + DevAudit-Installer #132 — orchestrator declares delegation BEFORE any spec file is touched.

## Risk classification

**MEDIUM** — new RBAC dimension touches a sensitive auth surface (per-user permissions on a financial-report endpoint). Mitigations:

- Per-user permission field is additive; existing admins back-compat with unrestricted access (undefined → see all mains).
- Super-admin **always** bypasses the per-main check (no risk of locking out the operator).
- Server-side RBAC gate is the load-bearing safety check; UI selector filter is convenience.
- Newly created admins default to `[]` (restrictive — must be explicitly opted in).

## Architecture

### 1. Service layer — `services/financial-report-service.ts`

New return type + method:

```ts
export interface MainCategoryReport {
  date: Date;
  startDate?: Date;
  endDate?: Date;
  mainCategorySlug: string;
  mainCategoryLabel: string;        // resolved from registry at report time
  revenue: {
    items: Array<{ name; quantity; price; total }>;
    totalRevenue: number;
    itemCount: number;              // sum of qty across items
  };
  costs: {
    items: Array<{ name; quantity; costPerUnit; total }>;
    totalCost: number;
  };
  grossProfit: number;
  grossProfitMargin: number;
  orderCount: number;               // distinct orders containing at least one item from this main
}

static async generateMainCategoryReport(
  startDate: Date,
  endDate: Date,
  mainCategorySlug: string
): Promise<MainCategoryReport>
```

Implementation reuses the existing order-fetch + item-aggregation from `generateDailySummary` / `generateDateRangeReport`. Filters `itemAgg` to items whose `mainCategory === mainCategorySlug`. Order-count via `Set<orderId>` over orders containing at least one matching item. Label resolved via `SystemSettingsService.getMainCategories()`.

### 2. Server action — `app/actions/reports/report-actions.ts`

```ts
export async function generateMainCategoryReportAction(
  startDate: string,
  endDate: string,
  mainCategorySlug: string
): Promise<{ success: boolean; report?: MainCategoryReport; error?: string }>;
```

Two-gate auth:

1. `requireRole(['admin', 'super-admin'])` (existing pattern from daily-report action).
2. New `requireMainCategoryReportAccess(session, mainCategorySlug)` — uses the resolution table below.

Forbidden mains return `{ success: false, error: 'Forbidden: not authorized for this main category' }` — exact string pinned by E2E spec.

### 3. RBAC — `interfaces/admin-permissions.interface.ts`

Add to `IAdminPermissions`:

```ts
/**
 * REQ-076 — per-user main-category report access.
 * - undefined / null → see ALL mains (back-compat for users created before this REQ)
 * - []               → no access to the per-main report page
 * - ['food','snacks']→ restricted to listed slugs (∩ registered mains)
 * Super-admin always sees all regardless of this field.
 */
mainCategoryReportAccess?: string[];
```

Defaults:

| Default constant            | Value        | Effect                                 |
| --------------------------- | ------------ | -------------------------------------- |
| `DEFAULT_ADMIN_PERMISSIONS` | omit field   | back-compat: existing admins unchanged |
| `CSR_DEFAULT_PERMISSIONS`   | omit field   | back-compat: existing CSRs unchanged   |
| `SUPER_ADMIN_PERMISSIONS`   | omit field   | bypassed by helper anyway              |
| **New admin user creation** | persist `[]` | restrictive — opt-in                   |

### 4. Permissions helper — `lib/permissions.ts`

```ts
export function getAllowedMainCategoriesForReports(
  session: SessionData | null,
  allRegisteredMainSlugs: string[]
): string[];
```

Resolution table — pinned by 7 unit tests:

| Role / state                                   | Returns                                  |
| ---------------------------------------------- | ---------------------------------------- |
| `null` session                                 | `[]`                                     |
| super-admin (any field value)                  | all registered mains                     |
| `reportsAndAnalytics: false`                   | `[]`                                     |
| `mainCategoryReportAccess` undefined           | all registered mains                     |
| `mainCategoryReportAccess: []`                 | `[]`                                     |
| `mainCategoryReportAccess: ['food']`           | `['food']` ∩ registered mains            |
| `mainCategoryReportAccess: ['food','unknown']` | `['food']` (filtered to registered only) |

### 5. Report page — `app/dashboard/reports/by-main-category/`

- `page.tsx` (server component) — auth gate via `requireRole` + `getAllowedMainCategoriesForReports`. Loads registry, filters to user's allowed mains. Hands list + initial selection to client.
- `by-main-category-report-client.tsx` (client) — Main Category dropdown (singleton-auto-selects), `DateRangePicker` reused from `daily-report-client.tsx`, revenue card with item table, costs card with item table, summary (gross profit + margin + item count + order count), PDF / Excel / CSV export buttons.
- Footer note: "Payments + tips are aggregate-only. See the Daily Report for those breakdowns."
- Footer note: "Order count = distinct orders containing at least one item from this main category. Multi-category orders count toward each main's report."

`app/dashboard/reports/page.tsx` — add "By Main Category" tile next to "Daily Summary".

### 6. Exports — `lib/report-export.ts`

```ts
exportMainCategoryReportAsPDF(report: MainCategoryReport): void
exportMainCategoryReportAsExcel(report: MainCategoryReport): void
exportMainCategoryReportAsCSV(report: MainCategoryReport): void
```

Three sibling functions mirroring the existing daily-report exports. Filename pattern: `main-category-report-{slug}-{YYYY-MM-DD}[-{YYYY-MM-DD}].{pdf|xlsx|csv}`.

### 7. Admin permission UI — `app/dashboard/settings/admins/[adminId]/permissions/page.tsx`

New section "Main-Category Report Access" with:

- **Unrestricted (all current + future mains)** checkbox → persists `undefined`.
- Multi-select of registered enabled mains → persists `['food', 'snacks']`.
- Untick + clear → persists `[]`.

Server action `updateAdminMainCategoryReportAccessAction(adminId, slugs | null)` saves via the existing user-permission update path. Super-admin gated.

### 8. SRS + RTM

- `docs/SRS.md` — new **REQ-MENUMGT-006** row in the registry table + per-feature section under Feature Area 13.
- `compliance/RTM.md` — new IN PROGRESS row above REQ-075.

## Tests

### Unit (this skill authors)

- `__tests__/services/financial-report-service.main-category.test.ts` — 8 cases (filter; itemCount; orderCount across multi-main + repeat items; empty input; date-range; label resolution from registry; cost math; gross profit + margin math).
- `__tests__/lib/permissions.main-category-access.test.ts` — 7 cases covering every row of the resolution table.
- `__tests__/lib/report-export.main-category.test.ts` — CSV string output assertion (no file I/O); PDF + Excel skeleton presence.

### E2E (delegated to `e2e-test-engineer`)

Per `feedback_invoke_e2e_test_engineer` memory + DevAudit-Installer #132 — when E2E work begins, declare delegation:

> **Delegating e2e test work to e2e-test-engineer.**

Then `Skill(name: "e2e-test-engineer", args: <REQ-076 change summary>)`. The skill runs its own 6-phase workflow (orient → understand change → design scenarios → reconcile with existing pack → implement → execute). Strategy sketch from #332 is **input** to the skill; the skill's own design phase may refine or restructure.

## Critical files

| Type                | Path                                                                            |
| ------------------- | ------------------------------------------------------------------------------- |
| Edit (interface)    | `interfaces/admin-permissions.interface.ts`                                     |
| Edit (helper)       | `lib/permissions.ts`                                                            |
| Edit (service)      | `services/financial-report-service.ts`                                          |
| Edit (action)       | `app/actions/reports/report-actions.ts`                                         |
| Edit (export)       | `lib/report-export.ts`                                                          |
| Edit (landing)      | `app/dashboard/reports/page.tsx`                                                |
| Edit (admin UI)     | `app/dashboard/settings/admins/[adminId]/permissions/page.tsx`                  |
| Edit (admin action) | `app/actions/admin/admin-permissions-actions.ts` (or wherever admin perms live) |
| New (page)          | `app/dashboard/reports/by-main-category/page.tsx`                               |
| New (client)        | `app/dashboard/reports/by-main-category/by-main-category-report-client.tsx`     |
| Edit (SRS)          | `docs/SRS.md`                                                                   |
| Edit (RTM)          | `compliance/RTM.md`                                                             |
| New tests           | 3 unit files (see above)                                                        |
| New E2E             | delegated to `e2e-test-engineer` — paths TBD by the skill                       |

## Honesty notes — documented in evidence + footer

| Limitation                           | Why                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| No payment / tip breakdown           | Order-level data doesn't cleanly attribute to a single main                                                       |
| No operating-expenses split          | Expenses aren't tied to main categories                                                                           |
| Order-count caveat                   | Multi-main orders count toward each main's report; sums don't tie out to the aggregate daily report's order count |
| Back-compat: existing admins see all | `mainCategoryReportAccess: undefined` resolves to all mains                                                       |
| No charts in V1                      | The daily report has a Charts tab; per-main page V1 ships tables-only                                             |
| No pro-rated allocation              | Operator-rejected at plan time                                                                                    |

## Branch + PR

1. Branch `feat/REQ-076-per-main-category-reports` off develop. ✓ (cut)
2. Single bundled PR per `feedback_single_pr_default`.
3. PR title: `feat: per-main-category reports + per-user access control [REQ-076]`.
4. Every commit subject prefixed `[REQ-076]` so `derive-release-version.sh` attributes correctly.

## Security

- All mutations + reads gated by `requireRole(['admin', 'super-admin'])` at server-action layer.
- Per-main access enforced server-side; UI filter is convenience.
- Super-admin bypass means the operator cannot lock themselves out.
- No new env vars, no new packages, no new external integrations.
- No customer-facing exposure — `/dashboard/reports/*` is admin-only by existing route protection.

## Verification

1. `npx tsc --noEmit` → exit 0
2. `npx vitest run` → existing 1154+ pass + new unit cases all green
3. Local: login as super-admin, open `/dashboard/reports/by-main-category`, pick Food + today's date → numbers tie out with the daily report's `revenue.food`
4. Local: edit a test admin's permissions to `['drinks']` only, login as that admin → selector shows Drinks only, direct API call for `food` returns 403
5. Focused E2E against UAT — delegated to `e2e-test-engineer`'s execution phase
6. CSV / Excel / PDF exports downloaded + opened cleanly

## Out of scope (V2 candidates)

- Charts in the per-main report
- Per-customer / per-staff per-main breakdown
- Per-main report scheduling (daily email digest)
- Pro-rated payment/tip allocation across mains (operator-rejected)
- Bulk editing `mainCategoryReportAccess` across multiple admins

## Done when

- All Phase 2 production code lands; tsc + vitest green
- E2E specs authored by `e2e-test-engineer`; all green against UAT
- 6-doc evidence pack + release ticket on develop
- SRS + RTM updated
- PR open against develop with `[REQ-076]` brackets in the title
