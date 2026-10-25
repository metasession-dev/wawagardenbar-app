/**
 * @requirement REQ-115 (AC15) — verifyWhatsAppPinAction accepts only 6-digit PINs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = { save: vi.fn().mockResolvedValue(undefined) } as Record<
  string,
  unknown
>;
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue(mockSession),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const mockFindOne = vi.fn();
vi.mock('@/models', () => ({
  UserModel: { findOne: (...a: unknown[]) => mockFindOne(...a) },
}));

function buildUser(pin: string) {
  const doc: Record<string, unknown> = {
    _id: { toString: () => 'user-1' },
    phone: '+2348012345678',
    phoneVerified: true,
    emailVerified: false,
    role: 'customer',
    verificationPin: pin,
    pinExpiresAt: new Date(Date.now() + 60_000),
    set: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  };
  return { ...doc, select: vi.fn().mockReturnValue(doc) };
}

beforeEach(() => {
  mockFindOne.mockReset();
});

describe('REQ-115 verifyWhatsAppPinAction', () => {
  it('[US-01.7] a 4-digit entry is rejected before any lookup', async () => {
    const { verifyWhatsAppPinAction } = await import(
      '@/app/actions/auth/verify-whatsapp-pin'
    );
    const result = await verifyWhatsAppPinAction('+2348012345678', '1234');
    expect(result).toMatchObject({
      success: false,
      message: 'Invalid PIN format',
    });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('[US-01.7] a 7-digit or non-numeric entry is rejected', async () => {
    const { verifyWhatsAppPinAction } = await import(
      '@/app/actions/auth/verify-whatsapp-pin'
    );
    expect(
      (await verifyWhatsAppPinAction('+2348012345678', '1234567')).success
    ).toBe(false);
    expect(
      (await verifyWhatsAppPinAction('+2348012345678', '12345a')).success
    ).toBe(false);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('[US-01.7] a correct 6-digit PIN signs the user in', async () => {
    mockFindOne.mockReturnValue(buildUser('654321'));
    const { verifyWhatsAppPinAction } = await import(
      '@/app/actions/auth/verify-whatsapp-pin'
    );
    const result = await verifyWhatsAppPinAction('08012345678', '654321');
    expect(result.success).toBe(true);
    const filter = mockFindOne.mock.calls[0][0];
    expect(filter.phone.$in).toEqual(
      expect.arrayContaining(['+2348012345678', '08012345678'])
    );
  });

  it('a wrong 6-digit PIN is "Invalid PIN"', async () => {
    mockFindOne.mockReturnValue(buildUser('654321'));
    const { verifyWhatsAppPinAction } = await import(
      '@/app/actions/auth/verify-whatsapp-pin'
    );
    const result = await verifyWhatsAppPinAction('+2348012345678', '111111');
    expect(result).toMatchObject({ success: false, message: 'Invalid PIN' });
  });
});
