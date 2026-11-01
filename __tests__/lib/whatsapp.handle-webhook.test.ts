/**
 * @requirement REQ-116 — AC5: handleWebhook processes every entry[] and
 * changes[] item, and does not log the raw payload (AC3).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHandle = vi.fn();
vi.mock('@/services/whatsapp-inbound-service', () => ({
  WhatsAppInboundService: { handle: (...a: unknown[]) => mockHandle(...a) },
}));
const mockUpdateStatus = vi.fn();
vi.mock('@/services/notification-log-service', () => ({
  NotificationLogService: {
    updateStatus: (...a: unknown[]) => mockUpdateStatus(...a),
  },
}));

beforeEach(() => {
  mockHandle.mockReset().mockResolvedValue('ok');
  mockUpdateStatus.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('REQ-116 handleWebhook', () => {
  it('AC5 — processes messages and statuses across multiple entries and changes', async () => {
    const { WhatsAppService } = await import('@/lib/whatsapp');
    await WhatsAppService.handleWebhook({
      entry: [
        {
          changes: [
            { value: { messages: [{ id: 'm1', from: '1', type: 'text' }] } },
            { value: { statuses: [{ id: 's1', status: 'delivered' }] } },
          ],
        },
        {
          changes: [
            {
              value: {
                messages: [
                  { id: 'm2', from: '2', type: 'text' },
                  { id: 'm3', from: '3', type: 'text' },
                ],
              },
            },
            { value: { statuses: [{ id: 's2', status: 'read' }] } },
          ],
        },
      ],
    });
    expect(
      mockHandle.mock.calls.map((c) => (c[0] as { id: string }).id)
    ).toEqual(['m1', 'm2', 'm3']);
    expect(mockUpdateStatus.mock.calls.map((c) => c[0])).toEqual(['s1', 's2']);
  });

  it('AC3 — message bodies and numbers are not logged', async () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a) => {
      logs.push(JSON.stringify(a));
    });
    const { WhatsAppService } = await import('@/lib/whatsapp');
    await WhatsAppService.handleWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'm1',
                    from: '2348099',
                    type: 'text',
                    text: { body: 'secret body' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(logs.join('\n')).not.toContain('secret body');
  });

  it('AC5 — an empty or malformed payload is a no-op', async () => {
    const { WhatsAppService } = await import('@/lib/whatsapp');
    await expect(WhatsAppService.handleWebhook({})).resolves.toBeUndefined();
    await expect(
      WhatsAppService.handleWebhook({ entry: [{}, { changes: [{}] }] })
    ).resolves.toBeUndefined();
  });
});
