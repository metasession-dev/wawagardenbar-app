/**
 * @requirement REQ-122 - Staff notifications, alert numbers and escalation
 * @srs REQ-DASH-003, REQ-DASH-004, REQ-DASH-005, REQ-SETTINGS-006, REQ-WA-014
 *
 * One entry point to raise a staff alert (`raise`), role-scoped reads and
 * acknowledgement for the dashboard, the alert rules stored in system settings,
 * and the once-a-minute escalation run (ADR-011).
 *
 * Money and customer flows must never fail because an alert failed: `raise`
 * and the escalation run swallow and log their own errors.
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import StaffNotificationModel, {
  type IStaffNotification,
  type StaffNotificationRefModel,
} from '@/models/staff-notification-model';
import SystemSettingsModel from '@/models/system-settings-model';
import UserModel from '@/models/user-model';
import { STAFF_ROLES } from '@/interfaces/user.interface';
import { WhatsAppService } from '@/lib/whatsapp';
import { staffAlertParams } from '@/lib/whatsapp-template-params';
import { NotificationLogService } from '@/services/notification-log-service';
import { getCurrentBusinessHHMM } from '@/lib/business-time';
import {
  DEFAULT_STAFF_ALERT_RULES,
  dueLevels,
  isInQuietHours,
  mergeStaffAlertRules,
  minutesWaiting,
  resolveRecipients,
  staffAlertPath,
  STAFF_ALERT_LABELS,
  type AlertRecipientCandidate,
  type StaffAlertRules,
  type StaffAlertType,
  type StaffViewer,
} from '@/lib/staff-alerts/staff-alert-rules';

const RULES_KEY = 'staff-alert-rules';
const ESCALATION_BATCH = 200;

export interface StaffNotificationView {
  id: string;
  type: StaffAlertType;
  title: string;
  link: string;
  createdAt: string;
  minutesWaiting: number;
}

export interface RaiseRef {
  refModel: StaffNotificationRefModel;
  refId: string;
  /** Short reference for the alert, e.g. the order number. */
  reference: string;
}

function viewerFilter(viewer: StaffViewer): Record<string, unknown> {
  return {
    acknowledgedAt: null,
    $or: [
      { targetRoles: { $in: [...viewer.roles] } },
      { targetUserIds: viewer.id },
    ],
  };
}

function toView(doc: IStaffNotification, now: Date): StaffNotificationView {
  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    link: doc.link,
    createdAt: new Date(doc.createdAt).toISOString(),
    minutesWaiting: minutesWaiting(new Date(doc.createdAt), now),
  };
}

async function emitPoke(id: string, type: StaffAlertType): Promise<void> {
  try {
    // The payload carries no content: clients refetch through an authenticated,
    // role-scoped action (R-66), so the open socket room leaks nothing.
    const { emitSocketEvent } = await import('@/lib/socket-emit-helper');
    await emitSocketEvent('staff-notification', { id, type });
  } catch (error) {
    console.error('[StaffNotification] socket emit failed:', error);
  }
}

export class StaffNotificationService {
  // ---- rules (REQ-SETTINGS-006) ----

  static async getRules(): Promise<StaffAlertRules> {
    await connectDB();
    const setting = await SystemSettingsModel.findOne({ key: RULES_KEY });
    return mergeStaffAlertRules(setting?.value);
  }

  static async updateRules(
    rules: unknown,
    adminUserId: string
  ): Promise<StaffAlertRules> {
    await connectDB();
    const merged = mergeStaffAlertRules(rules);
    await SystemSettingsModel.findOneAndUpdate(
      { key: RULES_KEY },
      {
        $set: {
          value: merged,
          updatedBy: new Types.ObjectId(adminUserId),
          updatedAt: new Date(),
        },
        $push: {
          changeHistory: {
            value: merged,
            changedBy: new Types.ObjectId(adminUserId),
            changedAt: new Date(),
            reason: 'Staff alert rules updated',
          },
        },
      },
      { upsert: true, new: true }
    );
    return merged;
  }

