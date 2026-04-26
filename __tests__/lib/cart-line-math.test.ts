/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Unit tests for the pure cart-line-total helper. Single source of truth for the
 * surcharge-aware line math used by the cart store, the checkout Order Summary,
 * and the server-side total recomputation in the three order-creating actions.
 *
 * Math contract (from REQ-031 implementation plan, D6):
 *   lineTotal = (basePrice + sum(option.price)) * quantity * portionMultiplier
 *
 * Surcharge scales with portion (Option B) — half-Poundo deducts half-Egusi
 * (REQ-030) and bills half-Egusi (this REQ).
 */
import { describe, it, expect } from 'vitest';
import { computeLineTotal } from '@/lib/cart-line-math';
import type { SelectedCustomization } from '@/lib/customization-validation';

describe('REQ-031: computeLineTotal — legacy items (no customizations)', () => {
  it('returns basePrice × quantity when customizations is undefined', () => {
    expect(computeLineTotal({ basePrice: 2000, quantity: 1 })).toBe(2000);
    expect(computeLineTotal({ basePrice: 2000, quantity: 3 })).toBe(6000);
  });

  it('returns basePrice × quantity when customizations is empty array (legacy-safe, AC8)', () => {
    expect(
      computeLineTotal({ basePrice: 2000, customizations: [], quantity: 2 })
    ).toBe(4000);
  });

  it('applies portionMultiplier to base price when no customizations', () => {
    // half-Poundo: 0.5 × 2000 × 1 = 1000
    expect(
      computeLineTotal({ basePrice: 2000, quantity: 1, portionMultiplier: 0.5 })
    ).toBe(1000);
    // quarter-Poundo: 0.25 × 2000 × 2 = 1000
    expect(
      computeLineTotal({
        basePrice: 2000,
        quantity: 2,
        portionMultiplier: 0.25,
      })
    ).toBe(1000);
  });
});

describe('REQ-031: computeLineTotal — single surcharge', () => {
  it('adds surcharge to base price (AC12)', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
    ];
    // (2000 + 500) × 1 × 1 = 2500
    expect(
      computeLineTotal({ basePrice: 2000, customizations, quantity: 1 })
    ).toBe(2500);
  });

  it('multiplies (base + surcharge) by quantity', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
    ];
    // (2000 + 500) × 3 = 7500
    expect(
      computeLineTotal({ basePrice: 2000, customizations, quantity: 3 })
    ).toBe(7500);
  });
});

describe('REQ-031: computeLineTotal — multi-checkbox surcharges sum', () => {
  it('sums multiple option prices (Soup + Drink + Sides)', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
      { name: 'Drink', option: 'Coke', price: 200 },
      { name: 'Sides', option: 'Plantain', price: 300 },
    ];
    // (2000 + 500 + 200 + 300) × 1 = 3000
    expect(
      computeLineTotal({ basePrice: 2000, customizations, quantity: 1 })
    ).toBe(3000);
  });

  it('treats price 0 surcharges as no-op (option set, no extra cost)', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];
    expect(
      computeLineTotal({ basePrice: 2000, customizations, quantity: 1 })
    ).toBe(2000);
  });
});

describe('REQ-031: computeLineTotal — portion scaling (AC13)', () => {
  it('half-portion: total = 0.5 × (base + surcharge) × quantity', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
    ];
    // 0.5 × (2000 + 500) × 1 = 1250
    expect(
      computeLineTotal({
        basePrice: 2000,
        customizations,
        quantity: 1,
        portionMultiplier: 0.5,
      })
    ).toBe(1250);
  });

  it('quarter-portion: total = 0.25 × (base + surcharge) × quantity', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
    ];
    // 0.25 × (2000 + 500) × 2 = 1250
    expect(
      computeLineTotal({
        basePrice: 2000,
        customizations,
        quantity: 2,
        portionMultiplier: 0.25,
      })
    ).toBe(1250);
  });

  it('full-portion (multiplier 1) matches no-multiplier behaviour', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
    ];
    expect(
      computeLineTotal({
        basePrice: 2000,
        customizations,
        quantity: 1,
        portionMultiplier: 1,
      })
    ).toBe(computeLineTotal({ basePrice: 2000, customizations, quantity: 1 }));
  });

  it('omitted portionMultiplier defaults to 1 (full portion)', () => {
    expect(computeLineTotal({ basePrice: 2000, quantity: 1 })).toBe(
      computeLineTotal({
        basePrice: 2000,
        quantity: 1,
        portionMultiplier: 1,
      })
    );
  });
});

describe('REQ-031: computeLineTotal — rounding behaviour', () => {
  it('rounds final total to nearest naira (no fractional currency)', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Extras', option: 'Sauce', price: 333 },
    ];
    // 0.5 × (2000 + 333) × 1 = 1166.5  →  rounded to 1167 or 1166?
    // Contract: round-half-to-even (banker's rounding) is too clever for prices;
    // use Math.round (round-half-up). Document expectation here as 1167.
    expect(
      computeLineTotal({
        basePrice: 2000,
        customizations,
        quantity: 1,
        portionMultiplier: 0.5,
      })
    ).toBe(1167);
  });

  it('does not introduce floating-point noise on whole-naira values', () => {
    const customizations: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
    ];
    // 0.1 × (2000 + 500) × 1 — would be 250.00000003 in raw floats
    // (We don't actually use 0.1 as a portion multiplier, but the helper must be
    // robust to any multiplier the caller passes.)
    expect(
      computeLineTotal({
        basePrice: 2000,
        customizations,
        quantity: 1,
        portionMultiplier: 0.1,
      })
    ).toBe(250);
  });
});
