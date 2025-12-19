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

export const SUPER_ADMIN_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: true,
  inventoryManagement: true,
  rewardsAndLoyalty: true,
  reportsAndAnalytics: true,
  expensesManagement: true,
  settingsAndConfiguration: true,
};
