/**
 * @requirement REQ-097 - Fix half/quarter portion pricing in Admin order management
 *
 * Verifies AC3 + AC6: expressCreateOrderAction persists a line price/subtotal
 * that includes the menu item's configured portion surcharge — the bug (#613)
 * was that the surcharge was silently dropped entirely from the persisted
 * order regardless of what the picker displayed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue({
    userId: new Types.ObjectId().toString(),
    role: 'super-admin',
    email: 'admin@wawagardenbar.com',
  }),
}));

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const CATFISH_ID = '507f1f77bcf86cd799439099';

vi.mock('@/models/menu-item-model', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439099',
          name: 'Catfish Peppersoup',
          price: 12000,
          customizations: [],
          allowManualPriceOverride: true,
          portionOptions: {
            halfPortionEnabled: true,
            halfPortionSurcharge: 1000,
            quarterPortionEnabled: true,
            quarterPortionSurcharge: 500,
          },
        },
      ]),
    }),
  },
}));

vi.mock('@/services', () => ({
  TabService: {
    addOrderToTab: vi.fn().mockResolvedValue({}),
  },
  SettingsService: {
    calculateOrderTotals: vi.fn().mockResolvedValue({
      subtotal: 7000,
      serviceFee: 0,
      deliveryFee: 0,
      tax: 0,
      total: 7000,
    }),
  },
}));

vi.mock('@/services/order-service', () => ({
  OrderService: {
    createOrder: vi.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      orderNumber: 'WGB12345678',
      total: 7000,
    }),
    completeOrderPaymentManually: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/category-service', () => ({
  CategoryService: {},
}));

vi.mock('@/models/tab-model', () => ({
  default: {
    find: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock('@/lib/expense-inventory-link', () => ({
  computeInventoryStatus: vi.fn().mockReturnValue('in-stock'),
}));

vi.mock('@/lib/session', () => ({
  sessionOptions: {},
}));

// Exercise the REAL reconciler (unlike REQ-084's test file, which mocks it
// out) so this test also proves the reconciler-side fix (AC3/AC5 shared
// code path), not just the per-line duplicate math in express-actions.ts.

import { expressCreateOrderAction } from '@/app/actions/admin/express-actions';
import { OrderService } from '@/services/order-service';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('expressCreateOrderAction — REQ-097 portion surcharge persistence', () => {
  it('AC3: persists the half-portion surcharge in the line price (#613 repro)', async () => {
    const result = await expressCreateOrderAction({
      items: [
        {
          menuItemId: CATFISH_ID,
          name: 'Catfish Peppersoup',
          price: 12000,
          quantity: 1,
          portionSize: 'half',
        },
      ],
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(true);
    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    const line = createCall.items[0];
    // round(12000 * 0.5) + 1000 = 7000 — NOT 6000 (the pre-fix bug: surcharge dropped).
    expect(line.price).toBe(7000);
    expect(line.subtotal).toBe(7000);
  });

  it('AC3: persists the quarter-portion surcharge in the line price', async () => {
    const result = await expressCreateOrderAction({
      items: [
        {
          menuItemId: CATFISH_ID,
          name: 'Catfish Peppersoup',
          price: 12000,
          quantity: 1,
          portionSize: 'quarter',
        },
      ],
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(true);
    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    const line = createCall.items[0];
    // round(12000 * 0.25) + 500 = 3500 — NOT 3000.
    expect(line.price).toBe(3500);
    expect(line.subtotal).toBe(3500);
  });

  it('AC6: portion surcharge still applies on top of an admin manual price override', async () => {
    const result = await expressCreateOrderAction({
      items: [
        {
          menuItemId: CATFISH_ID,
          name: 'Catfish Peppersoup',
          price: 10000, // admin-overridden base, lower than the menu's 12000
          quantity: 1,
          portionSize: 'half',
          priceOverridden: true,
          priceOverrideReason: 'loyal customer discount',
        },
      ],
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(true);
    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    const line = createCall.items[0];
    // round(10000 * 0.5) + 1000 = 6000 — override replaces the base price,
    // surcharge is still added on top of it.
    expect(line.price).toBe(6000);
    expect(line.subtotal).toBe(6000);
  });

  it('full portion is unaffected (no surcharge applied)', async () => {
    const result = await expressCreateOrderAction({
      items: [
        {
          menuItemId: CATFISH_ID,
          name: 'Catfish Peppersoup',
          price: 12000,
          quantity: 1,
          portionSize: 'full',
        },
      ],
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(true);
    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    const line = createCall.items[0];
    expect(line.price).toBe(12000);
    expect(line.subtotal).toBe(12000);
  });
});
