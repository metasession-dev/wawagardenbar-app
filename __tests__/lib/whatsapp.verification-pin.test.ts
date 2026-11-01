/**
 * @requirement REQ-116 — verification_pin sends the code in the body and the
 * Copy-code button (fixes Meta #131008 "Required parameter is missing").
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppService } from '@/lib/whatsapp';

const fetchMock = vi.fn();
const ENV_KEYS = [
  'ENABLE_WHATSAPP_NOTIFICATIONS',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_PIN_TEMPLATE_NAME',
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.ENABLE_WHATSAPP_NOTIFICATIONS = 'true';
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '12345';
  delete process.env.WHATSAPP_PIN_TEMPLATE_NAME;
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({ messages: [{ id: 'wamid.1' }] }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
});

describe('REQ-116 sendVerificationPinWhatsApp', () => {
  it('AC9 — sends the exact payload: PIN in body and in URL button index 0', async () => {
    await WhatsAppService.sendVerificationPinWhatsApp(
      '+447825285212',
      '482916'
    );
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.to).toBe('447825285212');
    expect(payload.template.name).toBe('verification_pin');
    expect(payload.template.components).toEqual([
      { type: 'body', parameters: [{ type: 'text', text: '482916' }] },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: '482916' }],
      },
    ]);
  });

  it('AC9 — honours WHATSAPP_PIN_TEMPLATE_NAME and keeps the button parameter', async () => {
    process.env.WHATSAPP_PIN_TEMPLATE_NAME = 'custom_pin';
    await WhatsAppService.sendVerificationPinWhatsApp(
      '+447825285212',
      '111222'
    );
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.template.name).toBe('custom_pin');
    expect(
      payload.template.components.some(
        (c: { type: string }) => c.type === 'button'
      )
    ).toBe(true);
  });
});
