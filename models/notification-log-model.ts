/**
 * @requirement REQ-055 — NotificationLog persistent audit log
 *
 * Persists every outbound transactional touch — the original send
 * attempt and any subsequent delivery-status updates received from
 * Meta's webhook. Replaces REQ-054's console-only observability with
 * a queryable audit trail.
 *
 * Forensic surface for "why didn't I get the message?" complaints
 * and the data backing SMS-fallback cost sizing.
 */
import { Schema, model, models, type Model, type Document } from 'mongoose';

export type NotificationLogChannel = 'whatsapp' | 'email' | 'sms';
export type NotificationLogStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

/**
 * Status lifecycle ordering. Higher number = later in the lifecycle.
 * `failed` is terminal and shares ordinality with `read` (both are
 * terminal). The monotonic-status filter in
 * `NotificationLogService.updateStatus` reads this to gate updates.
 */
export const NOTIFICATION_LOG_STATUS_ORDER: Record<
  NotificationLogStatus,
  number
> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 3, // Terminal; can't be overwritten once set.
};

export interface INotificationLog extends Document {
  templateKey: string;
  userId: string | null;
  channel: NotificationLogChannel;
  success: boolean;
  messageId: string | null;
  status: NotificationLogStatus;
  failureReason: string | null;
  durationMs: number | null;
  attemptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
  {
    templateKey: { type: String, required: true },
    // String (not ObjectId) so guest path (null) is representable
    // without per-Mongoose-version coercion quirks.
    userId: { type: String, default: null },
    channel: {
      type: String,
      required: true,
      enum: ['whatsapp', 'email', 'sms'],
    },
    success: { type: Boolean, required: true },
    messageId: { type: String, default: null },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
      default: 'queued',
    },
    failureReason: { type: String, default: null },
    durationMs: { type: Number, default: null },
    attemptedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// Indexes:
//   - userId + attemptedAt: "show me this user's recent notifications"
//   - messageId: fast status-update lookup; sparse since email/SMS rows
//     and failed-WA rows have null messageId
//   - attemptedAt: admin recent-failures view
notificationLogSchema.index({ userId: 1, attemptedAt: -1 });
notificationLogSchema.index({ messageId: 1 }, { sparse: true });
notificationLogSchema.index({ attemptedAt: -1 });

const NotificationLogModel: Model<INotificationLog> =
  (models.NotificationLog as Model<INotificationLog>) ||
  model<INotificationLog>('NotificationLog', notificationLogSchema);

export default NotificationLogModel;
