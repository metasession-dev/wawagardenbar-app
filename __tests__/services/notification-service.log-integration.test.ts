/**
 * @requirement REQ-055 — NotificationLog persistent audit log
 *
 * Integration coverage of REQ-054's logAttempt → REQ-055's
 * NotificationLogService.recordAttempt wire-up. Verifies that every
 * notification attempt produces an audit-log row AND that persistence
 * failures inside recordAttempt don't break the send path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockSendMessage = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  },
}));

const mockFindById = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findById: (...args: unknown[]) => {
      const result = mockFindById(...args);
      const thenable: {
        lean: () => typeof thenable;
        then: typeof Promise.prototype.then;
      } = {
        lean: () => thenable,
        then: (onF, onR) => Promise.resolve(result).then(onF, onR),
      };
      return thenable;
    },
  },
}));

const mockRecordAttempt = vi.fn();
vi.mock('@/services/notification-log-service', () => ({
  NotificationLogService: {
    recordAttempt: (...args: unknown[]) => mockRecordAttempt(...args),
  },
}));

const USER_ID = '65a1b2c3d4e5f6a7b8c9d0aa';

function buildUser() {
  return {
    _id: { toString: () => USER_ID },
    phone: '+2347000000001',
    email: 'user@example.com',
    preferences: {
      communicationPreferences: {
        email: true,
        sms: true,
        push: false,
        whatsappTransactional: true,
        whatsappMarketing: false,
      },
    },
  };
}

beforeEach(() => {
  mockSendMessage.mockReset();
  mockFindById.mockReset();
  mockRecordAttempt.mockReset();
  mockSendMessage.mockResolvedValue({
    success: true,
    messageId: 'wamid.integration-1',
  });
  mockRecordAttempt.mockResolvedValue('log-1');
});

describe('REQ-055 NotificationService.send → NotificationLogService.recordAttempt', () => {
  it('AC3 — WhatsApp success: recordAttempt called with messageId', async () => {
    mockFindById.mockResolvedValue(buildUser());
    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      whatsapp: { params: ['1234', '₦5,500', '25 minutes'] },
    });
    expect(result.sentVia).toBe('whatsapp');
    expect(mockRecordAttempt).toHaveBeenCalledTimes(1);
    const recordedAttempt = mockRecordAttempt.mock.calls[0][0] as {
      templateKey: string;
      userId: string;
      channel: string;
      success: boolean;
      messageId: string | null;
    };
    expect(recordedAttempt).toMatchObject({
      templateKey: 'order_confirmation',
      userId: USER_ID,
      channel: 'whatsapp',
      success: true,
      messageId: 'wamid.integration-1',
    });
  });

  it('AC3 — WhatsApp fail → email fallback: recordAttempt called twice', async () => {
    mockFindById.mockResolvedValue(buildUser());
    mockSendMessage.mockResolvedValue({
      success: false,
      message: 'Template not found',
      errorCode: 'TEMPLATE_NOT_FOUND',
    });
    const emailFn = vi.fn().mockResolvedValue(undefined);

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      whatsapp: { params: ['1234', '₦5,500', '25 minutes'] },
      email: emailFn,
    });

    expect(result.sentVia).toBe('email');
    // One call per channel attempt.
    expect(mockRecordAttempt).toHaveBeenCalledTimes(2);
    const channels = mockRecordAttempt.mock.calls.map(
      (c) => (c[0] as { channel: string }).channel
    );
    expect(channels).toEqual(['whatsapp', 'email']);
  });

  it('AC6 — recordAttempt rejection does NOT break the send path', async () => {
    mockFindById.mockResolvedValue(buildUser());
    mockRecordAttempt.mockRejectedValue(new Error('Mongo down'));

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      whatsapp: { params: ['1234', '₦5,500', '25 minutes'] },
    });

    // Send still succeeds.
    expect(result.sentVia).toBe('whatsapp');
    expect(result.success).toBe(true);
  });
});
