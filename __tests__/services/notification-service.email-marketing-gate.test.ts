/**
 * @requirement REQ-063 — Bundle B (P4 #21 explicit-consent split)
 *
 * AC4: When `NotificationService.send` resolves to the email channel
 * and the template category is `marketing`, the send is blocked unless
 * `communicationPreferences.emailMarketing === true`. Transactional and
 * authentication categories pass through unchanged (gated only by the
 * existing `cp.email` boolean).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockUserFindById = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findById: (...a: unknown[]) => mockUserFindById(...a),
  },
}));

const mockSendWhatsApp = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendMessage: (...a: unknown[]) => mockSendWhatsApp(...a),
  },
}));

vi.mock('@/services/notification-log-service', () => ({
  NotificationLogService: {
    recordAttempt: vi.fn().mockResolvedValue(undefined),
  },
}));

function userWith(cp: Record<string, unknown>) {
  return {
    lean: vi.fn().mockResolvedValue({
      phone: '+2348011112222',
      preferences: {
        communicationPreferences: cp,
      },
    }),
  };
}

beforeEach(() => {
  mockUserFindById.mockReset();
  mockSendWhatsApp.mockReset().mockResolvedValue({
    success: false,
    message: 'TEMPLATE_NOT_FOUND',
  });
});

describe('REQ-063 NotificationService — emailMarketing gate (AC4)', () => {
  it('blocks marketing-category email when emailMarketing === false', async () => {
    mockUserFindById.mockReturnValue(userWith({ emailMarketing: false }));
    const emailClosure = vi.fn().mockResolvedValue(undefined);

    const { NotificationService } = await import(
      '@/services/notification-service'
    );

    const result = await NotificationService.send({
      userId: 'user-1',
      templateKey: 'reward_earned', // 'marketing' per TEMPLATE_CATEGORIES
      email: emailClosure,
    });

    expect(emailClosure).not.toHaveBeenCalled();
    expect(result.sentVia).toBe('none');
  });

  it('allows marketing-category email when emailMarketing === true', async () => {
    mockUserFindById.mockReturnValue(userWith({ emailMarketing: true }));
    const emailClosure = vi.fn().mockResolvedValue(undefined);

    const { NotificationService } = await import(
      '@/services/notification-service'
    );

    const result = await NotificationService.send({
      userId: 'user-2',
      templateKey: 'reward_earned',
      email: emailClosure,
    });

    expect(emailClosure).toHaveBeenCalledTimes(1);
    expect(result.sentVia).toBe('email');
  });

  it('transactional-category email is NOT blocked by emailMarketing === false', async () => {
    mockUserFindById.mockReturnValue(
      userWith({ emailMarketing: false, email: true })
    );
    const emailClosure = vi.fn().mockResolvedValue(undefined);

    const { NotificationService } = await import(
      '@/services/notification-service'
    );

    const result = await NotificationService.send({
      userId: 'user-3',
      templateKey: 'order_confirmation', // 'transactional'
      email: emailClosure,
    });

    expect(emailClosure).toHaveBeenCalledTimes(1);
    expect(result.sentVia).toBe('email');
  });
});
