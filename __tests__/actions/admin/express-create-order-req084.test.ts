/**
 * @requirement REQ-084 - Tests for expressCreateOrderAction extension and createOrder cleanup
 *
 * Verifies:
 *   AC4: expressCreateOrderAction accepts orderType, customerInfo, deliveryInfo, pickupTime
 *   AC5: SettingsService.calculateOrderTotals is used for fee/tax computation
 *   AC8: createOrder no longer contains price override validation logic
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

vi.mock('@/models/menu-item-model', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          name: 'Test Item',
          price: 1000,
          customizations: [],
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
      subtotal: 1000,
      serviceFee: 50,
      deliveryFee: 0,
      tax: 75,
      total: 1125,
    }),
  },
}));

vi.mock('@/services/order-service', () => ({
  OrderService: {
    createOrder: vi.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      orderNumber: 'WGB12345678',
      total: 1125,
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
    find: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/expense-inventory-link', () => ({
  computeInventoryStatus: vi.fn().mockReturnValue('in-stock'),
}));

vi.mock('@/lib/session', () => ({
  sessionOptions: {},
}));

vi.mock('@/lib/order-line-totals', () => ({
  reconcileAndValidateOrderLines: vi.fn(({ lines }) => ({
    valid: true,
    recomputedSubtotal: lines.reduce(
      (sum: number, l: any) => sum + 1000 * l.quantity,
      0
    ),
  })),
}));

import { expressCreateOrderAction } from '@/app/actions/admin/express-actions';
import { OrderService } from '@/services/order-service';
import { SettingsService } from '@/services';

const baseItem = {
  menuItemId: new Types.ObjectId().toString(),
  name: 'Test Item',
  price: 1000,
  quantity: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('expressCreateOrderAction — REQ-084', () => {
  const baseParams = {
    items: [baseItem],
  };

  it('AC4: accepts orderType=pickup and pickupTime', async () => {
    const result = await expressCreateOrderAction({
      ...baseParams,
      orderType: 'pickup',
      pickupTime: '2025-01-01T12:00',
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(true);
    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    expect(createCall.orderType).toBe('pickup');
    expect(createCall.pickupDetails).toEqual({
      pickupTime: '2025-01-01T12:00',
    });
  });

  it('AC4: accepts orderType=delivery with deliveryInfo and customer info', async () => {
    const deliveryInfo = {
      street: '123 Main St',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      instructions: 'Call on arrival',
    };

    const result = await expressCreateOrderAction({
      ...baseParams,
      orderType: 'delivery',
      deliveryInfo,
      customerName: 'John Doe',
      customerPhone: '08012345678',
      customerEmail: 'john@example.com',
      paymentMethod: 'card',
    });

    expect(result.success).toBe(true);
    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    expect(createCall.orderType).toBe('delivery');
    expect(createCall.deliveryDetails).toEqual(deliveryInfo);
    expect(createCall.guestName).toBe('John Doe');
    expect(createCall.guestPhone).toBe('08012345678');
    expect(createCall.guestEmail).toBe('john@example.com');
  });

  it('AC5: uses SettingsService.calculateOrderTotals for totals', async () => {
    await expressCreateOrderAction({
      ...baseParams,
      orderType: 'delivery',
      deliveryInfo: {
        street: '123 Main St',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
      },
      paymentMethod: 'cash',
    });

    expect(
      vi.mocked(SettingsService.calculateOrderTotals)
    ).toHaveBeenCalledWith(1000, 'delivery');
    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    expect(createCall.tax).toBe(75);
    expect(createCall.deliveryFee).toBe(0);
    expect(createCall.total).toBe(1125);
  });

  it('AC4: defaults to dine-in when tabId is provided without orderType', async () => {
    await expressCreateOrderAction({
      ...baseParams,
      tabId: 'tab123',
    });

    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    expect(createCall.orderType).toBe('dine-in');
  });

  it('AC4: defaults to pay-now without tabId or orderType', async () => {
    await expressCreateOrderAction({
      ...baseParams,
      paymentMethod: 'cash',
    });

    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    expect(createCall.orderType).toBe('pay-now');
  });

  it('AC5: does not pass serviceFee to OrderService.createOrder (not in type)', async () => {
    await expressCreateOrderAction({
      ...baseParams,
      orderType: 'pay-now',
      paymentMethod: 'cash',
    });

    const createCall = vi.mocked(OrderService.createOrder).mock.calls[0][0];
    expect(createCall).not.toHaveProperty('serviceFee');
  });
});

describe('createOrder price override removal — REQ-084 AC8', () => {
  it('createOrder no longer contains admin price override branching', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(
      process.cwd(),
      'app',
      'actions',
      'payment',
      'payment-actions.ts'
    );
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).not.toContain('hasOverrides');
    expect(content).not.toContain('Unauthorized price override attempt');
    expect(content).not.toContain('order.price_override');
    expect(content).not.toContain('isAdmin');
    expect(content).not.toContain('priceOverridden');
    expect(content).not.toContain('priceOverrideReason');
    expect(content).not.toContain('priceOverriddenBy');
  });
});

describe('customer checkout component separation — REQ-084 AC9', () => {
  it('customer-checkout-form.tsx contains no admin branching logic', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(
      process.cwd(),
      'components',
      'features',
      'checkout',
      'customer-checkout-form.tsx'
    );
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).not.toContain('isAdmin');
    expect(content).not.toContain('priceOverridden');
    expect(content).not.toContain('manual payment');
  });
});
