/**
 * @requirement REQ-049 — Webhook idempotency guard (#117 P0 #1)
 *
 * Records a payment-webhook delivery's provider event-id with a unique-index
 * dedup. Returns `'new'` on first delivery, `'duplicate'` on replay. The
 * compound unique index on `(provider, eventId)` in
 * `models/processed-webhook-event-model.ts` is the load-bearing control: the
 * duplicate-key error (MongoDB code 11000) is what makes this race-safe
 * across concurrent deliveries — read-then-write would have a TOCTOU window.
 *
 * Callers are expected to:
 *   1. Verify the provider's HMAC signature on the raw body BEFORE calling
 *      this — otherwise an attacker could pre-populate the dedup table.
 *   2. Filter out side-effect-free events (e.g. Paystack's non-`charge.success`)
 *      BEFORE calling this — recording deliveries we don't act on bloats the
 *      table without buying any safety.
 *   3. On `'duplicate'`, return HTTP 200 immediately. Do NOT run side-effects.
 */
import ProcessedWebhookEventModel from '@/models/processed-webhook-event-model';
import type { WebhookProvider } from '@/interfaces/processed-webhook-event.interface';

interface RecordWebhookEventParams {
  provider: WebhookProvider;
  eventId: string;
  paymentReference?: string;
  eventType?: string;
}

export type RecordWebhookEventResult = 'new' | 'duplicate';

const MONGODB_DUPLICATE_KEY_ERROR = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === MONGODB_DUPLICATE_KEY_ERROR
  );
}

export async function recordWebhookEvent(
  params: RecordWebhookEventParams
): Promise<RecordWebhookEventResult> {
  try {
    await ProcessedWebhookEventModel.create({
      provider: params.provider,
      eventId: params.eventId,
      paymentReference: params.paymentReference,
      eventType: params.eventType,
      receivedAt: new Date(),
    });
    return 'new';
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Replay of a previously-processed event, or the race-loser in a
      // concurrent delivery — both correctly resolve to no-op at the caller.
      return 'duplicate';
    }
    // Anything else (connection failure, validation error, …) is unexpected;
    // propagate so the caller's outer try/catch becomes a 500. Better to
    // surface DB issues than silently re-run side-effects.
    throw error;
  }
}
