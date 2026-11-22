/**
 * @requirement REQ-ORDMGT-020 — Delivery order status steps (REQ-124, AC7)
 *
 * The one transition table for staff status changes, shared by
 * `updateOrderStatusAction` and the order card / order sidebar so the server
 * and the buttons cannot disagree. `confirmed` is set by payment, not by staff.
 * `out-for-delivery` and `delivered` exist only for delivery orders.
 */

const BASE: Record<string, string[]> = {
  pending: ['preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const DELIVERY: Record<string, string[]> = {
  ready: ['out-for-delivery', 'completed', 'cancelled'],
  'out-for-delivery': ['delivered', 'cancelled'],
  delivered: ['completed'],
};

/** The statuses staff may move an order to next. */
export function allowedNextStatuses(
  status: string,
  orderType: string | undefined | null
): string[] {
  if (orderType === 'delivery' && DELIVERY[status]) return DELIVERY[status];
  return BASE[status] ?? [];
}

export function canTransition(
  status: string,
  orderType: string | undefined | null,
  next: string
): boolean {
  return allowedNextStatuses(status, orderType).includes(next);
}

/** Statuses an order is still being worked in: the dashboard Active tab. */
export const ACTIVE_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out-for-delivery',
  'delivered',
] as const;
