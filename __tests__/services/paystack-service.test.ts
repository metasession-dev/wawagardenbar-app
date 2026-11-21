/**
 * @requirement REQ-123 — AC2, AC3
 * @srs REQ-PAY-006, REQ-PAY-007
 *
 * The Paystack webhook signature is HMAC-SHA512 over the RAW request body,
 * compared in constant time; a customer with no email gets a phone-derived
 * placeholder because Paystack requires one.
 */
import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

const SECRET = 'sk_test_secret';
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getPaymentSettings: vi.fn().mockResolvedValue({
      paystack: { secretKey: 'sk_test_secret', publicKey: 'pk' },
    }),
  },
}));

import { PaystackService } from '@/services/paystack-service';

const sign = (body: string, secret = SECRET) =>
  crypto.createHmac('sha512', secret).update(body).digest('hex');

describe('REQ-123 AC3: validateWebhookSignature', () => {
  it('accepts a signature over the exact raw bytes', async () => {
    const raw = '{ "event":"charge.success",  "data":{"id":1} }';
    expect(await PaystackService.validateWebhookSignature(raw, sign(raw))).toBe(
      true
    );
  });

  it('rejects a signature computed over a re-serialised body', async () => {
    const raw = '{ "event":"charge.success",  "data":{"id":1} }';
    const reserialised = JSON.stringify(JSON.parse(raw));
    expect(reserialised).not.toBe(raw);
    expect(
      await PaystackService.validateWebhookSignature(raw, sign(reserialised))
    ).toBe(false);
  });

  it('rejects a wrong secret, an empty signature and a wrong-length signature', async () => {
    const raw = '{"event":"charge.success"}';
    expect(
      await PaystackService.validateWebhookSignature(raw, sign(raw, 'other'))
    ).toBe(false);
    expect(await PaystackService.validateWebhookSignature(raw, '')).toBe(false);
    expect(await PaystackService.validateWebhookSignature(raw, 'abc')).toBe(
      false
    );
  });
});

describe('REQ-123 AC2: placeholderEmail', () => {
  it('derives a deterministic address from the phone number digits', () => {
    expect(PaystackService.placeholderEmail('+234 801 234 5678')).toBe(
      '2348012345678@customers.wawagardenbar.com'
    );
    expect(PaystackService.placeholderEmail('+234 801 234 5678')).toBe(
      PaystackService.placeholderEmail('2348012345678')
    );
  });

  it('never produces an empty local part', () => {
    expect(PaystackService.placeholderEmail('')).toBe(
      'unknown@customers.wawagardenbar.com'
    );
  });
});
