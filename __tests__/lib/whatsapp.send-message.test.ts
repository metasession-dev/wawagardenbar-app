/**
 * @requirement REQ-115 — WhatsAppService.sendMessage header/body/button params,
 * backward compatibility and the default Graph API version.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppService, buildTemplateComponents } from '@/lib/whatsapp';

const fetchMock = vi.fn();
const ENV_KEYS = [
  'ENABLE_WHATSAPP_NOTIFICATIONS',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_API_VERSION',
  'WHATSAPP_API_URL',
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.ENABLE_WHATSAPP_NOTIFICATIONS = 'true';
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '12345';
  delete process.env.WHATSAPP_API_VERSION;
  delete process.env.WHATSAPP_API_URL;
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

function sentPayload() {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

describe('REQ-115 sendMessage', () => {
  it('AC2 — a plain string[] is still sent as body parameters only (old callers unchanged)', async () => {
    await WhatsAppService.sendMessage('+2348012345678', 'order_status_update', [
      '1234',
      'ready',
    ]);
    const payload = sentPayload();
    expect(payload.to).toBe('2348012345678');
    expect(payload.template.components).toEqual([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '1234' },
          { type: 'text', text: 'ready' },
        ],
      },
    ]);
  });

  it('AC2 — header, body and URL-button parameters become separate components', async () => {
    await WhatsAppService.sendMessage('+2348012345678', 'support_reply', {
      headerParams: ['TKT-100'],
      bodyParams: ['Ada', 'Missing item', 'Done'],
      buttonParams: [{ index: 0, params: ['TKT-100'] }],
    });
    expect(sentPayload().template.components).toEqual([
      { type: 'header', parameters: [{ type: 'text', text: 'TKT-100' }] },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Ada' },
          { type: 'text', text: 'Missing item' },
          { type: 'text', text: 'Done' },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: 'TKT-100' }],
      },
    ]);
  });

  it('AC2 — an empty headerParams array adds no header component', () => {
    const components = buildTemplateComponents({
      headerParams: [],
      bodyParams: ['a'],
    });
    expect(components.map((c) => c.type)).toEqual(['body']);
  });

  it('AC7 — the default Graph API version is v23.0', async () => {
    await WhatsAppService.sendMessage('+2348012345678', 'welcome_back', [
      'Ada',
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://graph.facebook.com/v23.0/12345/messages'
    );
  });

  it('AC7 — WHATSAPP_API_VERSION still overrides the default', async () => {
    process.env.WHATSAPP_API_VERSION = 'v18.0';
    await WhatsAppService.sendMessage('+2348012345678', 'welcome_back', [
      'Ada',
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://graph.facebook.com/v18.0/12345/messages'
    );
  });

  it('AC7 — with ENABLE_WHATSAPP_NOTIFICATIONS off, nothing is sent', async () => {
    process.env.ENABLE_WHATSAPP_NOTIFICATIONS = 'false';
    const result = await WhatsAppService.sendMessage(
      '+2348012345678',
      'welcome_back',
      ['Ada']
    );
    expect(result).toMatchObject({
      success: false,
      errorCode: 'SERVICE_DISABLED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
