/**
 * @requirement REQ-117 (AC10, REQ-AUTHC-006) — an inbound WhatsApp message can
 * create or identify a user but never mints a session: the webhook neither
 * reads nor writes the iron-session cookie.
 */
import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const getIronSession = vi.fn();
vi.mock('iron-session', () => ({
  getIronSession: (...a: unknown[]) => getIronSession(...a),
}));

const handleWebhook = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    handleWebhook: (...a: unknown[]) => handleWebhook(...a),
    verifyWebhook: () => false,
  },
}));

const SECRET = 'app-secret';

beforeEach(() => {
  vi.stubEnv('WHATSAPP_APP_SECRET', SECRET);
  getIronSession.mockReset();
  handleWebhook.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('REQ-117 AC10 — the webhook never creates a session', () => {
  it('AC10 — a signed inbound message sets no cookie and never touches iron-session', async () => {
    const body = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid.1',
                    from: '2348012345678',
                    type: 'text',
                    text: { body: 'hello' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${crypto
      .createHmac('sha256', SECRET)
      .update(body)
      .digest('hex')}`;
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const response = await POST(
      new NextRequest('http://localhost/api/webhooks/whatsapp', {
        method: 'POST',
        body,
        headers: { 'x-hub-signature-256': signature },
      })
    );

    expect(response.status).toBe(200);
    expect(handleWebhook).toHaveBeenCalledTimes(1);
    expect(getIronSession).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('AC10 — the inbound router and WhatsApp service do not import the session module', async () => {
    const { readFileSync } = await import('fs');
    for (const file of [
      'services/whatsapp-inbound-service.ts',
      'lib/whatsapp.ts',
      'app/api/webhooks/whatsapp/route.ts',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(
        /iron-session|@\/lib\/session|getIronSession/
      );
    }
  });
});
