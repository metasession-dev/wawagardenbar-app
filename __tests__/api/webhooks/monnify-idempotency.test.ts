/**
 * @requirement REQ-049 — Webhook idempotency guard (#117 P0 #1)
 *
 * Integration tests for `app/api/webhooks/monnify/route.ts:POST`. Mirrors the
 * Paystack idempotency suite — first delivery runs side-effects, replay
 * (duplicate `transactionReference`) is a no-op.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

vi.mock('@/services/monnify-service', () => ({
  MonnifyService: {
    validateWebhookSignature: vi.fn().mockReturnValue(true),
    getPaymentMethodName: vi.fn().mockReturnValue('Card'),
  },
}));

vi.mock('@/services/payment-service', () => ({
  PaymentService: {
    isPaymentSuccessful: vi.fn((status: string) =>
      ['PAID', 'OVERPAID'].includes(status)
    ),
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
  _id: { toString: () => 'order-id-789' },
  userId: { toString: () => 'user-id-321' },
  paymentStatus: 'pending',
  status: 'pending',
  total: 7500,
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

import { POST } from '@/app/api/webhooks/monnify/route';

const EVENT = {
  eventType: 'SUCCESSFUL_TRANSACTION',
  eventData: {
    transactionReference: 'mny-txn-xyz',
    paymentReference: 'mny-pay-ref',
    amountPaid: '7500',
    totalPayable: '7500',
    settlementAmount: '7500',
    paidOn: '2026-05-28T07:00:00.000Z',
    paymentStatus: 'PAID',
    paymentDescription: 'Order payment',
    transactionHash: 'hash',
    currency: 'NGN',
    paymentMethod: 'CARD',
    product: { type: 'WEB_SDK', reference: 'mny-pay-ref' },
  },
};

const buildReq = (body: object): NextRequest =>
  ({
    text: async () => JSON.stringify(body),
    headers: {
      get: (name: string) => (name === 'monnify-signature' ? 'sig' : null),
    },
  }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderFindOne.mockResolvedValue(buildOrder());
});

describe('REQ-049: Monnify webhook idempotency', () => {
  it('first delivery runs side-effects and 200s', async () => {
    mockProcessedCreate.mockResolvedValueOnce({ _id: 'pwe-2' });
    mockCalculateReward.mockResolvedValue({ code: 'RWD-BBB' });

    const res = await POST(buildReq(EVENT));

    expect(res.status).toBe(200);
    expect(mockProcessedCreate).toHaveBeenCalledOnce();
    expect(mockProcessedCreate.mock.calls[0][0].provider).toBe('monnify');
    expect(mockProcessedCreate.mock.calls[0][0].eventId).toBe(
      EVENT.eventData.transactionReference
    );
    // REQ-066 — inventory deduction is OWNED by `OrderService.completeOrder`
    // (kitchen-display completion). Webhook only confirms payment + awards
    // rewards; it no longer deducts.
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

  it('rejects unsigned requests before any dedup work', async () => {
    const { MonnifyService } = await import('@/services/monnify-service');
    (
      MonnifyService.validateWebhookSignature as ReturnType<typeof vi.fn>
    ).mockReturnValueOnce(false);

    const res = await POST(buildReq(EVENT));

    expect(res.status).toBe(401);
    expect(mockProcessedCreate).not.toHaveBeenCalled();
  });
});
