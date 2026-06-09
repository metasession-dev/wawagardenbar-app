/**
 * Helpers for `app/actions/auth/admin-login.ts`.
 *
 * Extracted so the session-permission-copy contract is unit-testable
 * without standing up iron-session, Mongo, and bcrypt for every check.
 *
 * The contract was the source of a REQ-076 production defect: the
 * action whitelisted boolean permissions onto the session cookie but
 * silently dropped `mainCategoryReportAccess` (a string array), so
 * restricted admins logged in with `session.permissions` shaped as if
 * they had no restriction — `getAllowedMainCategoriesForReports`
 * routed them to the back-compat see-all-mains branch. This helper
 * pins the field-by-field copy so any new permission added in a
 * future REQ has a single forced-update site + a single test surface.
 */
import type { IAdminPermissions } from '@/interfaces/admin-permissions.interface';

/**
 * Build the session-side `permissions` object from a raw admin
 * permissions record (from the DB).
 *
 * - `null` / `undefined` raw → `undefined` (the action stores nothing
 *   on the session; downstream helpers default appropriately).
 * - Otherwise: every boolean field is normalised via `!!` so legacy
 *   `undefined` resolves to `false`.
 * - `incidentsAccess` defaults to `true` (REQ-066 AC10 — pre-AC10
 *   admins should keep access on first login without a backfill).
 * - `mainCategoryReportAccess` (REQ-076) is included **only** when the
 *   raw value is an array. `undefined` / `null` / wrong-type values
 *   are omitted, which the downstream
 *   `getAllowedMainCategoriesForReports` treats as "back-compat: see
 *   all mains".
 *
 * Keeping the cookie payload minimal: when there's no array, the
 * field is omitted entirely rather than persisted as `undefined`.
 *
 * @requirement REQ-066 AC10 — incidentsAccess default
 * @requirement REQ-076 — mainCategoryReportAccess pass-through
 */
export function buildSessionPermissions(
  raw: Partial<IAdminPermissions> | null | undefined
): IAdminPermissions | undefined {
  if (!raw) return undefined;

  return {
    orderManagement: !!raw.orderManagement,
    menuManagement: !!raw.menuManagement,
    inventoryManagement: !!raw.inventoryManagement,
    rewardsAndLoyalty: !!raw.rewardsAndLoyalty,
    reportsAndAnalytics: !!raw.reportsAndAnalytics,
    expensesManagement: !!raw.expensesManagement,
    settingsAndConfiguration: !!raw.settingsAndConfiguration,
    kitchenManagement: !!raw.kitchenManagement,
    incidentsAccess: raw.incidentsAccess !== false,
    ...(Array.isArray(raw.mainCategoryReportAccess)
      ? { mainCategoryReportAccess: raw.mainCategoryReportAccess }
      : {}),
  };
}
