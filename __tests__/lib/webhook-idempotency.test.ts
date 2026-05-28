/**
 * @requirement REQ-049 — Webhook idempotency guard (#117 P0 #1)
 *
 * Unit tests for `recordWebhookEvent`. The model is mocked; the duplicate-key
 * (E11000) branch is what makes this race-safe in production, so it's the most
 * important behaviour to cover.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const mockCreate = vi.fn();
vi.mock('@/models/processed-webhook-event-model', () => ({
  default: { create: (...a: unknown[]) => mockCreate(...a) },
}));

import { recordWebhookEvent } from '@/lib/webhook-idempotency';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('REQ-049: recordWebhookEvent', () => {
  it("returns 'new' on first delivery (create succeeds)", async () => {
    mockCreate.mockResolvedValue({ _id: 'pwe-1' });

    const result = await recordWebhookEvent({
      provider: 'paystack',
      eventId: 'evt_123',
      paymentReference: 'pst-ref-abc',
      eventType: 'charge.success',
    });

    expect(result).toBe('new');
    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.provider).toBe('paystack');
    expect(arg.eventId).toBe('evt_123');
    expect(arg.paymentReference).toBe('pst-ref-abc');
    expect(arg.eventType).toBe('charge.success');
    expect(arg.receivedAt).toBeInstanceOf(Date);
  });

  it("returns 'duplicate' when create throws MongoDB duplicate-key (code 11000)", async () => {
    const dupErr = Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
    });
    mockCreate.mockRejectedValue(dupErr);

    const result = await recordWebhookEvent({
      provider: 'paystack',
      eventId: 'evt_123',
    });

    expect(result).toBe('duplicate');
  });

  it('rethrows on any other error (caller becomes a 500 — better than silent re-run)', async () => {
    mockCreate.mockRejectedValue(new Error('connection lost'));

    await expect(
      recordWebhookEvent({ provider: 'monnify', eventId: 'evt_xyz' })
    ).rejects.toThrow(/connection lost/);
  });

  it('namespaces providers — paystack and monnify both record cleanly with the same eventId', async () => {
    mockCreate.mockResolvedValue({ _id: 'pwe' });

    await recordWebhookEvent({ provider: 'paystack', eventId: 'shared-id' });
    await recordWebhookEvent({ provider: 'monnify', eventId: 'shared-id' });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[0][0].provider).toBe('paystack');
    expect(mockCreate.mock.calls[1][0].provider).toBe('monnify');
  });
});
