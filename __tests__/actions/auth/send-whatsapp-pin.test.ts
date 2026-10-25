/**
 * @requirement REQ-115 (AC15, AC16) — sendWhatsAppPinAction issues a 6-digit
 * PIN and does not blame the phone number for non-phone Meta failures.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

function buildUser() {
  return {
    phone: '+2348012345678',
    verificationPin: undefined as string | undefined,
    pinExpiresAt: undefined as Date | undefined,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

const original = process.env.ENABLE_E2E_PIN_INTERCEPT;

beforeEach(() => {
  process.env.ENABLE_E2E_PIN_INTERCEPT = 'false';
  mockSendPin.mockReset().mockResolvedValue({ success: true });
  mockFindOne.mockReset();
  mockCreate.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  if (original === undefined) delete process.env.ENABLE_E2E_PIN_INTERCEPT;
  else process.env.ENABLE_E2E_PIN_INTERCEPT = original;
  vi.restoreAllMocks();
});

describe('REQ-115 sendWhatsAppPinAction', () => {
  it('[US-01.7] the PIN stored and sent is exactly 6 digits', async () => {
    const user = buildUser();
    mockFindOne.mockResolvedValue(user);
    const { sendWhatsAppPinAction } = await import(
      '@/app/actions/auth/send-whatsapp-pin'
    );
    const result = await sendWhatsAppPinAction('08012345678');
    expect(result.success).toBe(true);
    expect(user.verificationPin).toMatch(/^\d{6}$/);
    expect(mockSendPin).toHaveBeenCalledWith(
      '+2348012345678',
      user.verificationPin
    );
  });

  it('AC5 — the phone is canonicalised before lookup (legacy forms also matched)', async () => {
    mockFindOne.mockResolvedValue(buildUser());
    const { sendWhatsAppPinAction } = await import(
      '@/app/actions/auth/send-whatsapp-pin'
    );
    await sendWhatsAppPinAction('08012345678');
    const filter = mockFindOne.mock.calls[0][0];
    expect(filter.phone.$in).toEqual(
      expect.arrayContaining(['+2348012345678', '2348012345678', '08012345678'])
    );
  });

  it('AC5 — a new user is created with the canonical phone', async () => {
    const created = buildUser();
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue(created);
    const { sendWhatsAppPinAction } = await import(
      '@/app/actions/auth/send-whatsapp-pin'
    );
    await sendWhatsAppPinAction('2348012345678');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+2348012345678' })
    );
  });

  it('AC16 — a SEND_FAILED result shows the generic message, not the phone-format one', async () => {
    mockFindOne.mockResolvedValue(buildUser());
    mockSendPin.mockResolvedValue({
      success: false,
      errorCode: 'SEND_FAILED',
      message: 'Failed to send WhatsApp message',
    });
    const { sendWhatsAppPinAction } = await import(
      '@/app/actions/auth/send-whatsapp-pin'
    );
    const result = await sendWhatsAppPinAction('+2348012345678');
    expect(result.success).toBe(false);
    expect(result.message).toBe(
      'We could not send your PIN. Please try again.'
    );
    expect(result.message).not.toMatch(/format is invalid/i);
    expect(result.canRetryWithSMS).toBe(true);
  });

  it('AC16 — a genuine INVALID_PHONE still reports the phone-format message', async () => {
    mockFindOne.mockResolvedValue(buildUser());
    mockSendPin.mockResolvedValue({
      success: false,
      errorCode: 'INVALID_PHONE',
    });
    const { sendWhatsAppPinAction } = await import(
      '@/app/actions/auth/send-whatsapp-pin'
    );
    const result = await sendWhatsAppPinAction('+2348012345678');
    expect(result.message).toMatch(/format is invalid/i);
  });
});
