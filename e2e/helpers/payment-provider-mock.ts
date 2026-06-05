/**
 * @requirement REQ-069 — Payments + webhooks E2E coverage (sub-issue #294)
 *
 * Provider event-payload builders. Each builder returns the JSON shape the
 * matching webhook route handler expects, so a spec can:
 *
 *   const payload = buildPaystackChargeSuccess({ reference, amount });
 *   const signature = signPaystackPayload(payload, secret);
 *   await sendWebhook({ ..., rawBody: JSON.stringify(payload), signature });
 *
 * Payload shapes derived from the existing unit tests:
 *   - `__tests__/api/webhooks/paystack-idempotency.test.ts`
 *   - `__tests__/api/webhooks/monnify-idempotency.test.ts`
 *
 * Keeping them tied to the unit-test shape means if the route handler grows
 * a new required field, BOTH the unit + e2e tests fail at once and one fix
 * lands both layers in lockstep.
 */

export interface PaystackChargeSuccessOpts {
  reference: string;
  amount?: number; // kobo (= NGN × 100)
  eventId?: number; // optional override for idempotency tests
  paidAt?: string;
  channel?: string;
}

export function buildPaystackChargeSuccess(
  opts: PaystackChargeSuccessOpts
): Record<string, unknown> {
  return {
    event: 'charge.success',
    data: {
      id: opts.eventId ?? Math.floor(Math.random() * 1e10),
      reference: opts.reference,
      status: 'success',
      amount: opts.amount ?? 500000, // ₦5,000 in kobo
      channel: opts.channel ?? 'card',
      paid_at: opts.paidAt ?? new Date().toISOString(),
    },
  };
}

export interface PaystackChargeFailedOpts {
  reference: string;
  eventId?: number;
}

export function buildPaystackChargeFailed(
  opts: PaystackChargeFailedOpts
): Record<string, unknown> {
  return {
    event: 'charge.failed',
    data: {
      id: opts.eventId ?? Math.floor(Math.random() * 1e10),
      reference: opts.reference,
      status: 'failed',
      amount: 0,
    },
  };
}

export type MonnifyPaymentStatus =
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'PARTIALLY_PAID'
  | 'EXPIRED'
  | 'OVERPAID';

export interface MonnifyEventOpts {
  paymentReference: string;
  transactionReference?: string;
  amount?: number; // NGN
  paymentStatus?: MonnifyPaymentStatus;
  paidOn?: string;
  paymentMethod?: 'CARD' | 'ACCOUNT_TRANSFER' | 'USSD' | 'PHONE_NUMBER';
  eventType?: string;
}

export function buildMonnifyEvent(
  opts: MonnifyEventOpts
): Record<string, unknown> {
  const status = opts.paymentStatus ?? 'PAID';
  const amount = opts.amount ?? 7500;
  const txnRef = opts.transactionReference ?? `mny-txn-${Date.now()}`;
  return {
    eventType: opts.eventType ?? 'SUCCESSFUL_TRANSACTION',
    eventData: {
      transactionReference: txnRef,
      paymentReference: opts.paymentReference,
      amountPaid: String(amount),
      totalPayable: String(amount),
      settlementAmount: String(amount),
      paidOn: opts.paidOn ?? new Date().toISOString(),
      paymentStatus: status,
      paymentDescription: 'E2E synthetic webhook',
      transactionHash: `hash-${txnRef}`,
      currency: 'NGN',
      paymentMethod: opts.paymentMethod ?? 'CARD',
      product: { type: 'WEB_SDK', reference: opts.paymentReference },
    },
  };
}
