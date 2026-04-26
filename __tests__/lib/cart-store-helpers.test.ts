/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure-helper tests for cart-store actions. Extracts the dedupe / merge / total
 * logic out of the zustand store so it can be unit-tested without
 * localStorage or persist middleware. The store calls these helpers in its
 * actions; behaviour is identical, just testable.
 *
 * Cart storage convention (from existing code, preserved by REQ-031):
 *   - item.price is the *portion-adjusted base price* (e.g. half-Poundo = 1000)
 *   - item.portionMultiplier is the multiplier already applied to price
 *   - item.customizations[*].price is the *unadjusted* menu surcharge
 *     (so the order document records the menu-defined price, not a derived one)
 *
 * Therefore line total = (item.price + Σ customization.price × portionMultiplier) × quantity
 *   ≡ (base × multiplier + Σ surcharge × multiplier) × quantity
 *   ≡ (base + Σ surcharge) × multiplier × quantity      ← matches REQ-031 D6
 */
import { describe, it, expect } from 'vitest';
import {
  computeCartItemMergeKey,
  addItemToCartItems,
  computeCartItemTotal,
  computeCartTotal,
  type CartItem,
  type CartItemCandidate,
} from '@/lib/cart-store-helpers';

const POUNDO_ID = 'menu_poundo_001';
const FRIES_ID = 'menu_fries_002';

const POUNDO_FULL_NO_CUSTOM: CartItemCandidate = {
  id: POUNDO_ID,
  name: 'Poundo',
  price: 2000,
  portionSize: 'full',
  portionMultiplier: 1,
  category: 'food',
  preparationTime: 15,
};

describe('REQ-031: computeCartItemMergeKey', () => {
  it('legacy items with no customizations merge by (id, portion, instructions)', () => {
    const a = computeCartItemMergeKey(POUNDO_FULL_NO_CUSTOM);
    const b = computeCartItemMergeKey({ ...POUNDO_FULL_NO_CUSTOM });
    expect(a).toBe(b);
  });

  it('different items get different merge keys', () => {
    const a = computeCartItemMergeKey(POUNDO_FULL_NO_CUSTOM);
    const b = computeCartItemMergeKey({
      ...POUNDO_FULL_NO_CUSTOM,
      id: FRIES_ID,
    });
    expect(a).not.toBe(b);
  });

  it('same item, different customizations get DIFFERENT merge keys (AC4 second-line)', () => {
    const ogbono = computeCartItemMergeKey({
      ...POUNDO_FULL_NO_CUSTOM,
      customizations: [{ name: 'Soup', option: 'Ogbono', price: 0 }],
    });
    const egusi = computeCartItemMergeKey({
      ...POUNDO_FULL_NO_CUSTOM,
      customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
    });
    expect(ogbono).not.toBe(egusi);
  });

  it('same item, same customizations in different array order get the SAME merge key', () => {
    const ab = computeCartItemMergeKey({
      ...POUNDO_FULL_NO_CUSTOM,
      customizations: [
        { name: 'Soup', option: 'Egusi', price: 500 },
        { name: 'Drink', option: 'Coke', price: 200 },
      ],
    });
    const ba = computeCartItemMergeKey({
      ...POUNDO_FULL_NO_CUSTOM,
      customizations: [
        { name: 'Drink', option: 'Coke', price: 200 },
        { name: 'Soup', option: 'Egusi', price: 500 },
      ],
    });
    expect(ab).toBe(ba);
  });
});

describe('REQ-031: addItemToCartItems', () => {
  it('adds a new item to an empty cart', () => {
    const result = addItemToCartItems([], POUNDO_FULL_NO_CUSTOM, 'cart_001');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      cartItemId: 'cart_001',
      quantity: 1,
      id: POUNDO_ID,
    });
  });

  it('merges quantity when adding same legacy item again (AC8 legacy-safe)', () => {
    const initial = addItemToCartItems([], POUNDO_FULL_NO_CUSTOM, 'cart_001');
    const result = addItemToCartItems(
      initial,
      POUNDO_FULL_NO_CUSTOM,
      'cart_002'
    );
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2);
    expect(result[0].cartItemId).toBe('cart_001'); // original line preserved
  });

  it('creates a SEPARATE line when same item ordered with different customizations', () => {
    const ogbono = addItemToCartItems(
      [],
      {
        ...POUNDO_FULL_NO_CUSTOM,
        customizations: [{ name: 'Soup', option: 'Ogbono', price: 0 }],
      },
      'cart_001'
    );
    const result = addItemToCartItems(
      ogbono,
      {
        ...POUNDO_FULL_NO_CUSTOM,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
      'cart_002'
    );
    expect(result).toHaveLength(2);
    expect(result[0].quantity).toBe(1);
    expect(result[1].quantity).toBe(1);
    expect(result[0].customizations?.[0].option).toBe('Ogbono');
    expect(result[1].customizations?.[0].option).toBe('Egusi');
  });

  it('preserves customizations on the cart line for downstream checkout', () => {
    const result = addItemToCartItems(
      [],
      {
        ...POUNDO_FULL_NO_CUSTOM,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
      'cart_001'
    );
    expect(result[0].customizations).toEqual([
      { name: 'Soup', option: 'Egusi', price: 500 },
    ]);
  });
});

describe('REQ-031: computeCartItemTotal (per-line)', () => {
  it('legacy item: price × quantity (matches today, AC8)', () => {
    const item: CartItem = {
      ...POUNDO_FULL_NO_CUSTOM,
      cartItemId: 'cart_001',
      quantity: 2,
    };
    expect(computeCartItemTotal(item)).toBe(4000);
  });

  it('full-portion + surcharge: (price + surcharge) × quantity (AC12)', () => {
    const item: CartItem = {
      ...POUNDO_FULL_NO_CUSTOM,
      cartItemId: 'cart_001',
      quantity: 1,
      customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
    };
    // (2000 + 500 × 1.0) × 1 = 2500
    expect(computeCartItemTotal(item)).toBe(2500);
  });

  it('half-portion + surcharge: surcharge scales (AC13)', () => {
    const item: CartItem = {
      ...POUNDO_FULL_NO_CUSTOM,
      price: 1000, // already half-adjusted base
      portionSize: 'half',
      portionMultiplier: 0.5,
      cartItemId: 'cart_001',
      quantity: 1,
      customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
    };
    // (1000 + 500 × 0.5) × 1 = 1250
    expect(computeCartItemTotal(item)).toBe(1250);
  });
});

describe('REQ-031: computeCartTotal (sum across lines)', () => {
  it('sums per-line totals across mixed customized/uncustomized lines', () => {
    const items: CartItem[] = [
      {
        ...POUNDO_FULL_NO_CUSTOM,
        cartItemId: 'cart_001',
        quantity: 1,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
      {
        ...POUNDO_FULL_NO_CUSTOM,
        cartItemId: 'cart_002',
        quantity: 2,
        // no customizations - legacy
      },
    ];
    // 2500 + (2000 × 2) = 6500
    expect(computeCartTotal(items)).toBe(6500);
  });
});
