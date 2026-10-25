/**
 * @requirement REQ-115 (D17) — Meta code 100 is reported as INVALID_PHONE only
 * when the error is about the recipient.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppService, classifyInvalidParameterError } from '@/lib/whatsapp';

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.ENABLE_WHATSAPP_NOTIFICATIONS = 'true';
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '12345';
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function metaError(message: string, details?: string) {
  return {
    ok: false,
    json: async () => ({
      error: {
        message,
        type: 'OAuthException',
        code: 100,
        error_data: details
          ? { messaging_product: 'whatsapp', details }
          : undefined,
        fbtrace_id: 'trace-1',
      },
    }),
  };
}

describe('REQ-115 D17 — code 100 mapping', () => {
  it('AC16 — the exact UAT PIN-length error is SEND_FAILED, not INVALID_PHONE', async () => {
    fetchMock.mockResolvedValue(
      metaError(
        '(#100) Invalid parameter',
        'The authentication code parameter must be exactly 6 numeric digits for this WhatsApp Business Account.'
      )
    );
    const result = await WhatsAppService.sendVerificationPinWhatsApp(
      '+2348012345678',
      '1234'
    );
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SEND_FAILED');
    expect(result.errorCode).not.toBe('INVALID_PHONE');
  });

  it('AC16 — a code-100 error with no details is SEND_FAILED', () => {
    const mapped = classifyInvalidParameterError({
      error: {
        message: '(#100) Invalid parameter',
        type: 'x',
        code: 100,
        fbtrace_id: 't',
      },
    });
    expect(mapped.errorCode).toBe('SEND_FAILED');
  });

  it('AC16 — a code-100 error naming the recipient stays INVALID_PHONE', async () => {
    fetchMock.mockResolvedValue(
      metaError(
        '(#100) Invalid parameter',
        'Recipient phone number not in allowed list'
      )
    );
    const result = await WhatsAppService.sendMessage(
      '+2348012345678',
      'welcome_back',
      ['Ada']
    );
    expect(result.errorCode).toBe('INVALID_PHONE');
  });

  it('AC16 — Meta’s details are logged for the non-phone case', async () => {
    fetchMock.mockResolvedValue(
      metaError('(#100) Invalid parameter', 'Some template problem')
    );
    await WhatsAppService.sendMessage('+2348012345678', 'welcome_back', [
      'Ada',
    ]);
    expect(console.error).toHaveBeenCalledWith(
      'WhatsApp invalid-parameter error (not phone related):',
      expect.objectContaining({ details: 'Some template problem' })
    );
  });
});
