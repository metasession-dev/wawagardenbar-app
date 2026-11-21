/**
 * @requirement REQ-123 — AC1
 * @srs REQ-PAY-005, REQ-CHECKOUT-010
 *
 * A forced provider (customer orders) wins over the `activeProvider` setting;
 * staff flows omit it and keep routing by the setting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getPaymentSettings = vi.hoisted(() => vi.fn());
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: { getPaymentSettings },
}));
const paystackInit = vi.hoisted(() => vi.fn());
const paystackVerify = vi.hoisted(() => vi.fn());
vi.mock('@/services/paystack-service', () => ({
  PaystackService: {
    initializeTransaction: paystackInit,
    verifyTransaction: paystackVerify,
  },
}));
const monnifyInit = vi.hoisted(() => vi.fn());
const monnifyVerify = vi.hoisted(() => vi.fn());
vi.mock('@/services/monnify-service', () => ({
  MonnifyService: {
    initializePayment: monnifyInit,
    verifyPayment: monnifyVerify,
  },
}));

import { PaymentService } from '@/services/payment-service';

const PARAMS = {
  amount: 5500,
  customerName: 'Ada',
  customerEmail: 'a@b.co',
  paymentReference: 'WAWA-1',
  paymentDescription: 'Order',
  redirectUrl: 'https://app/orders/1',
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ENABLE_TEST_PAYMENTS;
  getPaymentSettings.mockResolvedValue({ activeProvider: 'monnify' });
  paystackInit.mockResolvedValue({
    data: {
      authorization_url: 'https://checkout.paystack.com/abc',
      access_code: 'abc',
      reference: 'WAWA-1',
    },
  });
  monnifyInit.mockResolvedValue({
    responseBody: {
      checkoutUrl: 'https://monnify/c',
      paymentReference: 'WAWA-1',
    },
  });
});

describe('REQ-123 AC1: provider routing', () => {
  it('a forced paystack provider is used although activeProvider is monnify', async () => {
    const r = await PaymentService.initializePayment({
      ...PARAMS,
      provider: 'paystack',
    });
    expect(r).toMatchObject({
      provider: 'paystack',
      checkoutUrl: 'https://checkout.paystack.com/abc',
      accessCode: 'abc',
    });
    expect(paystackInit).toHaveBeenCalledOnce();
    expect(paystackInit.mock.calls[0][0].amount).toBe(550000);
    expect(monnifyInit).not.toHaveBeenCalled();
  });

  it('with no forced provider the staff flow still follows activeProvider', async () => {
    const r = await PaymentService.initializePayment(PARAMS);
    expect(r.provider).toBe('monnify');
    expect(monnifyInit).toHaveBeenCalledOnce();
    expect(paystackInit).not.toHaveBeenCalled();

    getPaymentSettings.mockResolvedValue({ activeProvider: 'paystack' });
    const r2 = await PaymentService.initializePayment(PARAMS);
    expect(r2.provider).toBe('paystack');
  });

  it('verifyPayment uses the provider stored on the order, not the setting', async () => {
    paystackVerify.mockResolvedValue({
      data: {
        id: 7,
        status: 'success',
        amount: 550000,
        paid_at: '2026-11-19T12:00:00.000Z',
      },
    });
    const r = await PaymentService.verifyPayment('WAWA-1', 'paystack');
    expect(r).toMatchObject({
      provider: 'paystack',
      status: 'PAID',
      amount: 5500,
    });
    expect(monnifyVerify).not.toHaveBeenCalled();
  });

  it('the test-payments mock honours the forced provider and returns an access code', async () => {
    process.env.ENABLE_TEST_PAYMENTS = 'true';
    const r = await PaymentService.initializePayment({
      ...PARAMS,
      provider: 'paystack',
    });
    expect(r.provider).toBe('paystack');
    expect(r.accessCode).toBe('test_WAWA-1');
    expect(paystackInit).not.toHaveBeenCalled();
  });
});
