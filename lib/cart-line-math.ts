/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure cart-line-total helper. Single source of truth for the surcharge-aware
 * line math used by:
 *   - the cart store (subtotal display)
 *   - the checkout Order Summary sidebar
 *   - server-side total recomputation in `expressCreateOrderAction`,
 *     `updateOrderItemsAction`, and `POST /api/public/orders`
 *
 * Math contract:
 *   lineTotal = (basePrice + Σ option.price) × quantity × portionMultiplier
 *
 * Surcharge scales with portionMultiplier (Option B per the implementation
 * plan): half-Poundo deducts half-Egusi (REQ-030) and bills half-Egusi (this
 * REQ). Final total is rounded to the nearest naira (Math.round, round-half-up).
 */

import type { SelectedCustomization } from './customization-validation';

export type ComputeLineTotalParams = {
  basePrice: number;
  customizations?: SelectedCustomization[];
  quantity: number;
  portionMultiplier?: number;
};

export function computeLineTotal({
  basePrice,
  customizations,
  quantity,
  portionMultiplier,
}: ComputeLineTotalParams): number {
  const surcharge = (customizations ?? []).reduce(
    (sum, c) => sum + (typeof c.price === 'number' ? c.price : 0),
    0
  );
  const multiplier =
    typeof portionMultiplier === 'number' ? portionMultiplier : 1;
  const raw = (basePrice + surcharge) * quantity * multiplier;
  return Math.round(raw);
}
