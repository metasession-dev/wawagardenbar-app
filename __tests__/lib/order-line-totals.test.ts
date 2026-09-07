/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure-helper tests for the server-side order-line reconciler. This is the
 * single source of truth called by:
 *   - app/actions/admin/express-actions.ts (expressCreateOrderAction)
 *   - app/actions/admin/order-edit-actions.ts (updateOrderItemsAction)
 *   - app/api/public/orders/route.ts (POST handler)
 *
 * Responsibilities:
 *   - Per-line customization validation (delegates to validateSelectedCustomizations)
 *   - Per-line total computation (delegates to computeLineTotal)
 *   - Server-side subtotal recomputation (the menu is the source of truth, not
 *     the client request)
 *   - Tamper detection (AC15) — if client supplied a total that differs from
 *     the server-recomputed total beyond a 1-naira rounding tolerance, reject
 *
 * Action wire-up coverage lives in e2e/menu-customization-picker.spec.ts.
 */
import { describe, it, expect, vi } from 'vitest';

// REQ-102: reconcileAndValidateOrderLines now resolves the active price
// field via SettingsService — stub it to 'price' (no window active) so
// these pre-existing tests keep exercising the default-price path.
vi.mock('@/services', () => ({
  SettingsService: {
    resolveActivePriceField: vi.fn().mockResolvedValue('price'),
  },
}));

import {
  reconcileAndValidateOrderLines,
  type SubmittedLine,
  type MenuItemForReconcile,
} from '@/lib/order-line-totals';

const POUNDO: MenuItemForReconcile = {
  _id: 'menu_poundo',
  name: 'Poundo',
  price: 2000,
  showPrice: 2000,
  happyHourPrice: 2000,
  customizations: [
    {
      name: 'Soup',
      required: true,
      options: [
        { name: 'Ogbono', price: 0, available: true },
        { name: 'Egusi', price: 500, available: true },
      ],
    },
    {
      name: 'Extras',
      required: false,
      options: [
        { name: 'Plantain', price: 300, available: true },
        { name: 'Sauce', price: 100, available: true },
      ],
    },
  ],
};

const FRIES: MenuItemForReconcile = {
  _id: 'menu_fries',
  name: 'Fries',
  price: 1500,
  showPrice: 1500,
  happyHourPrice: 1500,
  customizations: [],
};

function menuMap(
  ...items: MenuItemForReconcile[]
): Map<string, MenuItemForReconcile> {
  return new Map(items.map((m) => [m._id, m]));
}

describe('REQ-031: reconcileAndValidateOrderLines — happy paths', () => {
  it('recomputes subtotal for single legacy line (AC8)', async () => {
    const lines: SubmittedLine[] = [
      { menuItemId: 'menu_fries', quantity: 2, portionMultiplier: 1 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(FRIES),
      lines,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(3000);
    }
  });

  it('recomputes subtotal with surcharge added (AC12)', async () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 1,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(2500);
    }
  });

  it('half-portion: surcharge scales with multiplier (AC13)', async () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 0.5,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(1250);
    }
  });

  it('sums multiple lines into the subtotal', async () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 1,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
      { menuItemId: 'menu_fries', quantity: 1, portionMultiplier: 1 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO, FRIES),
      lines,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(4000); // 2500 + 1500
    }
  });
});

