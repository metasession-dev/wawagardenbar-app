/**
 * @requirement REQ-PAY-011 (REQ-128 AC1) — Paystack refund webhooks
 * Same signature check and de-duplication as payments; unknown refund -> 404
 * with no dedup row so Paystack retries.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const validate = vi.hoisted(() => vi.fn());
vi.mock('@/services/paystack-service', () => ({
  PaystackService: { validateWebhookSignature: validate },
}));
vi.mock('@/services', () => ({ RewardsService: {}, TabService: {} }));
vi.mock('@/services/order-service', () => ({ OrderService: {} }));
vi.mock('@/models/order-model', () => ({ default: { findOne: vi.fn() } }));
vi.mock('@/models/tab-model', () => ({ default: { findOne: vi.fn() } }));

const locate = vi.hoisted(() => vi.fn());
const apply = vi.hoisted(() => vi.fn());
vi.mock('@/services/refund-service', () => ({
  RefundService: { locateForWebhook: locate, applyWebhookEvent: apply },
}));

const processedCreate = vi.hoisted(() => vi.fn());
vi.mock('@/models/processed-webhook-event-model', () => ({
  default: { create: processedCreate },
}));

import { POST } from '@/app/api/webhooks/paystack/route';

const body = (event: string) => ({
  event,
  data: { id: 4242, transaction_reference: 'WG-REF-1', amount: 500000 },
});
const req = (b: object): NextRequest =>
  ({
    text: async () => JSON.stringify(b),
    headers: { get: () => 'sig' },
  }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  validate.mockResolvedValue(true);
  locate.mockResolvedValue({ _id: 'r1' });
  apply.mockResolvedValue({ result: 'applied' });
  processedCreate.mockResolvedValue({});
});

describe('Paystack refund webhooks', () => {
  it('[AC1] a bad signature is refused before anything is read', async () => {
    validate.mockResolvedValueOnce(false);
    const res = await POST(req(body('refund.processed')));
    expect(res.status).toBe(401);
    expect(apply).not.toHaveBeenCalled();
  });

  it('[AC1] refund.processed is applied once and answered 200', async () => {
    const res = await POST(req(body('refund.processed')));
    expect(res.status).toBe(200);
    expect(apply).toHaveBeenCalledWith(
      'refund.processed',
      expect.objectContaining({ id: 4242 })
    );
    expect(processedCreate.mock.calls[0][0]).toMatchObject({
      provider: 'paystack',
      eventId: 'refund:refund.processed:4242',
    });
  });

  it('[AC1] refund.failed is applied', async () => {
    await POST(req(body('refund.failed')));
    expect(apply).toHaveBeenCalledWith('refund.failed', expect.anything());
  });

  it('[AC1] a replay changes nothing and answers 200', async () => {
    processedCreate.mockRejectedValueOnce(
      Object.assign(new Error('E11000'), { code: 11000 })
    );
    const res = await POST(req(body('refund.processed')));
    expect(res.status).toBe(200);
    expect(apply).not.toHaveBeenCalled();
  });

  it('[AC1] an unknown refund answers 404 and leaves no dedup row', async () => {
    locate.mockResolvedValueOnce(null);
    const res = await POST(req(body('refund.processed')));
    expect(res.status).toBe(404);
    expect(processedCreate).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });
});
