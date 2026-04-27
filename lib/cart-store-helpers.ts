/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure helpers for cart-store actions. Extracted out of stores/cart-store.ts so
 * the logic can be unit-tested without zustand or localStorage. The store
 * delegates to these helpers in addItem and getTotalPrice.
 *
 * Cart storage convention (preserved from pre-REQ-031):
 *   - item.price is the *portion-adjusted base price* (e.g. half-Poundo = 1000)
 *   - item.portionMultiplier is the multiplier already applied to price
 *   - item.customizations[*].price is the *unadjusted* menu surcharge so the
 *     order document records the menu-defined price, not a derived one.
 *
 * Therefore line total =
 *   (item.price + Σ customization.price × portionMultiplier) × quantity
 * which simplifies to
 *   (basePrice + Σ surcharge) × quantity × portionMultiplier
 * matching the REQ-031 D6 contract.
 */

import type { SelectedCustomization } from './customization-validation';

export type CartItemCandidate = {
  id: string;
  name: string;
  price: number;
  portionSize?: 'full' | 'half' | 'quarter';
  portionMultiplier?: number;
  image?: string;
  category: string;
  specialInstructions?: string;
  preparationTime: number;
  allowManualPriceOverride?: boolean;
  customizations?: SelectedCustomization[];
  quantity?: number;
};

export type CartItem = CartItemCandidate & {
  cartItemId: string;
  quantity: number;
};

export function computeCartItemMergeKey(item: {
  id: string;
  portionSize?: string;
  specialInstructions?: string;
  customizations?: SelectedCustomization[];
}): string {
  const portion = item.portionSize ?? 'full';
  const instr = item.specialInstructions ?? '';
  const sortedCustom = [...(item.customizations ?? [])]
    .sort((a, b) =>
      `${a.name}|${a.option}`.localeCompare(`${b.name}|${b.option}`)
    )
    .map((c) => `${c.name}:${c.option}:${c.price}`)
    .join(',');
  return `${item.id}|${portion}|${instr}|${sortedCustom}`;
}

function inferMultiplier(portionSize?: string): number {
  if (portionSize === 'half') return 0.5;
  if (portionSize === 'quarter') return 0.25;
  return 1.0;
}

export function addItemToCartItems(
  items: CartItem[],
  candidate: CartItemCandidate,
  newCartItemId: string
): CartItem[] {
  const candidateKey = computeCartItemMergeKey(candidate);
  const existingIndex = items.findIndex(
    (i) => computeCartItemMergeKey(i) === candidateKey
  );
  const addQty = candidate.quantity ?? 1;

  if (existingIndex >= 0) {
    return items.map((item, i) =>
      i === existingIndex ? { ...item, quantity: item.quantity + addQty } : item
    );
  }

  const portionSize = candidate.portionSize ?? 'full';
  return [
    ...items,
    {
      ...candidate,
      cartItemId: newCartItemId,
      quantity: addQty,
      portionSize,
      portionMultiplier:
        candidate.portionMultiplier ?? inferMultiplier(portionSize),
    },
  ];
}

export function computeCartItemTotal(item: CartItem): number {
  const surcharge = (item.customizations ?? []).reduce(
    (s, c) => s + (typeof c.price === 'number' ? c.price : 0),
    0
  );
  const multiplier = item.portionMultiplier ?? 1;
  // item.price is already (basePrice × multiplier); surcharge needs the same scaling
  return Math.round((item.price + surcharge * multiplier) * item.quantity);
}

export function computeCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + computeCartItemTotal(item), 0);
}
