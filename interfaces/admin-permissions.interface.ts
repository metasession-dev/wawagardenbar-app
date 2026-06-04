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
