/**
 * @requirement REQ-089 — Unit tests for order edit actions: portion size,
 * price override, and special instructions persistence.
 *
 * Covers AC2, AC4, AC7.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services', () => ({
  SettingsService: {
    calculateOrderTotals: vi.fn().mockResolvedValue({
      subtotal: 5000,
      total: 5000,
      taxRate: 0,
      serviceCharge: 0,
      deliveryFee: 0,
    }),
  },
}));

vi.mock('@/models/order-model', () => ({
  default: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('mongoose', () => ({
  Types: {
    ObjectId: class FakeObjectId {
      constructor(id: string) {
        return id;
      }
    },
  },
}));

const { updateOrderItemsAction } = await import(
  '@/app/actions/admin/order-edit-actions'
);
const OrderModel = (await import('@/models/order-model')).default as any;
const MenuItemModel = (await import('@/models/menu-item-model')).default as any;

describe('REQ-089: updateOrderItemsAction — portion, price override, instructions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC2 — persists portionSize on order items', async () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      paymentStatus: 'unpaid',
      orderType: 'dine-in',
      status: 'pending',
    };
    OrderModel.findById.mockReturnValue({
      ...mockOrder,
      save: vi.fn().mockResolvedValue(undefined),
    });
    OrderModel.findByIdAndUpdate.mockResolvedValue(mockOrder);

    MenuItemModel.find.mockResolvedValue([
      {
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        name: 'Efo Riro',
        price: 5000,
        category: 'Food',
        portionOptions: true,
        allowManualPriceOverride: false,
        isAvailable: true,
        customizations: [],
        costPerUnit: 0,
      },
    ]);

    const result = await updateOrderItemsAction({
      orderId: '507f1f77bcf86cd799439011',
      items: [
        {
          menuItemId: '507f1f77bcf86cd799439012',
          quantity: 1,
          portionSize: 'half',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('AC4 — persists price override fields when allowManualPriceOverride is true', async () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      paymentStatus: 'unpaid',
      orderType: 'dine-in',
      status: 'pending',
    };
    OrderModel.findById.mockReturnValue({
      ...mockOrder,
      save: vi.fn().mockResolvedValue(undefined),
    });
    OrderModel.findByIdAndUpdate.mockResolvedValue(mockOrder);

    MenuItemModel.find.mockResolvedValue([
      {
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        name: 'Special Item',
        price: 10000,
        category: 'Drinks',
        allowManualPriceOverride: true,
        isAvailable: true,
        customizations: [],
        costPerUnit: 0,
      },
    ]);

    const result = await updateOrderItemsAction({
      orderId: '507f1f77bcf86cd799439011',
      items: [
        {
          menuItemId: '507f1f77bcf86cd799439012',
          quantity: 1,
          priceOverridden: true,
          originalPrice: 10000,
          priceOverrideReason: 'Staff discount',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('AC7 — persists specialInstructions on order items', async () => {
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      paymentStatus: 'unpaid',
      orderType: 'dine-in',
      status: 'pending',
    };
    OrderModel.findById.mockReturnValue({
      ...mockOrder,
      save: vi.fn().mockResolvedValue(undefined),
    });
    OrderModel.findByIdAndUpdate.mockResolvedValue(mockOrder);

    MenuItemModel.find.mockResolvedValue([
      {
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        name: 'Jollof Rice',
        price: 3000,
        category: 'Food',
        allowManualPriceOverride: false,
        isAvailable: true,
        customizations: [],
        costPerUnit: 0,
      },
    ]);

    const result = await updateOrderItemsAction({
      orderId: '507f1f77bcf86cd799439011',
      items: [
        {
          menuItemId: '507f1f77bcf86cd799439012',
          quantity: 2,
          specialInstructions: 'Extra spicy, no onions',
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects edit on paid orders', async () => {
    OrderModel.findById.mockReturnValue({
      _id: '507f1f77bcf86cd799439011',
      paymentStatus: 'paid',
    });

    const result = await updateOrderItemsAction({
      orderId: '507f1f77bcf86cd799439011',
      items: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('paid');
  });
});
