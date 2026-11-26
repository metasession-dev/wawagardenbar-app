/**
 * @requirement REQ-PAY-011 (REQ-128 AC1) — PaystackService.createRefund
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getPaymentSettings: vi.fn().mockResolvedValue({
      paystack: { secretKey: 'sk_test_x', publicKey: 'pk_test_x' },
    }),
  },
}));

import { PaystackService } from '@/services/paystack-service';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('PaystackService.createRefund', () => {
  it('[AC1] full refund: POST /refund with the transaction reference and no amount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: { id: 4242, status: 'pending' },
      }),
    });
    const res = await PaystackService.createRefund({
      reference: 'WG-REF-1',
      reason: 'Cancelled by customer',
    });
    expect(res).toEqual({ refundId: '4242', status: 'pending' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.paystack.co/refund');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.transaction).toBe('WG-REF-1');
    expect(body).not.toHaveProperty('amount');
    expect(init.headers.Authorization).toBe('Bearer sk_test_x');
  });

  it('[AC1] partial refund sends the amount in kobo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, data: { id: 7, status: 'pending' } }),
    });
    await PaystackService.createRefund({
      reference: 'WG-REF-1',
      amountKobo: 200000,
      reason: 'Partial',
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).amount).toBe(200000);
  });

  it('[AC1] e2e seam: a sk_test_e2e_ secret simulates the response and never calls the network', async () => {
    const { SystemSettingsService } = await import(
      '@/services/system-settings-service'
    );
    vi.mocked(SystemSettingsService.getPaymentSettings).mockResolvedValueOnce({
      paystack: { secretKey: 'sk_test_e2e_req123_secret', publicKey: 'pk' },
    } as never);
    const res = await PaystackService.createRefund({
      reference: 'WG-REF-1',
      reason: 'x',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res).toEqual({
      refundId: PaystackService.e2eRefundId('WG-REF-1'),
      status: 'pending',
    });
    expect(PaystackService.e2eRefundId('WG-REF-1')).toBe(
      PaystackService.e2eRefundId('WG-REF-1')
    );
    expect(PaystackService.e2eRefundId('WG-REF-2')).not.toBe(
      PaystackService.e2eRefundId('WG-REF-1')
    );
  });

  it("[AC1] throws with Paystack's message when the API refuses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ status: false, message: 'Refunds are not enabled' }),
    });
    await expect(
      PaystackService.createRefund({ reference: 'r', reason: 'x' })
    ).rejects.toThrow('Refunds are not enabled');
  });
});
