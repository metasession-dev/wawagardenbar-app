/**
 * @requirement REQ-049 — Webhook idempotency guard (#117 P0 #1)
 */
import type { Types } from 'mongoose';

export type WebhookProvider = 'paystack' | 'monnify';

export interface IProcessedWebhookEvent {
  _id: Types.ObjectId;
  provider: WebhookProvider;
  eventId: string;
  paymentReference?: string;
  eventType?: string;
  receivedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
