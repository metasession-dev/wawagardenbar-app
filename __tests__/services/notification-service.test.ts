/**
 * @requirement REQ-054 — `NotificationService.send()` channel-fallback wrapper
 *
 * Orchestrator tests. Mocks the channel boundaries (WhatsAppService,
 * UserModel, the email/SMS closures passed by callers) so the test
 * exercises just the routing + consent + fallback logic.
 *
 * Channel order: WhatsApp → email → SMS. First success wins. Consent
 * gating per category:
 *   - transactional   → whatsappTransactional
 *   - marketing       → whatsappMarketing
 *   - authentication  → no consent check
 *   - email           → email (single boolean across both intents in v1)
 *   - sms             → sms   (single boolean across both intents in v1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockSendMessage = vi.fn();
const mockIsEnabled = vi.fn(() => true);
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    // The orchestrator reads `WhatsAppService.isEnabled` indirectly via
    // sendMessage's own gate. We let the mock control success/failure.
  },
}));

const mockFindById = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    // Return a chainable thenable so both `await UserModel.findById(id)`
    // and `await UserModel.findById(id).lean()` resolve to the mock value.
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

const USER_ID = '65a1b2c3d4e5f6a7b8c9d0ff';

function buildUser(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

beforeEach(() => {
  mockSendMessage.mockReset();
  mockIsEnabled.mockReset();
  mockFindById.mockReset();
  // Default: WhatsApp send succeeds.
  mockSendMessage.mockResolvedValue({ success: true, messageId: 'mid-1' });
});

describe('REQ-054 NotificationService.send', () => {
  it('AC4 — all opted in, WA enabled: WhatsApp wins; email + SMS not called', async () => {
    mockFindById.mockResolvedValue(buildUser());
    const emailFn = vi.fn().mockResolvedValue(undefined);
    const smsFn = vi.fn().mockResolvedValue({ success: true });

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      whatsapp: { params: ['1234', '₦5,500', '25 minutes'] },
      email: emailFn,
      sms: smsFn,
    });

    expect(result.sentVia).toBe('whatsapp');
    expect(result.success).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(emailFn).not.toHaveBeenCalled();
    expect(smsFn).not.toHaveBeenCalled();
  });

  it('AC3 — whatsappTransactional false + email true: WA skipped, email wins', async () => {
    mockFindById.mockResolvedValue(
      buildUser({
        preferences: {
          communicationPreferences: {
            email: true,
            sms: true,
            push: false,
            whatsappTransactional: false,
            whatsappMarketing: false,
          },
        },
      })
    );
    const emailFn = vi.fn().mockResolvedValue(undefined);
    const smsFn = vi.fn().mockResolvedValue({ success: true });

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      whatsapp: { params: ['1234', '₦5,500', '25 minutes'] },
      email: emailFn,
      sms: smsFn,
    });

    expect(result.sentVia).toBe('email');
    expect(result.success).toBe(true);
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(emailFn).toHaveBeenCalledTimes(1);
    expect(smsFn).not.toHaveBeenCalled();
  });

  it('AC4 — all opted out for transactional template: sentVia "none", no closures called', async () => {
    mockFindById.mockResolvedValue(
      buildUser({
        preferences: {
          communicationPreferences: {
            email: false,
            sms: false,
            push: false,
            whatsappTransactional: false,
            whatsappMarketing: false,
          },
        },
      })
    );
    const emailFn = vi.fn();
    const smsFn = vi.fn();

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      whatsapp: { params: ['1234', '₦5,500', '25 minutes'] },
      email: emailFn,
      sms: smsFn,
    });

    expect(result.sentVia).toBe('none');
    expect(result.success).toBe(false);
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(emailFn).not.toHaveBeenCalled();
    expect(smsFn).not.toHaveBeenCalled();
  });

  it('AC3 — marketing template + whatsappMarketing false + emailMarketing true: email fires', async () => {
    // REQ-063 — marketing-category email now gated on emailMarketing.
    // Flip the user's emailMarketing to true so we still test the WA-skip
    // → email-fallback path for marketing templates.
    mockFindById.mockResolvedValue(
      buildUser({
        preferences: {
          communicationPreferences: {
            email: true,
            sms: true,
            push: false,
            whatsappTransactional: true,
            whatsappMarketing: false,
            emailMarketing: true,
          },
        },
      })
    );
    const emailFn = vi.fn().mockResolvedValue(undefined);

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'reward_earned',
      whatsapp: { params: ['Adaeze', '55', '420', '₦4,200'] },
      email: emailFn,
    });

    expect(result.sentVia).toBe('email');
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(emailFn).toHaveBeenCalledTimes(1);
  });

  it('AC3 — authentication template ignores user consent (OTP exemption)', async () => {
    mockFindById.mockResolvedValue(
      buildUser({
        preferences: {
          communicationPreferences: {
            email: false,
            sms: false,
            push: false,
            whatsappTransactional: false,
            whatsappMarketing: false,
          },
        },
      })
    );

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'verification_pin',
      whatsapp: { params: ['1234'] },
    });

    expect(result.sentVia).toBe('whatsapp');
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it('AC4 — WA returns failure → email fallback fires', async () => {
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
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(emailFn).toHaveBeenCalledTimes(1);
    // Both attempts in the trail.
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]).toMatchObject({
      channel: 'whatsapp',
      success: false,
    });
    expect(result.attempts[1]).toMatchObject({
      channel: 'email',
      success: true,
    });
  });

  it('AC2 — unknown templateKey throws (no silent send)', async () => {
    mockFindById.mockResolvedValue(buildUser());
    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    await expect(
      NotificationService.send({
        userId: USER_ID,
        templateKey: 'order_carnivore_combo' as unknown as string,
        whatsapp: { params: [] },
      })
    ).rejects.toThrow(/unknown templateKey/i);
  });

  it('AC2 — explicit category override wins over the map lookup', async () => {
    // Pass `order_confirmation` (transactional in the map) but override
    // to `marketing` — orchestrator should check `whatsappMarketing`
    // (false by default), so WA is skipped. REQ-063 also routes email
    // through the emailMarketing gate; flip it true so the override fires
    // through to email.
    mockFindById.mockResolvedValue(
      buildUser({
        preferences: {
          communicationPreferences: {
            email: true,
            sms: true,
            push: false,
            whatsappTransactional: true,
            whatsappMarketing: false,
            emailMarketing: true,
          },
        },
      })
    );
    const emailFn = vi.fn().mockResolvedValue(undefined);

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      category: 'marketing',
      whatsapp: { params: ['1234', '₦5,500', '25 minutes'] },
      email: emailFn,
    });

    expect(result.sentVia).toBe('email');
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('opts.whatsapp omitted: WA channel skipped without consent check', async () => {
    mockFindById.mockResolvedValue(buildUser());
    const emailFn = vi.fn().mockResolvedValue(undefined);

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      email: emailFn,
    });

    expect(result.sentVia).toBe('email');
    expect(mockSendMessage).not.toHaveBeenCalled();
    // Only one attempt logged.
    expect(result.attempts).toHaveLength(1);
  });

  it('AC4 — all closures provided + WA fail + email throws: falls to SMS', async () => {
    mockFindById.mockResolvedValue(buildUser());
    mockSendMessage.mockResolvedValue({
      success: false,
      errorCode: 'NETWORK',
    });
    const emailFn = vi.fn().mockRejectedValue(new Error('SMTP down'));
    const smsFn = vi.fn().mockResolvedValue({ success: true });

    const { NotificationService } = await import(
      '@/services/notification-service'
    );
    const result = await NotificationService.send({
      userId: USER_ID,
      templateKey: 'order_confirmation',
      whatsapp: { params: ['1234', '₦5,500', '25 minutes'] },
      email: emailFn,
      sms: smsFn,
    });

    expect(result.sentVia).toBe('sms');
    expect(result.success).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(emailFn).toHaveBeenCalledTimes(1);
    expect(smsFn).toHaveBeenCalledTimes(1);
    expect(result.attempts).toHaveLength(3);
  });
});
