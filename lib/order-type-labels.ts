/**
 * Display labels for the OrderType enum.
 *
 * The model enum uses developer-friendly slugs (`dine-in`, `pickup`,
 * `delivery`, `pay-now`); the reports / dashboard surfaces operators
 * read use restaurant-friendly labels. Keep this map as the single
 * source of truth so the same wording appears everywhere a per-type
 * breakdown is rendered.
 *
 * The order in `ORDER_TYPE_DISPLAY_ORDER` is the canonical display
 * order — keep it consistent across tables/cards so operators can
 * compare two reports at a glance.
 */
import type { OrderType } from '@/interfaces/order.interface';

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  'dine-in': 'Sit-in',
  delivery: 'Takeaway',
  pickup: 'Pickup',
  'pay-now': 'Pay-now',
};

export const ORDER_TYPE_DISPLAY_ORDER: readonly OrderType[] = [
  'dine-in',
  'delivery',
  'pickup',
  'pay-now',
] as const;

/**
 * Empty record initialiser keyed by every enum value, with 0 / null
 * values. Use this to seed report buckets so iteration order is stable
 * and every type has a row even when the period has no orders of that
 * type.
 */
export function emptyByOrderType<T extends number>(
  zero: T
): Record<OrderType, T> {
  return {
    'dine-in': zero,
    delivery: zero,
    pickup: zero,
    'pay-now': zero,
  };
}
