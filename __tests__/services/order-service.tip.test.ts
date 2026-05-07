/**
 * @requirement REQ-035 — Tip recording at express checkout
 *
 * Service-level tests for OrderService.completeOrderPaymentManually's new
 * tip params. The model + DB are mocked; tests assert the validation
 * branches and the persisted-field values without spinning up Mongo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0e1';

const buildSavedOrder = (overrides: Record<string, unknown> = {}) => {
  const order: Record<string, unknown> = {
    _id: ORDER_ID,
    paymentStatus: 'pending',
    status: 'pending',
    statusHistory: [],
    tabId: undefined,
    inventoryDeducted: true, // skip inventory side-effects in tests
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn(function (this: Record<string, unknown>) {
      return { ...this };
    }),
    ...overrides,
  };
  return order;
};

const mockFindById = vi.fn();

vi.mock('@/models/order-model', () => ({
  default: {
    findById: (...args: unknown[]) => mockFindById(...args),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(() => new Date('2026-05-07T00:00:00Z')),
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/models/user-model', () => ({
  default: {
    findById: vi.fn().mockResolvedValue({ email: 'admin@test', role: 'admin' }),
  },
}));

vi.mock('@/models/tab-model', () => ({
  default: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/inventory-service', () => ({
  default: {
    deductStockForOrder: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/rewards-service', () => ({
  RewardsService: {
    calculateReward: vi.fn().mockResolvedValue(undefined),
  },
}));

import { OrderService } from '@/services/order-service';

beforeEach(() => {
  mockFindById.mockReset();
});

const baseParams = {
  orderId: ORDER_ID,
  paymentType: 'card' as const,
  paymentReference: 'TEST-REF-001',
  processedByAdminId: '65a1b2c3d4e5f6a7b8c9d0e2',
};

describe('REQ-035: completeOrderPaymentManually tip handling', () => {
  it('persists tipAmount + tipPaymentMethod when both supplied', async () => {
    const order = buildSavedOrder();
    mockFindById.mockResolvedValue(order);
    await OrderService.completeOrderPaymentManually({
      ...baseParams,
      tipAmount: 500,
      tipPaymentMethod: 'cash',
    });
    expect(order.tipAmount).toBe(500);
    expect(order.tipPaymentMethod).toBe('cash');
    expect(order.paymentMethod).toBe('card');
    expect(order.save).toHaveBeenCalled();
  });

  it('rejects tipAmount > 0 without tipPaymentMethod', async () => {
    mockFindById.mockResolvedValue(buildSavedOrder());
    await expect(
      OrderService.completeOrderPaymentManually({
        ...baseParams,
        tipAmount: 500,
      })
    ).rejects.toThrow(/tipPaymentMethod is required/);
  });

  it('rejects negative tipAmount', async () => {
    mockFindById.mockResolvedValue(buildSavedOrder());
    await expect(
      OrderService.completeOrderPaymentManually({
        ...baseParams,
        tipAmount: -50,
        tipPaymentMethod: 'cash',
      })
    ).rejects.toThrow(/tipAmount must be a non-negative number/);
  });

  it('rejects tipPaymentMethod outside the express enum', async () => {
    mockFindById.mockResolvedValue(buildSavedOrder());
    await expect(
      OrderService.completeOrderPaymentManually({
        ...baseParams,
        tipAmount: 500,
        // @ts-expect-error — testing rejection of out-of-enum value
        tipPaymentMethod: 'bitcoin',
      })
    ).rejects.toThrow(/tipPaymentMethod must be one of/);
  });

  it('leaves tipPaymentMethod unset when tipAmount = 0', async () => {
    const order = buildSavedOrder();
    mockFindById.mockResolvedValue(order);
    await OrderService.completeOrderPaymentManually({
      ...baseParams,
      tipAmount: 0,
    });
    expect(order.tipPaymentMethod).toBeUndefined();
    // Existing tipAmount stays at 0 — service does not overwrite it when
    // the caller is in legacy / no-tip mode.
    expect(order.save).toHaveBeenCalled();
  });
});