  /** Staff accounts, for the named-users picker in Settings (admins only). */
  static async listStaffOptions(): Promise<
    Array<{ id: string; label: string; roles: string[] }>
  > {
    await connectDB();
    const users = await UserModel.find({ roles: { $in: [...STAFF_ROLES] } })
      .select('username name firstName lastName roles')
      .lean<
        Array<{
          _id: unknown;
          username?: string;
          name?: string;
          firstName?: string;
          lastName?: string;
          roles?: string[];
        }>
      >();
    return users
      .map((u) => ({
        id: String(u._id),
        label:
          u.username ||
          u.name ||
          [u.firstName, u.lastName].filter(Boolean).join(' ') ||
          String(u._id),
        roles: u.roles ?? [],
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // ---- raise (REQ-DASH-003) ----

  /**
   * Create one notification for `type` according to its rule. Idempotent per
   * item (see the dedupe note below). Never throws.
   */
  static async raise(
    type: StaffAlertType,
    ref: RaiseRef,
    title?: string
  ): Promise<IStaffNotification | null> {
    try {
      await connectDB();
      // One alert per item for orders, bookings, events and refunds, so a
      // retried payment webhook cannot re-alert after staff acknowledged it.
      // A support ticket alerts again for a later customer message once the
      // earlier one was acknowledged.
      const existing = await StaffNotificationModel.findOne({
        type,
        refId: ref.refId,
        ...(type === 'support' ? { acknowledgedAt: null } : {}),
      }).lean();
      if (existing) return null;

      const rules = await this.getRules();
      const rule = rules[type] ?? DEFAULT_STAFF_ALERT_RULES[type];
      const doc = await StaffNotificationModel.create({
        type,
        refModel: ref.refModel,
        refId: ref.refId,
        reference: ref.reference,
        title: title ?? `${STAFF_ALERT_LABELS[type]} ${ref.reference}`.trim(),
        link: `/dashboard/${staffAlertPath(type, ref.refId)}`,
        targetRoles: rule.inAppRoles,
        targetUserIds: rule.namedUserIds,
        escalationLevel: 0,
      });
      void emitPoke(String(doc._id), type);
      return doc;
    } catch (error) {
      console.error('[StaffNotification] raise failed:', error);
      return null;
    }
  }

  /** REQ-DASH-003 — a customer-origin order became paid. Staff orders raise nothing. */
  static async raiseForPaidOrder(order: {
    _id: unknown;
    orderNumber?: string;
    origin?: string;
  }): Promise<void> {
    if (order.origin !== 'customer') return;
    await this.raise('order', {
      refModel: 'Order',
      refId: String(order._id),
      reference: order.orderNumber ?? String(order._id).slice(-6),
    });
  }

  /** REQ-DASH-003 — a support ticket was created or got a customer reply. */
  static async raiseForSupportTicket(ticket: {
    _id: unknown;
    ticketNumber?: string;
  }): Promise<void> {
    await this.raise('support', {
      refModel: 'SupportTicket',
      refId: String(ticket._id),
      reference: ticket.ticketNumber ?? String(ticket._id).slice(-6),
    });
  }

  // ---- reads and acknowledgement (REQ-DASH-004, REQ-DASH-005) ----

  static async listForViewer(
    viewer: StaffViewer,
    options: { limit?: number; oldestFirst?: boolean } = {},
    now: Date = new Date()
  ): Promise<StaffNotificationView[]> {
    await connectDB();
    const docs = await StaffNotificationModel.find(viewerFilter(viewer))
      .sort({ createdAt: options.oldestFirst ? 1 : -1 })
      .limit(options.limit ?? 50)
      .lean<IStaffNotification[]>();
    return docs.map((d) => toView(d, now));
  }

  static async countForViewer(viewer: StaffViewer): Promise<number> {
    await connectDB();
    return StaffNotificationModel.countDocuments(viewerFilter(viewer));
  }

  /** Acknowledge one item. Only an item the viewer can see can be acknowledged. */
  static async acknowledge(
    id: string,
    viewer: StaffViewer,
    now: Date = new Date()
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    await connectDB();
    const updated = await StaffNotificationModel.findOneAndUpdate(
      { _id: id, ...viewerFilter(viewer) },
      { $set: { acknowledgedAt: now, acknowledgedBy: viewer.id } }
    );
    return Boolean(updated);
  }

  static async acknowledgeAll(
    viewer: StaffViewer,
    now: Date = new Date()
  ): Promise<number> {
    await connectDB();
    const result = await StaffNotificationModel.updateMany(
      viewerFilter(viewer),
      { $set: { acknowledgedAt: now, acknowledgedBy: viewer.id } }
    );
    return result.modifiedCount ?? 0;
  }

  /** REQ-DASH-004 — opening the linked item acknowledges it. */
  static async acknowledgeByRef(
    refId: string,
    viewer: StaffViewer,
    now: Date = new Date()
  ): Promise<number> {
    await connectDB();
    const result = await StaffNotificationModel.updateMany(
      { refId, ...viewerFilter(viewer) },
      { $set: { acknowledgedAt: now, acknowledgedBy: viewer.id } }
    );
    return result.modifiedCount ?? 0;
  }

  // ---- escalation (REQ-WA-014) ----

  /**
   * Walk the unacknowledged notifications and send each due WhatsApp level
   * once. A level is claimed with an atomic conditional update before any
   * message is sent, so a second app instance (or a retried tick) cannot
   * double-send. Never throws.
   */
  static async runEscalation(
    now: Date = new Date()
  ): Promise<{ checked: number; sent: number }> {
    let sent = 0;
    let checked = 0;
    try {
      await connectDB();
      const pending = await StaffNotificationModel.find({
        acknowledgedAt: null,
        escalationLevel: { $lt: 2 },
      })
        .sort({ createdAt: 1 })
        .limit(ESCALATION_BATCH)
        .lean<IStaffNotification[]>();
      checked = pending.length;
      if (pending.length === 0) return { checked, sent };

      const rules = await this.getRules();
      const staff = await this.loadRecipientCandidates();
      const hhmm = getCurrentBusinessHHMM(now);

      for (const n of pending) {
        const rule = rules[n.type] ?? DEFAULT_STAFF_ALERT_RULES[n.type];
        const levels = dueLevels({
          currentLevel: n.escalationLevel,
          elapsedMinutes: minutesWaiting(new Date(n.createdAt), now),
          rule,
          inQuietHours: isInQuietHours(rule.quietHours, hhmm),
        });
        for (const level of levels) {
          const claimed = await StaffNotificationModel.findOneAndUpdate(
            {
              _id: n._id,
              acknowledgedAt: null,
              escalationLevel: { $lt: level },
            },
            { $set: { escalationLevel: level, lastAlertAt: now } }
          );
          if (!claimed) break; // acknowledged meanwhile, or another instance has it
          const minutes = minutesWaiting(new Date(n.createdAt), now);
          for (const recipient of resolveRecipients(level, rule, staff)) {
            if (await this.sendAlert(recipient, n, minutes)) sent += 1;
          }
        }
      }
    } catch (error) {
      console.error('[StaffNotification] escalation run failed:', error);
    }
    return { checked, sent };
  }

  private static async loadRecipientCandidates(): Promise<
    AlertRecipientCandidate[]
  > {
    const users = await UserModel.find({
      roles: { $in: [...STAFF_ROLES] },
      alertPhoneVerified: true,
      alertPhone: { $exists: true, $ne: '' },
    })
      .select('roles alertPhone alertPhoneVerified alertsEnabled onShift')
      .lean<
        Array<{
          _id: unknown;
          roles?: string[];
          alertPhone?: string;
          alertPhoneVerified?: boolean;
          alertsEnabled?: boolean;
          onShift?: boolean;
        }>
      >();
    return users.map((u) => ({
      id: String(u._id),
      roles: u.roles ?? [],
      alertPhone: u.alertPhone,
      alertPhoneVerified: u.alertPhoneVerified,
      alertsEnabled: u.alertsEnabled,
      onShift: u.onShift,
    }));
  }

  /** Send one `staff_alert` and record it. Returns true on a successful send. */
  private static async sendAlert(
    recipient: AlertRecipientCandidate,
    n: IStaffNotification,
    minutes: number
  ): Promise<boolean> {
    const params = staffAlertParams({
      label: STAFF_ALERT_LABELS[n.type],
      reference: n.reference,
      minutesWaiting: minutes,
      path: staffAlertPath(n.type, n.refId),
    });
    const started = Date.now();
    try {
      const result = await WhatsAppService.sendMessage(
        recipient.alertPhone as string,
        'staff_alert',
        params
      );
      await NotificationLogService.recordAttempt({
        templateKey: 'staff_alert',
        userId: recipient.id,
        channel: 'whatsapp',
        success: result.success,
        messageId: result.messageId ?? null,
        failureReason: result.success ? null : (result.message ?? null),
        errorCode: result.success ? null : (result.errorCode ?? null),
        templateParams: {
          header: params.headerParams ?? [],
          body: params.bodyParams,
          buttons: params.buttonParams ?? [],
          mode: 'template',
        },
        durationMs: Date.now() - started,
      });
      return result.success;
    } catch (error) {
      console.error('[StaffNotification] staff_alert send failed:', error);
      return false;
    }
  }
}
