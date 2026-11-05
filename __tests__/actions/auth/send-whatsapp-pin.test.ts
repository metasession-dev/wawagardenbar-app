/**
 * @requirement REQ-117 (AC3, AC5, AC8, AC9) — sendWhatsAppPinAction stores only
 * a keyed hash, enforces the per-phone request limit, shows the terminal and
 * unavailable messages, and records an Incident when WhatsApp is unavailable.
 * @requirement REQ-115 (AC15, AC16) — 6-digit PIN; non-phone Meta failures do
 * not blame the number.
 * @requirement REQ-074 — ENABLE_E2E_PIN_INTERCEPT keeps a test-only plaintext.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hashPin } from '@/lib/auth-utils';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const mockSendPin = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: {
    sendVerificationPinWhatsApp: (...a: unknown[]) => mockSendPin(...a),
  },
}));

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

const mockDedup = vi.fn();
const mockRecord = vi.fn();
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {
    dedupRecent: (...a: unknown[]) => mockDedup(...a),
    recordIncident: (...a: unknown[]) => mockRecord(...a),
  },
}));

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    phone: '+2348012345678',
    verificationPinHash: undefined as string | undefined,
    verificationPin: undefined as string | undefined,
    pinExpiresAt: undefined as Date | undefined,
    pinAttempts: 0,
    pinRequestWindowStart: undefined as Date | undefined,
    pinRequestCount: 0,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** findOne(...).select(...) resolves to the user, as in the action. */
function found(user: unknown) {
  mockFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(user) });
}

const original = process.env.ENABLE_E2E_PIN_INTERCEPT;

