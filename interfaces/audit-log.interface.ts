import { Types } from 'mongoose';

export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.delete_request'
  | 'user.role-change'
  | 'user.password-reset'
  | 'user.password-change'
  | 'user.status-change'
  | 'menu.create'
  | 'menu.update'
  | 'menu.delete'
  | 'inventory.update'
  | 'order.update'
  | 'order.cancel'
  | 'order.manual_payment'
  | 'order.price_override'
  | 'reward.create'
  | 'reward.update'
  | 'reward.delete'
  | 'settings.update'
  | 'tab.manual_payment'
  | 'tab.partial_payment'
  | 'tab.delete'
  | 'admin.create'
  | 'admin.login'
  | 'admin.logout'
  | 'admin.login-failed'
  | 'admin.account-locked'
  | 'admin.permissions-updated'
  | 'expense.create'
  | 'expense.update'
  | 'expense.delete'
  | 'expense.uploaded_expense_updated'
  | 'expense.uploaded_expense_approved'
  | 'expense.uploaded_expense_rejected'
  | 'expense.uploaded_expense_deleted'
  | 'expense.uploaded_expenses_bulk_deleted'
  | 'inventory.snapshot_submitted'
  | 'inventory.snapshot_edited'
  | 'inventory.snapshot_approved'
  | 'inventory.snapshot_rejected'
  | 'inventory.stock_transferred'
  | 'inventory.batch_transfer'
  | 'inventory.location_tracking_enabled'
  | 'inventory.stock_added_to_location'
  | 'inventory.stock_deducted_from_location'
  | 'settings.inventory_locations_updated'
  // REQ-066 AC10 — operator-initiated retry of a stuck deduction via
  // the /dashboard/incidents page. Both success + failure paths log.
  | 'incidents.retry_deduction_succeeded'
  | 'incidents.retry_deduction_failed'
  | 'incidents.retry_deduction_partial';

export interface IAuditLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
