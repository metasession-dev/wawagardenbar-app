/**
 * @requirement REQ-055 — NotificationLog persistent audit log
 *
 * Two static methods backing the audit trail:
 *
 *   - recordAttempt(): writes a row on every outbound send attempt.
 *     Non-blocking — persistence errors are console.error'd and never
 *     re-thrown. Caller (REQ-054's NotificationService.send →
 *     logAttempt) doesn't need to await defensively; the send path
 *     stays unblocked.
 *
 *   - updateStatus(): updates an existing row when Meta's delivery-
 *     status webhook fires. Monotonic — status only moves forward
 *     through the lifecycle (queued → sent → delivered → read).
 *     `failed` is terminal and never overwritten.
 *
 * The webhook route (`app/api/webhooks/whatsapp/route.ts`) verifies
 * Meta's x-hub-signature-256 before any of this fires, so the
 * messageId reaching this service is from a verified Meta payload.
 */
import { connectDB } from '@/lib/mongodb';
import NotificationLogModel, {
  NOTIFICATION_LOG_STATUS_ORDER,
  type NotificationLogChannel,
  type NotificationLogStatus,
} from '@/models/notification-log-model';

export interface RecordAttemptInput {
  templateKey: string;
  userId: string | null;
  channel: NotificationLogChannel;
  success: boolean;
  messageId?: string | null;
  failureReason?: string | null;
  durationMs?: number | null;
}

export class NotificationLogService {
  /**
   * Persist a single send-attempt row. Returns the new doc's id on
   * success, `null` on persistence failure. Persistence failures are
   * logged via console.error and NEVER re-thrown — the caller (the
   * send path) must continue regardless.
   */
  static async recordAttempt(
    input: RecordAttemptInput
  ): Promise<string | null> {
    try {
      await connectDB();
      const doc = await NotificationLogModel.create({
        templateKey: input.templateKey,
        userId: input.userId,
        channel: input.channel,
        success: input.success,
        messageId: input.messageId ?? null,
        // Initial status: for a successful send the row starts at
        // 'sent'; for a failed send it goes straight to 'failed'.
        // Webhook callbacks later advance 'sent' through 'delivered'
        // and 'read' for the WhatsApp channel.
        status: input.success ? 'sent' : 'failed',
        failureReason: input.failureReason ?? null,
        durationMs: input.durationMs ?? null,
      });
      return doc._id.toString();
    } catch (error) {
      // Swallow + log. The send path must not break because audit
      // logging fell over.
      console.error(
        '[NotificationLog] recordAttempt failed:',
        error instanceof Error ? error.message : String(error)
      );
      try {
        const { IncidentEventService } = await import(
          '@/services/incident-event-service'
        );
        await IncidentEventService.recordIncident({
          kind: 'notification_delivery_failed',
          entityId: input.userId ?? 'unknown',
          summary: `NotificationLog recordAttempt failed for template ${input.templateKey}`,
          errorDetails: {
            message: error instanceof Error ? error.message : String(error),
            templateKey: input.templateKey,
            channel: input.channel,
          },
        });
      } catch {
        // IncidentEvent write failure must not propagate
      }
      return null;
    }
  }

  /**
   * Update an existing row's status. Used by Meta's delivery-status
   * webhook callbacks (sent → delivered → read → failed).
   *
   * **Monotonic gate**: the update only applies when the doc's
   * current status is at or before the new status's position in the
   * lifecycle. Prevents stale events from rolling back a more recent
   * state and prevents subsequent events from overwriting `failed`.
   *
   * Returns `true` if a row was updated, `false` if no match was
   * found (unknown messageId OR the doc was already at a later
   * state).
   */
  static async updateStatus(
    messageId: string,
    status: NotificationLogStatus,
    failureReason: string | null = null
  ): Promise<boolean> {
    try {
      await connectDB();
      // Permissible source states = anything STRICTLY earlier in the
      // lifecycle. `failed` (terminal) is never a valid source, and
      // the target status itself is excluded so we don't re-tick the
      // same state.
      const targetPosition = NOTIFICATION_LOG_STATUS_ORDER[status];
      const permissibleSources = Object.entries(NOTIFICATION_LOG_STATUS_ORDER)
        .filter(([s, pos]) => pos < targetPosition && s !== 'failed')
        .map(([s]) => s);

      const updated = await NotificationLogModel.findOneAndUpdate(
        {
          messageId,
          status: { $in: permissibleSources },
        },
        {
          $set: {
            status,
            ...(failureReason !== null ? { failureReason } : {}),
          },
        },
        { new: true }
      );

      if (!updated) {
        // No-match is common when:
        //   (a) the messageId is from a different deployment / WABA
        //   (b) the doc is already at a later state (monotonic gate)
        //   (c) the doc is at 'failed' (terminal)
        // All are expected. Warn so ops can spot patterns; don't
        // throw.
        console.warn(
          `[NotificationLog] updateStatus no-match: messageId=${messageId} status=${status}`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error(
        '[NotificationLog] updateStatus failed:',
        error instanceof Error ? error.message : String(error)
      );
      try {
        const { IncidentEventService } = await import(
          '@/services/incident-event-service'
        );
        await IncidentEventService.recordIncident({
          kind: 'notification_delivery_failed',
          entityId: messageId,
          summary: `NotificationLog updateStatus failed for messageId ${messageId}`,
          errorDetails: {
            message: error instanceof Error ? error.message : String(error),
            messageId,
            status,
          },
        });
      } catch {
        // IncidentEvent write failure must not propagate
      }
      return false;
    }
  }
}
