/**
 * @requirement REQ-066 — Persistent silent-fail audit log
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
 * Initial kinds:
 *   - `inventory_deduction_failed` — `deductStockForOrder` threw at the
 *     kitchen-completion site. Order still flips to `completed`; the
 *     reconciliation cron retries the deduction.
 *   - `stale_paid_order` — a paid order has sat outside
 *     completed/cancelled for longer than the configured threshold.
 *     Visibility-only; no automated remediation.
 *
 * Future REQs add more `kind`s as other catch sites get migrated off
 * `console.error`.
 */
import { Schema, model, models, type Model, type Document } from 'mongoose';

export type IncidentEventKind =
  | 'inventory_deduction_failed'
  | 'stale_paid_order';

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
      enum: ['inventory_deduction_failed', 'stale_paid_order'],
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