beforeEach(() => {
  vi.stubEnv('SESSION_PASSWORD', 'k'.repeat(32));
  process.env.ENABLE_E2E_PIN_INTERCEPT = 'false';
  mockSendPin.mockReset().mockResolvedValue({ success: true });
  mockFindOne.mockReset();
  mockCreate.mockReset();
  mockDedup.mockReset().mockResolvedValue(false);
  mockRecord.mockReset().mockResolvedValue({});
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  if (original === undefined) delete process.env.ENABLE_E2E_PIN_INTERCEPT;
  else process.env.ENABLE_E2E_PIN_INTERCEPT = original;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function send(phone = '08012345678') {
  const { sendWhatsAppPinAction } = await import(
    '@/app/actions/auth/send-whatsapp-pin'
  );
  return sendWhatsAppPinAction(phone);
}

describe('REQ-117 sendWhatsAppPinAction: storage (AC5)', () => {
  it('AC5 — stores only the keyed hash; the plaintext PIN is not stored', async () => {
    const user = buildUser();
    found(user);
    const result = await send();
    expect(result.success).toBe(true);
    const sentPin = mockSendPin.mock.calls[0][1] as string;
    expect(sentPin).toMatch(/^\d{6}$/);
    expect(user.verificationPinHash).toBe(hashPin(sentPin));
    expect(user.verificationPin).toBeUndefined();
    expect(JSON.stringify(user)).not.toContain(sentPin);
  });

  it('AC5 — the PIN expires in ten minutes and attempts reset', async () => {
    const user = buildUser({ pinAttempts: 4 });
    found(user);
    await send();
    const minutes = (user.pinExpiresAt!.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(9.5);
    expect(minutes).toBeLessThanOrEqual(10);
    expect(user.pinAttempts).toBe(0);
  });

  it('REQ-074 — under the e2e intercept the plaintext is kept (test-only) and nothing is sent', async () => {
    process.env.ENABLE_E2E_PIN_INTERCEPT = 'true';
    const user = buildUser();
    found(user);
    const result = await send();
    expect(result.success).toBe(true);
    expect(mockSendPin).not.toHaveBeenCalled();
    expect(user.verificationPin).toMatch(/^\d{6}$/);
    expect(user.verificationPinHash).toBe(hashPin(user.verificationPin!));
  });

  it('REQ-115 [US-01.7] — the PIN sent is exactly 6 digits', async () => {
    found(buildUser());
    await send();
    expect(mockSendPin.mock.calls[0][1]).toMatch(/^\d{6}$/);
    expect(mockSendPin.mock.calls[0][0]).toBe('+2348012345678');
  });
});

describe('REQ-117 sendWhatsAppPinAction: request limit (AC5)', () => {
  it('AC5 — the sixth request within an hour is refused and sends nothing', async () => {
    const user = buildUser({
      pinRequestWindowStart: new Date(Date.now() - 10 * 60_000),
      pinRequestCount: 5,
    });
    found(user);
    const result = await send();
    expect(result).toMatchObject({ success: false, errorCode: 'RATE_LIMITED' });
    expect(mockSendPin).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });

  it('AC5 — the fifth request is still allowed and counted', async () => {
    const user = buildUser({
      pinRequestWindowStart: new Date(Date.now() - 10 * 60_000),
      pinRequestCount: 4,
    });
    found(user);
    const result = await send();
    expect(result.success).toBe(true);
    expect(user.pinRequestCount).toBe(5);
  });

  it('AC5 — the window resets after an hour', async () => {
    const user = buildUser({
      pinRequestWindowStart: new Date(Date.now() - 61 * 60_000),
      pinRequestCount: 5,
    });
    found(user);
    const result = await send();
    expect(result.success).toBe(true);
    expect(user.pinRequestCount).toBe(1);
  });
});

describe('REQ-117 sendWhatsAppPinAction: messages (AC3, AC9)', () => {
  it('AC3 — NOT_ON_WHATSAPP is terminal: the counter message, no alternative-channel flags', async () => {
    found(buildUser());
    mockSendPin.mockResolvedValue({
      success: false,
      errorCode: 'NOT_ON_WHATSAPP',
    });
    const result = await send();
    expect(result).toMatchObject({
      success: false,
      notOnWhatsApp: true,
      message:
        "This number isn't on WhatsApp. To order, please use the counter or call us.",
    });
    expect(result).not.toHaveProperty('canRetryWithSMS');
    expect(result).not.toHaveProperty('canRetryWithEmail');
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it.each([
    'SERVICE_DISABLED',
    'MISSING_CREDENTIALS',
    'TEMPLATE_NOT_FOUND',
    'API_ERROR',
  ])(
    'AC9 — %s shows the unavailable notice and records an Incident',
    async (code) => {
      found(buildUser());
      mockSendPin.mockResolvedValue({ success: false, errorCode: code });
      const result = await send();
      expect(result).toMatchObject({
        success: false,
        serviceUnavailable: true,
        message:
          'Online ordering is temporarily unavailable. Please order at the counter or call us.',
      });
      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(mockRecord.mock.calls[0][0]).toMatchObject({
        kind: 'notification_delivery_failed',
      });
      expect(JSON.stringify(mockRecord.mock.calls[0][0])).not.toContain(
        '2348012345678'
      );
    }
  );

  it('AC9 — only one Incident per hour during an outage', async () => {
    found(buildUser());
    mockSendPin.mockResolvedValue({
      success: false,
      errorCode: 'SERVICE_DISABLED',
    });
    mockDedup.mockResolvedValue(true);
    const result = await send();
    expect(result.serviceUnavailable).toBe(true);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('AC9 — a failing Incident write does not hide the notice', async () => {
    found(buildUser());
    mockSendPin.mockResolvedValue({
      success: false,
      errorCode: 'SERVICE_DISABLED',
    });
    mockRecord.mockRejectedValue(new Error('db down'));
    const result = await send();
    expect(result.serviceUnavailable).toBe(true);
  });

  it('REQ-115 AC16 — SEND_FAILED shows the generic message, not the phone-format one, and is not an outage', async () => {
    found(buildUser());
    mockSendPin.mockResolvedValue({ success: false, errorCode: 'SEND_FAILED' });
    const result = await send();
    expect(result.message).toBe(
      'We could not send your PIN. Please try again.'
    );
    expect(result.serviceUnavailable).toBeUndefined();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('REQ-115 AC16 — a genuine INVALID_PHONE still reports the phone-format message', async () => {
    found(buildUser());
    mockSendPin.mockResolvedValue({
      success: false,
      errorCode: 'INVALID_PHONE',
    });
    const result = await send();
    expect(result.message).toMatch(/format is invalid/i);
  });
});

describe('REQ-117 sendWhatsAppPinAction: account lookup (AC8)', () => {
  it('AC8 — the phone is canonicalised and legacy stored forms are matched, so an existing account is reused', async () => {
    found(buildUser());
    await send();
    const filter = mockFindOne.mock.calls[0][0];
    expect(filter.phone.$in).toEqual(
      expect.arrayContaining(['+2348012345678', '2348012345678', '08012345678'])
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('AC8 — a new user is created with the canonical phone and reported as new', async () => {
    found(null);
    mockCreate.mockResolvedValue(buildUser());
    const result = await send('2348012345678');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+2348012345678', phoneVerified: false })
    );
    expect(result.isNewUser).toBe(true);
  });
});
