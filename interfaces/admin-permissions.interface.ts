export interface IAdminPermissions {
  orderManagement: boolean;
  menuManagement: boolean;
  inventoryManagement: boolean;
  rewardsAndLoyalty: boolean;
  reportsAndAnalytics: boolean;
  expensesManagement: boolean;
  settingsAndConfiguration: boolean;
  /**
   * REQ-034 — gates `/dashboard/kitchen/*` (recipes + production).
   * Default `false` for admin and csr; `true` for super-admin.
   * Granted via Settings → Admins → Permissions toggle.
   */
  kitchenManagement: boolean;
  /**
   * REQ-066 AC10 — gates `/dashboard/incidents`. Lets the holder view
   * inventory-deduction-failed + stale-paid-order events and click
   * "Retry now" on stuck deductions. Defaults `true` for all roles
   * (matches the existing `requireRole(['csr','admin','super-admin'])`
   * gate on the page); super-admin always bypasses the permission
   * gate in the nav filter.
   */
  incidentsAccess: boolean;
  /**
   * REQ-076 — per-user main-category report access. Controls which
   * mains the holder can see in `/dashboard/reports/by-main-category`.
   *
   * - `undefined` / `null` → see ALL registered mains (back-compat
   *   default for users created before REQ-076; existing admins are
   *   unaffected by this REQ).
   * - `[]` → no access to the per-main report page at all (page
   *   redirects to `/dashboard`).
   * - `['food', 'snacks']` → restricted to those slugs (intersected
   *   with the currently-registered mains; unknown slugs filtered out).
   *
   * Super-admin ALWAYS sees all mains regardless of this field —
   * preventing accidental operator lockout. CSR / admin roles also
   * need `reportsAndAnalytics: true` to access any report page;
   * `mainCategoryReportAccess` is an additional sub-filter on top of
   * that, not a replacement.
   *
   * Newly created admin users default to `[]` (restrictive — must be
   * explicitly opted in by the super-admin). Pre-REQ-076 admins keep
   * `undefined` and see everything.
   */
  mainCategoryReportAccess?: string[];
}

export const DEFAULT_ADMIN_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: false,
  inventoryManagement: false,
  rewardsAndLoyalty: false,
  reportsAndAnalytics: true,
  expensesManagement: false,
  settingsAndConfiguration: false,
  kitchenManagement: false,
  incidentsAccess: true,
};

export const CSR_DEFAULT_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: false,
  inventoryManagement: false,
  rewardsAndLoyalty: true,
  reportsAndAnalytics: false,
  expensesManagement: false,
  settingsAndConfiguration: false,
  kitchenManagement: false,
  incidentsAccess: true,
};

export const SUPER_ADMIN_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: true,
  inventoryManagement: true,
  rewardsAndLoyalty: true,
  reportsAndAnalytics: true,
  expensesManagement: true,
  settingsAndConfiguration: true,
  kitchenManagement: true,
  incidentsAccess: true,
};