describe('REQ-097: reconcileAndValidateOrderLines — flat portion-option surcharge', () => {
  const CATFISH_PEPPERSOUP: MenuItemForReconcile = {
    _id: 'menu_catfish',
    name: 'Catfish Peppersoup',
    price: 12000,
    showPrice: 12000,
    happyHourPrice: 12000,
    portionOptions: {
      halfPortionEnabled: true,
      halfPortionSurcharge: 1000,
      quarterPortionEnabled: true,
      quarterPortionSurcharge: 500,
    },
  };

  it('half portion: recomputed subtotal includes the flat surcharge (#613 repro)', async () => {
    const lines: SubmittedLine[] = [
      { menuItemId: 'menu_catfish', quantity: 1, portionMultiplier: 0.5 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(CATFISH_PEPPERSOUP),
      lines,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      // round(12000 * 0.5) + 1000 = 7000 — matches the menu editor's own preview.
      expect(result.recomputedSubtotal).toBe(7000);
    }
  });

  it('quarter portion: recomputed subtotal includes the flat surcharge (#613 repro)', async () => {
    const lines: SubmittedLine[] = [
      { menuItemId: 'menu_catfish', quantity: 1, portionMultiplier: 0.25 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(CATFISH_PEPPERSOUP),
      lines,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(3500);
    }
  });

  it('full portion is unaffected by portionOptions being present', async () => {
    const lines: SubmittedLine[] = [
      { menuItemId: 'menu_catfish', quantity: 1, portionMultiplier: 1 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(CATFISH_PEPPERSOUP),
      lines,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(12000);
    }
  });

  it('menu item with no portionOptions configured defaults surcharge to 0 (legacy-safe)', async () => {
    const lines: SubmittedLine[] = [
      { menuItemId: 'menu_poundo', quantity: 1, portionMultiplier: 0.5 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recomputedSubtotal).toBe(1000); // 2000 * 0.5, no surcharge
    }
  });

  it('a clientTotal computed with the correct (surcharge-inclusive) number now passes the tamper-check', async () => {
    // Before REQ-097, a correctly-computing client (e.g. the menu editor's own
    // formula) would have been rejected here because the server recomputed
    // without the surcharge (6000 vs the client's correct 7000).
    const lines: SubmittedLine[] = [
      { menuItemId: 'menu_catfish', quantity: 1, portionMultiplier: 0.5 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(CATFISH_PEPPERSOUP),
      lines,
      clientTotal: 7000,
    });
    expect(result.valid).toBe(true);
  });
});

describe('REQ-031: reconcileAndValidateOrderLines — rejects bad customizations (AC7)', () => {
  it('rejects when (group, option) pair is unknown', async () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 1,
        customizations: [{ name: 'Sauce', option: 'Mayo', price: 0 }],
      },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/items\[0\]/);
      expect(result.error).toMatch(/Sauce/);
    }
  });

  it('rejects when menu item is not found (defensive)', async () => {
    const lines: SubmittedLine[] = [
      { menuItemId: 'menu_unknown', quantity: 1, portionMultiplier: 1 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/items\[0\]/);
      expect(result.error).toMatch(/menu_unknown/);
    }
  });

  it('reports the offending line index when error is on a later line', async () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 1,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 1,
        customizations: [{ name: 'Soup', option: 'Pepper', price: 0 }],
      },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/items\[1\]/);
      expect(result.error).toMatch(/Pepper/);
    }
  });

  it('does NOT enforce required-group selection server-side (picker is the gate)', async () => {
    // Server only validates that what was submitted exists on the menu item.
    // Required-group enforcement is the picker's job (AC1, isValid). This
    // separation matches REQ-030's policy of silent skip at fulfilment.
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 1,
        // empty customizations even though Soup is required on the menu item
      },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
    });
    expect(result.valid).toBe(true);
  });
});

describe('REQ-031: reconcileAndValidateOrderLines — tamper detection (AC15)', () => {
  it('accepts when client total matches server-recomputed total exactly', async () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 1,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
      clientTotal: 2500,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts when client total differs by ≤ 1-naira rounding tolerance', async () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 0.5,
        customizations: [{ name: 'Extras', option: 'Sauce', price: 333 }],
      },
    ];
    // Server recompute: round(0.5 × (2000 + 333)) = 1167
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
      clientTotal: 1166, // off by 1, within tolerance
    });
    expect(result.valid).toBe(true);
  });

  it('rejects when client total differs by > 1-naira tolerance (tampered client)', async () => {
    const lines: SubmittedLine[] = [
      {
        menuItemId: 'menu_poundo',
        quantity: 1,
        portionMultiplier: 1,
        customizations: [{ name: 'Soup', option: 'Egusi', price: 500 }],
      },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(POUNDO),
      lines,
      clientTotal: 1000, // claims to pay 1000 for a 2500 order
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/total/i);
      expect(result.error).toMatch(/2500/);
      expect(result.error).toMatch(/1000/);
    }
  });

  it('skips tamper check when clientTotal is undefined (legacy callers)', async () => {
    const lines: SubmittedLine[] = [
      { menuItemId: 'menu_fries', quantity: 1, portionMultiplier: 1 },
    ];
    const result = await reconcileAndValidateOrderLines({
      menuItems: menuMap(FRIES),
      lines,
      // clientTotal omitted
    });
    expect(result.valid).toBe(true);
  });
});
