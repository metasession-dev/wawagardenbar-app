/**
 * @requirement REQ-125 (AC3) — a switched-off WhatsApp notification is
 * suppressed, logged as `suppressed_admin_disabled`, and the calling flow
 * completes (falls through to email like a consent-off attempt).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const mockSendMessage = vi.fn();
const mockSendText = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendMessage: (...a: unknown[]) => mockSendMessage(...a),
    sendTextMessage: (...a: unknown[]) => mockSendText(...a),
  },
}));

const mockIsSuppressed = vi.fn();
vi.mock('@/lib/whatsapp-send-gate', async (orig) => ({
  ...(await orig<typeof import('@/lib/whatsapp-send-gate')>()),
  isTemplateSuppressed: (...a: unknown[]) => mockIsSuppressed(...a),
}));

const mockRecord = vi.fn().mockResolvedValue(undefined);
vi.mock('@/services/notification-log-service', () => ({
  NotificationLogService: {
    recordAttempt: (...a: unknown[]) => mockRecord(...a),
  },
}));

vi.mock('@/models', () => ({
  UserModel: {
    findById: () => ({
      lean: () =>
        Promise.resolve({
          phone: '+2347000000001',
          email: 'u@example.com',
          preferences: {
            communicationPreferences: {
              email: true,
              sms: true,
              whatsappTransactional: true,
              whatsappMarketing: false,
            },
          },
        }),
    }),
  },
}));

const USER_ID = '65a1b2c3d4e5f6a7b8c9d0ff';

beforeEach(() => {
  mockSendMessage.mockReset();
  mockSendText.mockReset();
  mockIsSuppressed.mockReset();
  mockRecord.mockClear();
});

describe('NotificationService.send with a switched-off notification', () => {
  it('free-form support reply: not sent, logged as suppressed, email still delivered', async () => {
    mockIsSuppressed.mockResolvedValue(true);
    const email = vi.fn().mockResolvedValue(undefined);
    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'support_reply',
      whatsapp: { params: [], freeFormText: 'We are on it' },
      email,
    });
    expect(mockSendText).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
    const wa = result.attempts.find((a) => a.channel === 'whatsapp');
    expect(wa?.success).toBe(false);
    expect(wa?.errorCode).toBe('suppressed_admin_disabled');
    expect(email).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'support_reply',
        channel: 'whatsapp',
        success: false,
        errorCode: 'suppressed_admin_disabled',
      })
    );
  });

  it('template send: a SUPPRESSED_ADMIN_DISABLED result from the gate is logged as suppressed, not failed', async () => {
    mockIsSuppressed.mockResolvedValue(false);
    mockSendMessage.mockResolvedValue({
      success: false,
      errorCode: 'SUPPRESSED_ADMIN_DISABLED',
      message: 'off',
    });
    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'payment_link',
      whatsapp: { params: ['a', 'b'] },
    });
    const wa = result.attempts.find((a) => a.channel === 'whatsapp');
    expect(wa?.errorCode).toBe('suppressed_admin_disabled');
    expect(result.success).toBe(false);
  });

  it('sends normally when nothing is suppressed', async () => {
    mockIsSuppressed.mockResolvedValue(false);
    mockSendText.mockResolvedValue({ success: true, messageId: 'm1' });
    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'support_reply',
      whatsapp: { params: [], freeFormText: 'hello' },
    });
    expect(mockSendText).toHaveBeenCalledTimes(1);
    expect(result.sentVia).toBe('whatsapp');
  });
});
