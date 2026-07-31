/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 * @requirement REQ-097 - Fix half/quarter portion pricing (flat portion-option surcharge)
 *
 * Pure cart-line-total helper. Single source of truth for the surcharge-aware
 * line math used by:
 *   - the cart store (subtotal display)
 *   - the checkout Order Summary sidebar
 *   - server-side total recomputation in `expressCreateOrderAction`,
 *     `updateOrderItemsAction`, and `POST /api/public/orders`
 *
 * Math contract:
 *   lineTotal = ((basePrice + Σ option.price) × portionMultiplier + portionSurcharge) × quantity
 *
 * Customization-option surcharge scales with portionMultiplier (Option B per
 * the implementation plan): half-Poundo deducts half-Egusi (REQ-030) and
 * bills half-Egusi (this REQ). `portionSurcharge` (REQ-097) is different: the
 * flat, editor-configured fee for choosing Half/Quarter Portion itself — it
 * is NOT fractioned by portionMultiplier (it's already the adjustment for
 * the smaller portion), but it does scale with quantity like everything
 * else in the line. Final total is rounded to the nearest naira (Math.round,
 * round-half-up).
 */

import type { SelectedCustomization } from './customization-validation';

export type ComputeLineTotalParams = {
  basePrice: number;
  customizations?: SelectedCustomization[];
  quantity: number;
  portionMultiplier?: number;
  /** REQ-097: flat portion-size surcharge (e.g. `halfPortionSurcharge`) — added after the multiplier, not fractioned by it. */
  portionSurcharge?: number;
};

export function computeLineTotal({
  basePrice,
  customizations,
  quantity,
  portionMultiplier,
  portionSurcharge,
}: ComputeLineTotalParams): number {
  const customizationSurcharge = (customizations ?? []).reduce(
    (sum, c) => sum + (typeof c.price === 'number' ? c.price : 0),
    0
  );
  const multiplier =
    typeof portionMultiplier === 'number' ? portionMultiplier : 1;
  const flatSurcharge =
    typeof portionSurcharge === 'number' ? portionSurcharge : 0;
  const raw =
    ((basePrice + customizationSurcharge) * multiplier + flatSurcharge) *
    quantity;
  return Math.round(raw);
}
