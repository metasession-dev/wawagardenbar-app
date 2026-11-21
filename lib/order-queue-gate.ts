/**
 * @requirement REQ-123 (AC5, REQ-KITCHEN-009, ADR-012) — the paid-only kitchen gate.
 *
 * One predicate for every live queue (kitchen, kitchen display, dashboard
 * orders, active orders): staff-created orders (express, tab, counter) are
 * always listed; a customer order is listed only once Paystack has confirmed
 * payment. An unpaid customer order is visible only through the "Awaiting
 * payment" filter on `/dashboard/orders`.
 *
 * `origin` defaults to 'staff' on the model (REQ-120), so the gate tests
 * `origin != 'customer'`, which also covers any document written before the
 * field existed.
 */
export const LIVE_QUEUE_GATE = {
  $or: [{ origin: { $ne: 'customer' } }, { paymentStatus: 'paid' }],
} as const;

/** Unpaid customer orders: waiting for payment, or expired without it. */
export const AWAITING_PAYMENT_QUERY = {
  origin: 'customer',
  paymentStatus: { $ne: 'paid' },
  status: { $in: ['pending', 'cancelled'] },
} as const;

/** Minutes an unpaid customer order may wait before the expiry job cancels it. */
export const UNPAID_ORDER_EXPIRY_MINUTES = 30;

/** Minutes after creation when the abandoned-payment `payment_link` is sent. */
export const PAYMENT_LINK_DELAY_MINUTES = 5;
