/**
 * @requirement REQ-056 — WhatsApp inbound-message router
 *
 * AC8 — handleWebhook integration: inbound branch delegates to the new
 * WhatsAppInboundService; status branch (REQ-055) untouched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInboundHandle = vi.fn();

vi.mock('@/services/whatsapp-inbound-service', () => ({
  WhatsAppInboundService: {
    handle: (...args: unknown[]) => mockInboundHandle(...args),
  },
}));

const mockUpdateStatus = vi.fn();

vi.mock('@/services/notification-log-service', () => ({
  NotificationLogService: {
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
  },
}));

beforeEach(() => {
  mockInboundHandle.mockReset();
  mockInboundHandle.mockResolvedValue('sent_welcome_new_user');
  mockUpdateStatus.mockReset();
  mockUpdateStatus.mockResolvedValue(true);
});

describe('REQ-056 WhatsAppService.handleWebhook inbound branch', () => {
  it('AC8 — inbound messages payload routes to WhatsAppInboundService.handle once per message', async () => {
    const { WhatsAppService } = await import('@/lib/whatsapp');
    const inboundPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '2348012345678',
                    id: 'wamid.A1',
                    type: 'text',
                    text: { body: 'hi' },
                  },
                  {
                    from: '2348012345679',
                    id: 'wamid.A2',
                    type: 'text',
                    text: { body: 'STOP' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    await WhatsAppService.handleWebhook(inboundPayload);
    expect(mockInboundHandle).toHaveBeenCalledTimes(2);
  });

  it('AC8 — status-events payload does NOT call WhatsAppInboundService (REQ-055 path stays untouched)', async () => {
    const { WhatsAppService } = await import('@/lib/whatsapp');
    const statusPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: 'wamid.S1',
                    status: 'delivered',
                    timestamp: '1700000000',
                    recipient_id: '2348012345678',
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    await WhatsAppService.handleWebhook(statusPayload);
    expect(mockInboundHandle).not.toHaveBeenCalled();
    expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
  });
});
