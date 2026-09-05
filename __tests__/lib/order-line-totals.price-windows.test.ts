/**
 * @requirement REQ-102 — Time-window price resolution (happy-hour > show > default)
 *
 * Covers AC3-AC5: the reconciler resolves the active price field via
 * SettingsService.resolveActivePriceField() (ADR-004's centralized
 * precedence) before considering any manual override, which always wins
 * regardless of window state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const resolveActivePriceField = vi.fn();

vi.mock('@/services', () => ({
  SettingsService: {
    resolveActivePriceField: (...args: unknown[]) =>
      resolveActivePriceField(...args),
  },
}));

import {
  reconcileAndValidateOrderLines,
  type MenuItemForReconcile,
  type SubmittedLine,
} from '@/lib/order-line-totals';

const ITEM: MenuItemForReconcile = {
  _id: 'item-1',
  name: 'Beef',
  price: 1000,
  showPrice: 800,
  happyHourPrice: 600,
  allowManualPriceOverride: true,
};

const menuItems = new Map<string, MenuItemForReconcile>([['item-1', ITEM]]);

function singleLine(overrides: Partial<SubmittedLine> = {}): SubmittedLine[] {
  return [
    {
      menuItemId: 'item-1',
      quantity: 1,
      portionMultiplier: 1.0,
      ...overrides,
    },
  ];
}

beforeEach(() => {
  resolveActivePriceField.mockReset();
});

describe('REQ-102: reconcileAndValidateOrderLines — window precedence (AC3-AC4)', () => {
  it('charges happyHourPrice when the resolver reports happy-hour active', async () => {
    resolveActivePriceField.mockResolvedValue('happyHourPrice');
    const result = await reconcileAndValidateOrderLines({
      menuItems,
      lines: singleLine(),
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.recomputedSubtotal).toBe(600);
  });

  it('charges showPrice when the resolver reports show-price active (happy-hour not active)', async () => {
    resolveActivePriceField.mockResolvedValue('showPrice');
    const result = await reconcileAndValidateOrderLines({
      menuItems,
      lines: singleLine(),
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.recomputedSubtotal).toBe(800);
  });

  it('charges default price when the resolver reports neither window active', async () => {
    resolveActivePriceField.mockResolvedValue('price');
    const result = await reconcileAndValidateOrderLines({
      menuItems,
      lines: singleLine(),
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.recomputedSubtotal).toBe(1000);
  });
});

describe('REQ-102: reconcileAndValidateOrderLines — manual override always wins (AC5)', () => {
  it('charges the override price even when happy-hour is active', async () => {
    resolveActivePriceField.mockResolvedValue('happyHourPrice');
    const result = await reconcileAndValidateOrderLines({
      menuItems,
      lines: singleLine({ priceOverride: 250 }),
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.recomputedSubtotal).toBe(250);
  });

  it('charges the override price even when show-price is active', async () => {
    resolveActivePriceField.mockResolvedValue('showPrice');
    const result = await reconcileAndValidateOrderLines({
      menuItems,
      lines: singleLine({ priceOverride: 250 }),
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.recomputedSubtotal).toBe(250);
  });

  it('charges the override price when neither window is active', async () => {
    resolveActivePriceField.mockResolvedValue('price');
    const result = await reconcileAndValidateOrderLines({
      menuItems,
      lines: singleLine({ priceOverride: 250 }),
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.recomputedSubtotal).toBe(250);
  });

  it('ignores the override on an item with allowManualPriceOverride: false, using the resolved window price instead', async () => {
    const noOverrideItem: MenuItemForReconcile = {
      ...ITEM,
      _id: 'item-2',
      allowManualPriceOverride: false,
    };
    resolveActivePriceField.mockResolvedValue('happyHourPrice');
    const result = await reconcileAndValidateOrderLines({
      menuItems: new Map([['item-2', noOverrideItem]]),
      lines: [
        {
          menuItemId: 'item-2',
          quantity: 1,
          portionMultiplier: 1.0,
          priceOverride: 250,
        },
      ],
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.recomputedSubtotal).toBe(600);
  });
});
