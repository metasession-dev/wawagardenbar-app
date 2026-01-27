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
  | 'reward.create'
  | 'reward.update'
  | 'reward.delete'
  | 'settings.update'
  | 'tab.manual_payment'
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
  | 'inventory.snapshot_rejected';

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
