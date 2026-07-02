/**
 * @requirement REQ-089 — Unit tests for price override in reconcileAndValidateOrderLines
 */
import { describe, it, expect } from 'vitest';
import {
  reconcileAndValidateOrderLines,
  type MenuItemForReconcile,
  type SubmittedLine,
} from '@/lib/order-line-totals';

describe('reconcileAndValidateOrderLines — REQ-089 price override', () => {
  const menuItems = new Map<string, MenuItemForReconcile>([
    [
      'item-1',
      {
        _id: 'item-1',
        name: 'Beer',
        price: 1000,
        allowManualPriceOverride: true,
      },
    ],
    [
      'item-2',
      {
        _id: 'item-2',
        name: 'Wine',
        price: 2000,
        allowManualPriceOverride: false,
      },
    ],
  ]);

  it('uses overridden price when allowManualPriceOverride is true', () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'item-1',
        quantity: 2,
        portionMultiplier: 1.0,
        priceOverride: 800,
      },
    ];
    const result = reconcileAndValidateOrderLines({ menuItems, lines });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(1600);
    }
  });

  it('ignores overridden price when allowManualPriceOverride is false', () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'item-2',
        quantity: 1,
        portionMultiplier: 1.0,
        priceOverride: 500,
      },
    ];
    const result = reconcileAndValidateOrderLines({ menuItems, lines });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(2000);
    }
  });

  it('uses menu price when no priceOverride is supplied', () => {
    const lines: SubmittedLine[] = [
      { menuItemId: 'item-1', quantity: 1, portionMultiplier: 1.0 },
    ];
    const result = reconcileAndValidateOrderLines({ menuItems, lines });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(1000);
    }
  });

  it('applies portion multiplier to overridden price', () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'item-1',
        quantity: 1,
        portionMultiplier: 0.5,
        priceOverride: 800,
      },
    ];
    const result = reconcileAndValidateOrderLines({ menuItems, lines });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(400);
    }
  });

  it('handles multiple lines with mixed override states', () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'item-1',
        quantity: 1,
        portionMultiplier: 1.0,
        priceOverride: 800,
      },
      { menuItemId: 'item-2', quantity: 1, portionMultiplier: 1.0 },
    ];
    const result = reconcileAndValidateOrderLines({ menuItems, lines });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(2800);
    }
  });
});
