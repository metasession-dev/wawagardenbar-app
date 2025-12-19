import mongoose, { Schema, Model } from 'mongoose';
import { IAuditLog } from '../interfaces/audit-log.interface';

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    action: {
      type: String,
      required: true,
      enum: [
        'user.create',
        'user.update',
        'user.delete',
        'user.delete_request',
        'user.role-change',
        'user.password-reset',
        'user.password-change',
        'user.status-change',
        'menu.create',
        'menu.update',
        'menu.delete',
        'inventory.update',
        'order.update',
        'order.cancel',
        'order.manual_payment',
        'reward.create',
        'reward.update',
        'reward.delete',
        'settings.update',
        'tab.manual_payment',
        'admin.create',
        'admin.login',
        'admin.logout',
        'admin.login-failed',
        'admin.account-locked',
        'admin.permissions-updated',
        'expense.create',
        'expense.update',
        'expense.delete',
      ],
    },
    resource: { type: String, required: true },
    resourceId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLogModel;
