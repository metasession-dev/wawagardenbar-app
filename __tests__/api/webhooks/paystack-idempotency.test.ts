/**
 * @requirement REQ-049 — Webhook idempotency guard (#117 P0 #1)
 *
 * Integration tests for `app/api/webhooks/paystack/route.ts:POST`. Mocks every
 * downstream and asserts that a replay (duplicate provider event-id) is a no-op
 * — no inventory deduction, no reward calculation, no order lookup — while a
 * first delivery runs the side-effects normally.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

vi.mock('@/services/paystack-service', () => ({
  PaystackService: {
    validateWebhookSignature: vi.fn().mockResolvedValue(true),
  },
}));

const mockDeductStock = vi.fn();
const mockCalculateReward = vi.fn();
const mockMarkTabPaid = vi.fn();
vi.mock('@/services', () => ({
  InventoryService: {
    deductStockForOrder: (...a: unknown[]) => mockDeductStock(...a),
  },
  RewardsService: {
    calculateReward: (...a: unknown[]) => mockCalculateReward(...a),
  },
  TabService: { markTabPaid: (...a: unknown[]) => mockMarkTabPaid(...a) },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(() => new Date('2026-05-28T00:00:00Z')),
}));

const buildOrder = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => 'order-id-123' },
  userId: { toString: () => 'user-id-456' },
  paymentStatus: 'pending',
  status: 'pending',
  total: 5000,
  statusHistory: [] as unknown[],
  inventoryDeducted: false,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockOrderFindOne = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: { findOne: (...a: unknown[]) => mockOrderFindOne(...a) },
}));

vi.mock('@/models/tab-model', () => ({
  default: { findOne: vi.fn().mockResolvedValue(null) },
}));

const mockProcessedCreate = vi.fn();
vi.mock('@/models/processed-webhook-event-model', () => ({
  default: { create: (...a: unknown[]) => mockProcessedCreate(...a) },
}));

import { POST } from '@/app/api/webhooks/paystack/route';

const EVENT = {
  event: 'charge.success',
  data: {
    id: 9876543210,
    reference: 'pst-ref-abc',
    status: 'success',
    amount: 500000,
    channel: 'card',
    paid_at: '2026-05-28T07:00:00.000Z',
  },
};

const buildReq = (body: object): NextRequest =>
  ({
    text: async () => JSON.stringify(body),
    headers: {
      get: (name: string) => (name === 'x-paystack-signature' ? 'sig' : null),
    },
  }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderFindOne.mockResolvedValue(buildOrder());
});

describe('REQ-049: Paystack webhook idempotency', () => {
  it('first delivery runs side-effects and 200s', async () => {
    mockProcessedCreate.mockResolvedValueOnce({ _id: 'pwe-1' });
    mockCalculateReward.mockResolvedValue({ code: 'RWD-AAA' });

    const res = await POST(buildReq(EVENT));

    expect(res.status).toBe(200);
    expect(mockProcessedCreate).toHaveBeenCalledOnce();
    expect(mockProcessedCreate.mock.calls[0][0].provider).toBe('paystack');
    expect(mockProcessedCreate.mock.calls[0][0].eventId).toBe(
      String(EVENT.data.id)
    );
    // REQ-066 — inventory deduction is OWNED by `OrderService.completeOrder`
    // (kitchen-display completion). Webhook only confirms payment + awards
    // rewards; it no longer deducts. See compliance/plans/REQ-066/.
    expect(mockDeductStock).not.toHaveBeenCalled();
    expect(mockCalculateReward).toHaveBeenCalledOnce();
  });

  it('replay is a no-op: no inventory, no reward, no order lookup, 200', async () => {
    const dup = Object.assign(new Error('E11000'), { code: 11000 });
    mockProcessedCreate.mockRejectedValueOnce(dup);

    const res = await POST(buildReq(EVENT));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/already processed/i);
    expect(mockDeductStock).not.toHaveBeenCalled();
    expect(mockCalculateReward).not.toHaveBeenCalled();
    expect(mockOrderFindOne).not.toHaveBeenCalled();
  });

  it('10 sequential replays produce exactly one side-effect set (abuse)', async () => {
    const dup = Object.assign(new Error('E11000'), { code: 11000 });
    mockProcessedCreate
      .mockResolvedValueOnce({ _id: 'pwe-1' })
      .mockImplementation(() => Promise.reject(dup));
    mockCalculateReward.mockResolvedValue({ code: 'RWD-AAA' });

    for (let i = 0; i < 10; i++) {
      const r = await POST(buildReq(EVENT));
      expect(r.status).toBe(200);
    }

    // REQ-066 — deduction is owned by kitchen-completion; reward stays
    // here (one award across 10 replays = the REQ-049 idempotency).
    expect(mockDeductStock).not.toHaveBeenCalled();
    expect(mockCalculateReward).toHaveBeenCalledOnce();
  });

  it('non-charge.success events are ignored BEFORE the dedup check (no table bloat)', async () => {
    const res = await POST(buildReq({ ...EVENT, event: 'charge.failed' }));

    expect(res.status).toBe(200);
    expect(mockProcessedCreate).not.toHaveBeenCalled();
  });

  it('rejects unsigned requests before any dedup work', async () => {
    const { PaystackService } = await import('@/services/paystack-service');
    (
      PaystackService.validateWebhookSignature as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(false);

    const res = await POST(buildReq(EVENT));

    expect(res.status).toBe(401);
    expect(mockProcessedCreate).not.toHaveBeenCalled();
  });
});
