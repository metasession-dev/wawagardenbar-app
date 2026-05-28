/**
 * Service layer for business logic.
 *
 * Barrel re-export for the project's services. Each service owns the
 * domain-specific orchestration between routes/actions and the underlying
 * Mongoose models (e.g. `OrderService.cancelOrder` composes inventory
 * restore + points reversal + reward restore).
 */
export { CategoryService } from './category-service';
export { OrderService } from './order-service';
export { PaymentService } from './payment-service';
export { RewardsService } from './rewards-service';
export { AuditLogService } from './audit-log-service';
export { ProfileService } from './profile-service';
export { default as InventoryService } from './inventory-service';
export { default as SettingsService } from './settings-service';
export { SystemSettingsService } from './system-settings-service';
export { PointsService } from './points-service';
export { TabService } from './tab-service';
export { UserService } from './user-service';
export { ExpenseService } from './expense-service';
export { FinancialReportService } from './financial-report-service';
