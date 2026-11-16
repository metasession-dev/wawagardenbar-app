/**
 * @requirement REQ-122 - Staff notifications (ADR-011)
 * @srs REQ-DASH-003
 *
 * A persisted alert for staff. The row, not the socket event, is the source of
 * truth: a dashboard that was closed reads the unacknowledged rows on load.
 * `escalationLevel` moves 0 -> 1 -> 2 through an atomic conditional update, so
 * each WhatsApp level is claimed (and sent) once even with two app instances.
 */
import { Schema, model, models, type Model, type Document } from 'mongoose';
import type { StaffRole } from '@/interfaces/user.interface';
import { STAFF_ROLES } from '@/interfaces/user.interface';
import {
  STAFF_ALERT_TYPES,
  type StaffAlertType,
} from '@/lib/staff-alerts/staff-alert-rules';

export type StaffNotificationRefModel =
  | 'Order'
  | 'SupportTicket'
  | 'Booking'
  | 'Refund'
  | 'System';

export interface IStaffNotification extends Document {
  type: StaffAlertType;
  refModel: StaffNotificationRefModel;
  refId: string;
  /** Short reference shown in the alert and the WhatsApp template, e.g. an order number. */
  reference: string;
  title: string;
  /** Dashboard path that opens the item. */
  link: string;
  targetRoles: StaffRole[];
  targetUserIds: string[];
  acknowledgedBy?: string;
  acknowledgedAt?: Date | null;
  escalationLevel: 0 | 1 | 2;
  lastAlertAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffNotificationSchema = new Schema<IStaffNotification>(
  {
    type: { type: String, enum: STAFF_ALERT_TYPES, required: true },
    refModel: {
      type: String,
      enum: ['Order', 'SupportTicket', 'Booking', 'Refund', 'System'],
      required: true,
    },
    refId: { type: String, required: true },
    reference: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    link: { type: String, required: true },
    targetRoles: { type: [String], enum: STAFF_ROLES, default: [] },
    targetUserIds: { type: [String], default: [] },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date, default: null },
    escalationLevel: { type: Number, enum: [0, 1, 2], default: 0 },
    lastAlertAt: { type: Date },
  },
  { timestamps: true }
);

staffNotificationSchema.index({ acknowledgedAt: 1, createdAt: 1 });
staffNotificationSchema.index({ type: 1, refId: 1, acknowledgedAt: 1 });

const StaffNotificationModel: Model<IStaffNotification> =
  models.StaffNotification ||
  model<IStaffNotification>('StaffNotification', staffNotificationSchema);

export default StaffNotificationModel;
