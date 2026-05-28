/**
 * @requirement REQ-049 — Webhook idempotency guard (#117 P0 #1)
 *
 * Per-delivery record of payment-webhook events from Paystack + Monnify.
 * The compound unique index on `(provider, eventId)` is the load-bearing
 * dedup control: the duplicate-key error (MongoDB code 11000) is what
 * makes `recordWebhookEvent` (lib/webhook-idempotency.ts) race-safe across
 * concurrent deliveries — a read-then-write check would have a TOCTOU
 * window in which two simultaneous replays could both pass.
 */
import { Schema, model, models } from 'mongoose';
import type { IProcessedWebhookEvent } from '../interfaces/processed-webhook-event.interface';

const processedWebhookEventSchema = new Schema<IProcessedWebhookEvent>(
  {
    provider: {
      type: String,
      enum: ['paystack', 'monnify'],
      required: true,
    },
    eventId: { type: String, required: true },
    paymentReference: { type: String },
    eventType: { type: String },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index — the dedup control. DO NOT remove or relax to
// non-unique without re-thinking the idempotency strategy in
// lib/webhook-idempotency.ts.
processedWebhookEventSchema.index(
  { provider: 1, eventId: 1 },
  { unique: true }
);

const ProcessedWebhookEventModel =
  models.ProcessedWebhookEvent ||
  model<IProcessedWebhookEvent>(
    'ProcessedWebhookEvent',
    processedWebhookEventSchema
  );

export default ProcessedWebhookEventModel;
