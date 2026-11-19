/**
 * @requirement REQ-049 — Webhook idempotency guard (#117 P0 #1)
 * @requirement REQ-123 — AC3, AC4 (raw-body signature, lookup before dedup,
 *   amount check, one idempotent `markOrderPaid`)
 * @srs REQ-PAY-007, REQ-PAY-008
 *
 * Integration tests for `app/api/webhooks/paystack/route.ts:POST`. Mocks every
 * downstream and asserts that a replay (duplicate provider event-id) changes
 * nothing, while a first delivery marks the order paid exactly once.
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

const mockMarkOrderPaid = vi.hoisted(() => vi.fn());
vi.mock('@/services/order-service', () => ({
  OrderService: { markOrderPaid: mockMarkOrderPaid },
}));

const mockRecordIncident = vi.hoisted(() => vi.fn());
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: { recordIncident: mockRecordIncident },
}));

const buildOrder = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => 'order-id-123' },
  userId: { toString: () => 'user-id-456' },
  orderNumber: 'WG2611190001',
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

const buildReq = (body: object | string): NextRequest =>
  ({
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    headers: {
      get: (name: string) => (name === 'x-paystack-signature' ? 'sig' : null),
    },
  }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderFindOne.mockResolvedValue(buildOrder());
  mockMarkOrderPaid.mockResolvedValue({ order: {}, firstTime: true });
});

describe('REQ-049: Paystack webhook idempotency', () => {
  it('first delivery marks the order paid once and 200s', async () => {
    mockProcessedCreate.mockResolvedValueOnce({ _id: 'pwe-1' });

    const res = await POST(buildReq(EVENT));

    expect(res.status).toBe(200);
    expect(mockProcessedCreate).toHaveBeenCalledOnce();
    expect(mockProcessedCreate.mock.calls[0][0].provider).toBe('paystack');
    expect(mockProcessedCreate.mock.calls[0][0].eventId).toBe(
      String(EVENT.data.id)
    );
    // REQ-066 — inventory deduction is OWNED by `OrderService.completeOrder`
    // (kitchen-display completion); the webhook never deducts.
    expect(mockDeductStock).not.toHaveBeenCalled();
    // REQ-123 — rewards, staff alert, kitchen event and messages live in the
    // one `markOrderPaid` (covered by its own tests).
    expect(mockMarkOrderPaid).toHaveBeenCalledOnce();
    expect(mockMarkOrderPaid.mock.calls[0][0]).toBe('order-id-123');
    expect(mockMarkOrderPaid.mock.calls[0][1]).toBe('paystack_webhook');
    expect(mockMarkOrderPaid.mock.calls[0][2]).toMatchObject({
      transactionReference: '9876543210',
      paymentMethod: 'card',
    });
  });

  it('[US-A2.15] replay is a no-op: nothing is marked paid, 200', async () => {
    const dup = Object.assign(new Error('E11000'), { code: 11000 });
    mockProcessedCreate.mockRejectedValueOnce(dup);

    const res = await POST(buildReq(EVENT));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/already processed/i);
    expect(mockDeductStock).not.toHaveBeenCalled();
    expect(mockMarkOrderPaid).not.toHaveBeenCalled();
    // REQ-123 AC3 — the order is looked up BEFORE the dedup row is written.
    expect(mockOrderFindOne).toHaveBeenCalledOnce();
  });

  it('10 sequential replays produce exactly one payment (abuse)', async () => {
    const dup = Object.assign(new Error('E11000'), { code: 11000 });
    mockProcessedCreate
      .mockResolvedValueOnce({ _id: 'pwe-1' })
      .mockImplementation(() => Promise.reject(dup));

    for (let i = 0; i < 10; i++) {
      const r = await POST(buildReq(EVENT));
      expect(r.status).toBe(200);
    }

    expect(mockDeductStock).not.toHaveBeenCalled();
    expect(mockMarkOrderPaid).toHaveBeenCalledOnce();
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
    expect(mockMarkOrderPaid).not.toHaveBeenCalled();
  });
});

describe('REQ-123 AC3: Paystack webhook order lookup and amount check', () => {
  it('verifies the signature over the raw body, not a re-serialised one', async () => {
    const { PaystackService } = await import('@/services/paystack-service');
    mockProcessedCreate.mockResolvedValueOnce({ _id: 'pwe-1' });
    // Same JSON, unusual spacing: re-serialising would change the bytes.
    const raw = `{ "event": "charge.success",  "data": ${JSON.stringify(EVENT.data)} }`;

    await POST(buildReq(raw));

    expect(PaystackService.validateWebhookSignature).toHaveBeenCalledWith(
      raw,
      'sig'
    );
  });

  it('[US-A2.17] an unknown reference returns 404 and writes no dedup row', async () => {
    mockOrderFindOne.mockResolvedValue(null);

    const res = await POST(buildReq(EVENT));

    expect(res.status).toBe(404);
    expect(mockProcessedCreate).not.toHaveBeenCalled();
    expect(mockMarkOrderPaid).not.toHaveBeenCalled();
  });

  it('[US-A2.16] an amount that differs from the order total is not confirmed and raises an Incident', async () => {
    const order = buildOrder();
    mockOrderFindOne.mockResolvedValue(order);
    mockProcessedCreate.mockResolvedValueOnce({ _id: 'pwe-1' });

    const res = await POST(
      buildReq({ ...EVENT, data: { ...EVENT.data, amount: 400000 } })
    );

    expect(res.status).toBe(200);
    expect(order.paymentStatus).toBe('payment_mismatch');
    expect(order.save).toHaveBeenCalled();
    expect(mockMarkOrderPaid).not.toHaveBeenCalled();
    expect(mockRecordIncident).toHaveBeenCalledOnce();
    expect(mockRecordIncident.mock.calls[0][0]).toMatchObject({
      kind: 'payment_mismatch',
      entityId: 'order-id-123',
    });
    expect(mockRecordIncident.mock.calls[0][0].errorDetails).toMatchObject({
      paidKobo: 400000,
      expectedKobo: 500000,
    });
  });

  it('rejects a malformed signed body with 400 instead of crashing', async () => {
    const res = await POST(buildReq('not json'));
    expect(res.status).toBe(400);
    expect(mockProcessedCreate).not.toHaveBeenCalled();
  });
});
