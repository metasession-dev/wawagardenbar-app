/**
 * @requirement REQ-035 — first-class payment-method enum exports.
 *
 * Extracted from inline string-literal arrays previously duplicated in
 * `models/order-model.ts`, `models/tab-model.ts`, and three sites in
 * `services/financial-report-service.ts`. Single source of truth so the
 * tip-recording feature (and future work) cannot drift between layers.
 *
 * Two enums:
 *  - PAYMENT_METHODS_FULL: every method the Order model recognises.
 *  - PAYMENT_METHODS_EXPRESS: the subset the Express + Tab partial-payment
 *    surfaces accept (no `ussd` / `phone` — those are customer-checkout-only).
 */

export const PAYMENT_METHODS_FULL = [
  'cash',
  'card',
  'transfer',
  'ussd',
  'phone',
] as const;

export const PAYMENT_METHODS_EXPRESS = ['cash', 'card', 'transfer'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS_FULL)[number];

export type PaymentMethodExpress = (typeof PAYMENT_METHODS_EXPRESS)[number];

/**
 * Used by the Daily Financial Report's `paymentBreakdown` and
 * `tipsBreakdown`. `unspecified` catches legacy rows that had no method
 * recorded.
 */
export const PAYMENT_BREAKDOWN_KEYS = [
  ...PAYMENT_METHODS_FULL,
  'unspecified',
] as const;

export type PaymentBreakdownKey = (typeof PAYMENT_BREAKDOWN_KEYS)[number];
