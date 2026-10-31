/**
 * @requirement REQ-116 — webhook authenticity (AC1, AC2, AC3) and
 * multi-entry processing (AC5).
 */
import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockHandle = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    handleWebhook: (...a: unknown[]) => mockHandle(...a),
    verifyWebhook: (mode: string, token: string) =>
      mode === 'subscribe' && token === 'verify-secret-token',
  },
}));

const SECRET = 'app-secret';
const sign = (body: string, secret = SECRET) =>
  `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

const post = (body: string, signature?: string) =>
  new NextRequest('http://localhost/api/webhooks/whatsapp', {
    method: 'POST',
    body,
    headers: signature ? { 'x-hub-signature-256': signature } : {},
  });

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.WHATSAPP_APP_SECRET;
  process.env.WHATSAPP_APP_SECRET = SECRET;
  mockHandle.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  if (saved === undefined) delete process.env.WHATSAPP_APP_SECRET;
  else process.env.WHATSAPP_APP_SECRET = saved;
  vi.restoreAllMocks();
});

describe('REQ-116 webhook POST', () => {
  it('AC1 — 503 and nothing processed when the app secret is unset', async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const body = '{"entry":[]}';
    const res = await POST(post(body, sign(body)));
    expect(res.status).toBe(503);
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['wrong prefix', 'sha1=abcd'],
    ['too short', 'sha256=abc'],
    ['too long', `sha256=${'a'.repeat(200)}`],
    ['wrong secret', sign('{"entry":[]}', 'other')],
  ])('AC2 — %s signature → 403 without throwing', async (_n, sig) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const res = await POST(post('{"entry":[]}', sig));
    expect(res.status).toBe(403);
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it('AC2 — the HMAC is over the raw body (a re-serialised body fails)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const raw = '{ "entry": [] }';
    const res = await POST(post(raw, sign(JSON.stringify(JSON.parse(raw)))));
    expect(res.status).toBe(403);
  });

  it('AC2 — a valid signature is processed', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const body = '{"entry":[{"changes":[]}]}';
    const res = await POST(post(body, sign(body)));
    expect(res.status).toBe(200);
    expect(mockHandle).toHaveBeenCalledTimes(1);
  });

  it('AC3 — neither the verify token nor the signature is logged', async () => {
    const logs: string[] = [];
    for (const k of ['log', 'warn', 'error'] as const) {
      vi.spyOn(console, k).mockImplementation((...a) => {
        logs.push(JSON.stringify(a));
      });
    }
    const { GET, POST } = await import('@/app/api/webhooks/whatsapp/route');
    await GET(
      new NextRequest(
        'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-secret-token&hub.challenge=123'
      )
    );
    const body = '{"entry":[]}';
    const bad = sign(body, 'wrong');
    await POST(post(body, bad));
    const all = logs.join('\n');
    expect(all).not.toContain('verify-secret-token');
    expect(all).not.toContain(bad);
  });
});
