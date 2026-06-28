/**
 * @requirement REQ-066 — Persistent silent-fail audit log
 * @requirement REQ-088 — Extended with points/notification/reward/webhook kinds
 *
 * The pattern the codebase has repeatedly fallen into: a try/catch that
 * swallows a load-bearing side-effect and emits a `console.error`. The
 * error is technically logged but nobody is watching for it.
 *
 * IncidentEventModel is the persistent surface: every catch site that
 * was load-bearing writes a row here instead of (or in addition to) the
 * console log. The `/dashboard/incidents` UI surfaces them for staff.
 *
 * Companion to REQ-055's NotificationLog: NotificationLog is the
 * happy-path audit ("we tried to send X via channel Y, here's the
 * outcome"). IncidentEvent is the unhappy-path audit ("Y threw or
 * stayed in a bad state, here's what we know").
 *
 * Kinds:
 *   - `inventory_deduction_failed` — `deductStockForOrder` threw at the
 *     kitchen-completion site. Order still flips to `completed`; the
 *     reconciliation cron retries the deduction.
 *   - `stale_paid_order` — a paid order has sat outside
 *     completed/cancelled for longer than the configured threshold.
 *     Visibility-only; no automated remediation.
 *   - `points_award_failed` — points award or reversal threw inside a
 *     catch site that previously swallowed the error.
 *   - `notification_delivery_failed` — NotificationLog persistence or
 *     notification send path failed in a non-recoverable way.
 *   - `reward_grant_failed` — reward calculation or grant threw inside
 *     a webhook or admin action catch site.
 *   - `webhook_replay_mismatch` — a webhook replay produced a state
 *     mismatch (e.g. duplicate side-effect detected after the fact).
 */
import { Schema, model, models, type Model, type Document } from 'mongoose';

export type IncidentEventKind =
  | 'inventory_deduction_failed'
  | 'stale_paid_order'
  | 'points_award_failed'
  | 'notification_delivery_failed'
  | 'reward_grant_failed'
  | 'webhook_replay_mismatch';

export interface IIncidentEvent extends Document {
  kind: IncidentEventKind;
  entityId: string;
  summary: string;
  errorDetails: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const incidentEventSchema = new Schema<IIncidentEvent>(
  {
    kind: {
      type: String,
      enum: [
        'inventory_deduction_failed',
        'stale_paid_order',
        'points_award_failed',
        'notification_delivery_failed',
        'reward_grant_failed',
        'webhook_replay_mismatch',
      ],
      required: true,
    },
    entityId: { type: String, required: true },
    summary: { type: String, required: true },
    errorDetails: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

incidentEventSchema.index({ kind: 1, createdAt: -1 });
incidentEventSchema.index({ entityId: 1, createdAt: -1 });

const IncidentEventModel: Model<IIncidentEvent> =
  (models.IncidentEvent as Model<IIncidentEvent>) ||
  model<IIncidentEvent>('IncidentEvent', incidentEventSchema);

export default IncidentEventModel;
