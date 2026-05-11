export interface IAdminPermissions {
  orderManagement: boolean;
  menuManagement: boolean;
  inventoryManagement: boolean;
  rewardsAndLoyalty: boolean;
  reportsAndAnalytics: boolean;
  expensesManagement: boolean;
  settingsAndConfiguration: boolean;
}

export const DEFAULT_ADMIN_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: false,
  inventoryManagement: false,
  rewardsAndLoyalty: false,
  reportsAndAnalytics: true,
  expensesManagement: false,
  settingsAndConfiguration: false,
};

export const CSR_DEFAULT_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: false,
  inventoryManagement: false,
  rewardsAndLoyalty: true,
  reportsAndAnalytics: false,
  expensesManagement: false,
  settingsAndConfiguration: false,
};

export const SUPER_ADMIN_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: true,
  inventoryManagement: true,
  rewardsAndLoyalty: true,
  reportsAndAnalytics: true,
  expensesManagement: true,
  settingsAndConfiguration: true,
};

/**
 * REQ-034: bar / waiting are csr-equivalent per lib/permissions.ts (added
 * to every section roles list where `csr` appears). They inherit the CSR
 * permissions shape; the route-permission map enforces the section gating.
 */
export const BAR_DEFAULT_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: false,
  inventoryManagement: false,
  rewardsAndLoyalty: true,
  reportsAndAnalytics: false,
  expensesManagement: false,
  settingsAndConfiguration: false,
};

export const WAITING_DEFAULT_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: false,
  inventoryManagement: false,
  rewardsAndLoyalty: true,
  reportsAndAnalytics: false,
  expensesManagement: false,
  settingsAndConfiguration: false,
};

/**
 * REQ-034: kitchen is a default-deny allowlist role — only `/dashboard/kitchen/*`
 * is permitted, enforced by `lib/permissions.ts`. The feature-permissions
 * object plays no role for kitchen users; it's stored as all-false so the
 * Settings UI renders without empty-state quirks and any future legacy
 * permission checks fail closed.
 */
export const KITCHEN_DEFAULT_PERMISSIONS: IAdminPermissions = {
  orderManagement: false,
  menuManagement: false,
  inventoryManagement: false,
  rewardsAndLoyalty: false,
  reportsAndAnalytics: false,
  expensesManagement: false,
  settingsAndConfiguration: false,
};
