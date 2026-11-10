/**
 * @requirement REQ-120 — AC1, AC2, AC3, AC4
 * @srs REQ-CHECKOUT-012
 *
 * `createCustomerOrder` is the only customer order-creation path: it
 * validates on the server, ignores client money, returns typed errors and
 * honours the idempotency key.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/lib/geo/geocode', () => ({ geocodeAddress: vi.fn() }));

const mockFindOne = vi.fn();
const mockCount = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: {
    findOne: (...a: unknown[]) => mockFindOne(...a),
    countDocuments: (...a: unknown[]) => mockCount(...a),
  },
}));

const MENU_ID = '665a00000000000000000001';
const menuDocs: any[] = [];
vi.mock('@/models/menu-item-model', () => ({
  default: {
    find: () => ({ lean: () => Promise.resolve(menuDocs) }),
  },
}));

const settings: any = {
  maxOrdersPerHour: 20,
  minimumOrderAmount: 1000,
  deliveryRadius: 10,
};
const S = vi.hoisted(() => ({
  isOrderTypeEnabled: vi.fn(),
  isWithinBusinessHours: vi.fn(),
  getNextOpenSlot: vi.fn(),
  getSettings: vi.fn(),
  meetsMinimumOrder: vi.fn(),
  checkDeliveryDistance: vi.fn(),
  resolveActivePriceField: vi.fn(),
  calculateOrderTotals: vi.fn(),
}));
vi.mock('@/services/settings-service', () => ({ default: S }));
vi.mock('@/services', () => ({ SettingsService: S }));

const mockCreate = vi.fn();
vi.mock('@/services/order-service', () => ({
  OrderService: { createOrder: (...a: unknown[]) => mockCreate(...a) },
}));

import {
  createCustomerOrder,
  type CustomerOrderInput,
} from '@/services/customer-order-service';

const USER = '665b00000000000000000001';
const ctx = { userId: USER, channel: 'web' as const };

function input(over: Partial<CustomerOrderInput> = {}): CustomerOrderInput {
  return {
    orderType: 'pickup',
    idempotencyKey: 'key-1',
    items: [{ menuItemId: MENU_ID, quantity: 2 }],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  menuDocs.length = 0;
  menuDocs.push({
    _id: { toString: () => MENU_ID },
    name: 'Jollof Rice',
    price: 3500,
    showPrice: 3500,
    happyHourPrice: 3000,
    isAvailable: true,
    customizations: [
      {
        name: 'Protein',
        options: [
          { name: 'Chicken', price: 500, available: true },
          { name: 'Fish', price: 700, available: false },
        ],
      },
    ],
  });
  mockFindOne.mockResolvedValue(null);
  mockCount.mockResolvedValue(0);
  S.isOrderTypeEnabled.mockResolvedValue(true);
  S.isWithinBusinessHours.mockResolvedValue(true);
  S.getNextOpenSlot.mockResolvedValue({
    openAt: new Date('2026-11-10T10:00:00Z'),
    message: 'Opens at 10:00',
  });
  S.getSettings.mockResolvedValue(settings);
  S.meetsMinimumOrder.mockResolvedValue(true);
  S.checkDeliveryDistance.mockResolvedValue({
    withinRadius: true,
    distanceKm: 3,
  });
  S.resolveActivePriceField.mockResolvedValue('price');
  S.calculateOrderTotals.mockImplementation(async (subtotal: number) => ({
    subtotal,
    serviceFee: 100,
    deliveryFee: 0,
    tax: 50,
    total: subtotal + 150,
  }));
  mockCreate.mockImplementation(async (data: any) => ({
    ...data,
    _id: { toString: () => 'order-1' },
  }));
});

describe('createCustomerOrder', () => {
  it('creates a customer-origin order with server totals (AC1, AC2)', async () => {
    const result = await createCustomerOrder(input(), ctx);
    expect(result.success).toBe(true);
    const data = mockCreate.mock.calls[0][0];
    expect(data.origin).toBe('customer');
    expect(data.channel).toBe('web');
    expect(data.userId).toBe(USER);
    expect(data.subtotal).toBe(7000);
    expect(data.total).toBe(7150);
    expect(data.idempotencyKey).toBe('key-1');
    expect(data.pickupDetails.preferredPickupTime).toEqual(
      new Date('2026-11-10T10:00:00Z')
    );
  });

  it('never reads client totals or prices — a tampered request stores the server total (US-A2.10)', async () => {
    const tampered = {
      ...input(),
      total: 1,
      subtotal: 1,
      items: [{ menuItemId: MENU_ID, quantity: 2, price: 1, subtotal: 1 }],
    } as unknown as CustomerOrderInput;
    await createCustomerOrder(tampered, ctx);
    const data = mockCreate.mock.calls[0][0];
    expect(data.subtotal).toBe(7000);
    expect(data.total).toBe(7150);
    expect(data.items[0].price).toBe(3500);
  });

  it('prices customizations from the menu, not the request', async () => {
    await createCustomerOrder(
      input({
        items: [
          {
            menuItemId: MENU_ID,
            quantity: 1,
            customizations: [
              { name: 'Protein', option: 'Chicken', price: 0 } as never,
            ],
          },
        ],
      }),
      ctx
    );
    expect(mockCreate.mock.calls[0][0].subtotal).toBe(4000);
  });

  it('rejects an unavailable customization option as ITEM_UNAVAILABLE', async () => {
    const r = await createCustomerOrder(
      input({
        items: [
          {
            menuItemId: MENU_ID,
            quantity: 1,
            customizations: [{ name: 'Protein', option: 'Fish' }],
          },
        ],
      }),
      ctx
    );
    expect(r).toMatchObject({ success: false, code: 'ITEM_UNAVAILABLE' });
  });

  it('rejects an unavailable menu item as ITEM_UNAVAILABLE', async () => {
    menuDocs[0].isAvailable = false;
    const r = await createCustomerOrder(input(), ctx);
    expect(r).toMatchObject({ success: false, code: 'ITEM_UNAVAILABLE' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns OUT_OF_HOURS for pickup outside business hours and creates nothing (US-A2.6)', async () => {
    S.isWithinBusinessHours.mockResolvedValue(false);
    const r = await createCustomerOrder(input(), ctx);
    expect(r).toMatchObject({ success: false, code: 'OUT_OF_HOURS' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('keeps dine-in inside hours regardless of the clock (REQ-061)', async () => {
    S.isWithinBusinessHours.mockResolvedValue(false);
    const r = await createCustomerOrder(
      input({ orderType: 'dine-in', tableNumber: 'T5' }),
      ctx
    );
    expect(r.success).toBe(true);
  });

  it('returns BELOW_MINIMUM (US-A2.7)', async () => {
    S.meetsMinimumOrder.mockResolvedValue(false);
    const r = await createCustomerOrder(input(), ctx);
    expect(r).toMatchObject({ success: false, code: 'BELOW_MINIMUM' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns OUT_OF_RADIUS for a far delivery address (US-A2.8)', async () => {
    S.checkDeliveryDistance.mockResolvedValue({
      withinRadius: false,
      distanceKm: 25,
    });
    const r = await createCustomerOrder(
      input({
        orderType: 'delivery',
        deliveryAddress: {
          street: '1 Far Rd',
          city: 'Lagos',
          state: 'Lagos',
          country: 'NG',
        },
        customerLat: 6.9,
        customerLng: 3.9,
      }),
      ctx
    );
    expect(r).toMatchObject({ success: false, code: 'OUT_OF_RADIUS' });
  });

  it('returns ORDER_TYPE_DISABLED', async () => {
    S.isOrderTypeEnabled.mockResolvedValue(false);
    const r = await createCustomerOrder(input(), ctx);
    expect(r).toMatchObject({ success: false, code: 'ORDER_TYPE_DISABLED' });
  });

  it('returns RATE_LIMITED at maxOrdersPerHour and not below it', async () => {
    mockCount.mockResolvedValue(20);
    expect(await createCustomerOrder(input(), ctx)).toMatchObject({
      success: false,
      code: 'RATE_LIMITED',
    });
    mockCount.mockResolvedValue(19);
    expect((await createCustomerOrder(input(), ctx)).success).toBe(true);
  });

  it('does not rate limit when maxOrdersPerHour is zero or unset (D3)', async () => {
    S.getSettings.mockResolvedValue({ ...settings, maxOrdersPerHour: 0 });
    mockCount.mockResolvedValue(999);
    expect((await createCustomerOrder(input(), ctx)).success).toBe(true);
  });

  it('requires an idempotency key and returns the existing order for a repeat (AC3, US-A2.9)', async () => {
    expect(
      await createCustomerOrder(input({ idempotencyKey: '' }), ctx)
    ).toMatchObject({ success: false, code: 'IDEMPOTENCY_KEY_REQUIRED' });

    const existing = {
      userId: { toString: () => USER },
      toObject: () => ({ _id: 'order-1' }),
    };
    mockFindOne.mockResolvedValue(existing);
    const r = await createCustomerOrder(input(), ctx);
    expect(r).toMatchObject({ success: true, reused: true });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not return another customer’s order for a reused key', async () => {
    mockFindOne.mockResolvedValue({
      userId: { toString: () => 'someone-else' },
      toObject: () => ({ _id: 'order-9' }),
    });
    expect(await createCustomerOrder(input(), ctx)).toMatchObject({
      success: false,
      code: 'NOT_ALLOWED',
    });
  });

  it('returns the winner when two requests race on the key', async () => {
    const winner = {
      userId: { toString: () => USER },
      toObject: () => ({ _id: 'order-2' }),
    };
    mockFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    mockCreate.mockRejectedValueOnce({
      code: 11000,
      keyPattern: { idempotencyKey: 1 },
    });
    expect(await createCustomerOrder(input(), ctx)).toMatchObject({
      success: true,
      reused: true,
    });
  });

  it('rejects tabs, pay-now and guests (AC1, AC6)', async () => {
    const withTab = {
      ...input(),
      tabId: 'tab-1',
    } as unknown as CustomerOrderInput;
    expect(await createCustomerOrder(withTab, ctx)).toMatchObject({
      success: false,
      code: 'NOT_ALLOWED',
    });
    const payNow = {
      ...input(),
      orderType: 'pay-now',
    } as unknown as CustomerOrderInput;
    expect(await createCustomerOrder(payNow, ctx)).toMatchObject({
      success: false,
      code: 'INVALID_INPUT',
    });
    expect(
      await createCustomerOrder(input(), { ...ctx, userId: '' })
    ).toMatchObject({ success: false, code: 'NOT_ALLOWED' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('requires a table for dine-in and a full address for delivery', async () => {
    expect(
      await createCustomerOrder(input({ orderType: 'dine-in' }), ctx)
    ).toMatchObject({ success: false, code: 'INVALID_INPUT' });
    expect(
      await createCustomerOrder(input({ orderType: 'delivery' }), ctx)
    ).toMatchObject({ success: false, code: 'INVALID_INPUT' });
  });
});
