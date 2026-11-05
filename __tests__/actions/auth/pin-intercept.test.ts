/**
 * @requirement REQ-074 — Customer journey E2E coverage (sub-issue #292)
 * @requirement REQ-117 (AC5) — the intercept now covers the only customer
 * channel left (WhatsApp) and keeps the test-only plaintext next to the hash.
 *
 * `sendWhatsAppPinAction` has an env-gated bypass that short-circuits the Meta
 * send after the PIN is persisted. Specs read the PIN from the test-only
 * `User.verificationPin` field and submit it via `verifyWhatsAppPinAction`.
 *
 *   ✓ bypass-active path returns success without invoking WhatsApp
 *   ✓ bypass-inactive path calls WhatsApp (and never stores the plaintext)
 *   ✓ the PIN hash is persisted in BOTH paths
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

vi.mock('@/lib/auth-utils', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/auth-utils')>(
      '@/lib/auth-utils'
    );
  return {
    ...actual,
    generatePin: vi.fn(() => '432100'),
    sanitizePhone: vi.fn((p: string) => p),
    phoneLookupVariants: (p: string) => [p],
    validatePhone: vi.fn(() => true),
  };
});

const mockSendWhatsApp = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendVerificationPinWhatsApp: (...args: unknown[]) =>
      mockSendWhatsApp(...args),
  },
}));

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

function buildUser() {
  return {
    phone: '+2347000000010',
    phoneVerified: false,
    accountStatus: 'active',
    verificationPinHash: undefined as string | undefined,
    verificationPin: undefined as string | undefined,
    pinExpiresAt: undefined as Date | undefined,
    pinAttempts: 0,
    pinRequestCount: 0,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('REQ-074 / REQ-117 — ENABLE_E2E_PIN_INTERCEPT on sendWhatsAppPinAction', () => {
  const origEnv = process.env.ENABLE_E2E_PIN_INTERCEPT;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SESSION_PASSWORD', 'k'.repeat(32));
    delete process.env.ENABLE_E2E_PIN_INTERCEPT;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (origEnv === undefined) delete process.env.ENABLE_E2E_PIN_INTERCEPT;
    else process.env.ENABLE_E2E_PIN_INTERCEPT = origEnv;
  });

  it('with bypass active: returns success without calling WhatsApp, persists the hash and the test-only plaintext', async () => {
    process.env.ENABLE_E2E_PIN_INTERCEPT = 'true';
    const user = buildUser();
    mockFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });

    const { sendWhatsAppPinAction } = await import(
      '@/app/actions/auth/send-whatsapp-pin'
    );
    const result = await sendWhatsAppPinAction('+2347000000010');

    expect(result.success).toBe(true);
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(user.verificationPin).toBe('432100');
    expect(user.verificationPinHash).toMatch(/^[0-9a-f]{64}$/);
    expect(user.pinExpiresAt).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
  });

  it('with bypass inactive: calls WhatsApp and never stores the plaintext', async () => {
    mockSendWhatsApp.mockResolvedValue({ success: true });
    const user = buildUser();
    mockFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });

    const { sendWhatsAppPinAction } = await import(
      '@/app/actions/auth/send-whatsapp-pin'
    );
    const result = await sendWhatsAppPinAction('+2347000000010');

    expect(result.success).toBe(true);
    expect(mockSendWhatsApp).toHaveBeenCalledWith('+2347000000010', '432100');
    expect(user.verificationPin).toBeUndefined();
    expect(user.verificationPinHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('only the string "true" activates the bypass', async () => {
    process.env.ENABLE_E2E_PIN_INTERCEPT = '1';
    mockSendWhatsApp.mockResolvedValue({ success: true });
    const user = buildUser();
    mockFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });

    const { sendWhatsAppPinAction } = await import(
      '@/app/actions/auth/send-whatsapp-pin'
    );
    await sendWhatsAppPinAction('+2347000000010');

    expect(mockSendWhatsApp).toHaveBeenCalled();
    expect(user.verificationPin).toBeUndefined();
  });
});
