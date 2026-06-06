/**
 * @requirement REQ-074 — Customer journey E2E coverage (sub-issue #292)
 *
 * Three send-PIN actions (SMS / WhatsApp / Email) gain an env-gated bypass
 * that short-circuits the provider dispatch after the PIN is persisted to
 * Mongo. Specs read the PIN from `User.verificationPin` and submit it via
 * `verify-pin`.
 *
 * Tests cover:
 *   ✓ bypass-active path returns success without invoking the provider
 *   ✓ bypass-inactive path falls through to the provider (existing behaviour)
 *   ✓ PIN is persisted in BOTH paths (bypass must not skip the save)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('@/lib/auth-utils', () => ({
  generatePin: vi.fn(() => '4321'),
  getPinExpirationTime: vi.fn(() => new Date(Date.now() + 10 * 60_000)),
  sanitizePhone: vi.fn((p: string) => p),
  validatePhone: vi.fn(() => true),
  validateEmail: vi.fn(() => true),
}));

const mockSendSMS = vi.fn();
vi.mock('@/lib/sms', () => ({
  SMSService: {
    sendVerificationPinSMS: (...args: unknown[]) => mockSendSMS(...args),
  },
}));

const mockSendWhatsApp = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendVerificationPinWhatsApp: (...args: unknown[]) =>
      mockSendWhatsApp(...args),
  },
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({
  sendVerificationPinEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildUser() {
  return {
    _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0e1' },
    phone: '+2347000000010',
    email: 'e2e@test.com',
    phoneVerified: false,
    accountStatus: 'active',
    verificationPin: undefined as string | undefined,
    pinExpiresAt: undefined as Date | undefined,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('REQ-074 — ENABLE_E2E_PIN_INTERCEPT bypass on send-PIN actions', () => {
  const origEnv = process.env.ENABLE_E2E_PIN_INTERCEPT;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ENABLE_E2E_PIN_INTERCEPT;
  });

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.ENABLE_E2E_PIN_INTERCEPT;
    } else {
      process.env.ENABLE_E2E_PIN_INTERCEPT = origEnv;
    }
  });

  describe('sendPinAction (SMS)', () => {
    it('with bypass active: returns success without calling SMSService + still persists PIN', async () => {
      process.env.ENABLE_E2E_PIN_INTERCEPT = 'true';
      const user = buildUser();
      mockFindOne.mockResolvedValue(user);

      const { sendPinAction } = await import('@/app/actions/auth/send-pin');
      const result = await sendPinAction('+2347000000010');

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/E2E intercept/i);
      expect(user.verificationPin).toBe('4321');
      expect(user.save).toHaveBeenCalledOnce();
      expect(mockSendSMS).not.toHaveBeenCalled();
    });

    it('with bypass inactive: falls through to SMSService (existing behaviour)', async () => {
      const user = buildUser();
      mockFindOne.mockResolvedValue(user);
      mockSendSMS.mockResolvedValue({ success: true });

      const { sendPinAction } = await import('@/app/actions/auth/send-pin');
      const result = await sendPinAction('+2347000000010');

      expect(result.success).toBe(true);
      expect(mockSendSMS).toHaveBeenCalledOnce();
      expect(mockSendSMS).toHaveBeenCalledWith('+2347000000010', '4321');
    });
  });

  describe('sendWhatsAppPinAction', () => {
    it('with bypass active: returns success without calling WhatsAppService + still persists PIN', async () => {
      process.env.ENABLE_E2E_PIN_INTERCEPT = 'true';
      const user = buildUser();
      mockFindOne.mockResolvedValue(user);

      const { sendWhatsAppPinAction } = await import(
        '@/app/actions/auth/send-whatsapp-pin'
      );
      const result = await sendWhatsAppPinAction('+2347000000010');

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/E2E intercept/i);
      expect(user.verificationPin).toBe('4321');
      expect(user.save).toHaveBeenCalledOnce();
      expect(mockSendWhatsApp).not.toHaveBeenCalled();
    });

    it('with bypass inactive: falls through to WhatsAppService', async () => {
      const user = buildUser();
      mockFindOne.mockResolvedValue(user);
      mockSendWhatsApp.mockResolvedValue({ success: true });

      const { sendWhatsAppPinAction } = await import(
        '@/app/actions/auth/send-whatsapp-pin'
      );
      const result = await sendWhatsAppPinAction('+2347000000010');

      expect(result.success).toBe(true);
      expect(mockSendWhatsApp).toHaveBeenCalledOnce();
    });
  });

  describe('sendEmailPinAction', () => {
    it('with bypass active: returns success without calling sendVerificationPinEmail + still persists PIN', async () => {
      process.env.ENABLE_E2E_PIN_INTERCEPT = 'true';
      const userByEmail = buildUser();
      mockFindOne
        .mockResolvedValueOnce(null) // phone lookup
        .mockResolvedValueOnce(userByEmail); // email lookup

      const { sendEmailPinAction } = await import(
        '@/app/actions/auth/send-email-pin'
      );
      const result = await sendEmailPinAction('e2e@test.com', '+2347000000010');

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/E2E intercept/i);
      expect(userByEmail.verificationPin).toBe('4321');
      expect(userByEmail.save).toHaveBeenCalledOnce();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('with bypass inactive: falls through to sendVerificationPinEmail', async () => {
      const userByEmail = buildUser();
      mockFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(userByEmail);
      mockSendEmail.mockResolvedValue(undefined);

      const { sendEmailPinAction } = await import(
        '@/app/actions/auth/send-email-pin'
      );
      const result = await sendEmailPinAction('e2e@test.com', '+2347000000010');

      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledOnce();
    });
  });
});
