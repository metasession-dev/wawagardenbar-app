# REQ-076 — Security summary

## Surface review

REQ-076 introduces:

1. A new optional field on `IAdminPermissions` (`mainCategoryReportAccess?: string[]`) controlling per-user access to per-main-category reports.
2. A new helper `getAllowedMainCategoriesForReports` resolving the per-user permission against the registry.
3. A new server action `generateMainCategoryReportAction` with two-gate auth (existing role check + new per-main check).
4. A new admin-only page `/dashboard/reports/by-main-category` gated server-side.
5. A new admin permission editor section managed by the existing super-admin permissions UI.

## STRIDE pass

| Threat                     | Surface                                                                  | Status                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Spoofing**               | Non-super-admin invoking the action for a main outside their allowlist   | Not possible — server action runs `requireRole(['admin','super-admin'])` then `getAllowedMainCategoriesForReports` and rejects with `'Forbidden: not authorized for this main category'` before calling the service. Pinned by unit test + E2E negative assertion. |
| **Tampering**              | UI-only bypass (e.g. operator modifies the React dropdown locally)       | Server-side gate dominates. Editing the dropdown to include `food` then triggering the action still returns Forbidden because the action's `getAllowedMainCategoriesForReports` doesn't trust the client.                                                          |
| **Repudiation**            | Admin editor saves don't produce an audit trail                          | The existing `updateAdminPermissionsAction` writes an `admin.permissions-updated` AuditLog row (see `services/admin-service.ts:457-463`). The new `mainCategoryReportAccess` field is included in the persisted permissions snapshot.                              |
| **Information disclosure** | A restricted admin sees revenue numbers for a main they shouldn't        | Numbers come only from `generateMainCategoryReportAction`; that action gates BEFORE calling the service. No way to receive other mains' data via the public page or the action contract.                                                                           |
| **Denial of service**      | Date-range queries hammering the orders collection                       | Same query path as the existing daily report (no new query patterns). Existing rate-limit + role check applies.                                                                                                                                                    |
| **Elevation of privilege** | A restricted admin getting unrestricted access via the permission editor | Only super-admin can open `/dashboard/settings/admins/<id>/permissions`. The editor calls `updateAdminPermissionsAction` which `requireSuperAdmin`s server-side. CSR / admin can't escalate themselves.                                                            |

## Per-user permission resolution

`getAllowedMainCategoriesForReports` resolution table (pinned by 9 unit tests):

- `null` session → `[]` (anonymous gets nothing)
- super-admin → all registered mains (bypass — prevents operator lockout)
- `reportsAndAnalytics: false` → `[]` (top-level report gate)
- `mainCategoryReportAccess` undefined → all registered mains (back-compat)
- `mainCategoryReportAccess === []` → `[]` (explicit deny-all)
- subset → subset ∩ registered mains (slugs no longer in the registry are filtered out)

The "super-admin bypass" is intentional and load-bearing: it ensures the operator cannot lock themselves out by misconfiguring their own permissions. The `[]` exception for super-admin is explicitly tested.

## Reference-counted delete (out of scope)

There is no delete operation on `mainCategoryReportAccess`. The field is part of the user document; deleting a user deletes the permission. Deleting a registered main category (REQ-075 flow) does not require cleanup of the permission field — the helper filters unknown slugs at read time.

## Public endpoint change

**None.** The new server action is admin-only; the new page is admin-only. No public API touched. The aggregate Daily Report's `/api/public/sales/summary` and similar public endpoints are unchanged.

## Schema impact

- `User.permissions` (Mongoose `Schema.Types.Mixed`) gains an optional `mainCategoryReportAccess?: string[]` field.
- No migration: pre-REQ-076 admin documents have the field absent (back-compat handled by `undefined → all`).
- No new collection.

## Compliance posture

- **No new packages, no new env vars, no new credentials.**
- **No data migration.** Existing admins keep `undefined` (unrestricted) by default.
- **No production DB touches required.** UAT only for E2E + manual walkthrough (per `feedback_no_prod_db_touches`).
- **AuditLog writes preserved.** Existing `admin.permissions-updated` rows include the new field in the persisted permissions snapshot.

## What this REQ does NOT change

- Auth middleware (`requireRole`, `requireSuperAdmin`) — unchanged
- Daily Report (`/dashboard/reports/daily`) — unchanged
- Daily Report data shape (`DailySummaryReport`) — unchanged
- The 9 existing boolean permissions (`orderManagement`, `kitchenManagement`, etc.) — unchanged
- Session / cookie handling — unchanged

## Related

- REQ-075 (RELEASED 2026-06-08) — registered main-category registry that REQ-076 builds on
- REQ-034 — established the pattern of "boolean permission on `IAdminPermissions` gates a route" that REQ-076 extends with a multi-value field
- REQ-066 AC10 — same pattern (introduced `incidentsAccess`)
