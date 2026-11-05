/**
 * @requirement REQ-117 (AC5, AC7, AC8) — verifyWhatsAppPinAction compares the
 * keyed hash, invalidates the PIN after five wrong attempts, and gives
 * customers the 90-day session.
 * @requirement REQ-115 (AC15) — accepts only 6-digit PINs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPin } from '@/lib/auth-utils';
import { CUSTOMER_SESSION_TTL_SECONDS } from '@/lib/session';

const mockSession = {
  save: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn(),
} as Record<string, unknown>;
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue(mockSession),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const mockFindOne = vi.fn();
vi.mock('@/models', () => ({
  UserModel: { findOne: (...a: unknown[]) => mockFindOne(...a) },
}));

function buildUser(
  pin: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    _id: { toString: () => 'user-1' },
    phone: '+2348012345678',
    phoneVerified: true,
    emailVerified: false,
    role: 'customer',
    verificationPinHash: hashPin(pin),
    verificationPin: undefined,
    pinExpiresAt: new Date(Date.now() + 60_000),
    pinAttempts: 0,
    set: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return doc;
}

function found(doc: Record<string, unknown>) {
  mockFindOne.mockReturnValue({ select: vi.fn().mockReturnValue(doc) });
}

async function verify(phone: string, pin: string) {
  const { verifyWhatsAppPinAction } = await import(
    '@/app/actions/auth/verify-whatsapp-pin'
  );
  return verifyWhatsAppPinAction(phone, pin);
}

beforeEach(() => {
  vi.stubEnv('SESSION_PASSWORD', 'k'.repeat(32));
  mockFindOne.mockReset();
  (mockSession.save as ReturnType<typeof vi.fn>).mockClear();
  (mockSession.updateConfig as ReturnType<typeof vi.fn>).mockClear();
  for (const key of [
    'userId',
    'role',
    'isLoggedIn',
    'createdAt',
    'refreshedAt',
  ]) {
    delete mockSession[key];
  }
});

describe('REQ-115 verifyWhatsAppPinAction: format', () => {
  it('[US-01.7] a 4-digit entry is rejected before any lookup', async () => {
    const result = await verify('+2348012345678', '1234');
    expect(result).toMatchObject({
      success: false,
      message: 'Invalid PIN format',
    });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('[US-01.7] a 7-digit or non-numeric entry is rejected', async () => {
    expect((await verify('+2348012345678', '1234567')).success).toBe(false);
    expect((await verify('+2348012345678', '12345a')).success).toBe(false);
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});

describe('REQ-117 verifyWhatsAppPinAction: hash, attempts, expiry (AC5)', () => {
  it('AC5 — a correct PIN signs the user in and clears the hash and counters', async () => {
    const doc = buildUser('654321', { pinAttempts: 2 });
    found(doc);
    const result = await verify('08012345678', '654321');
    expect(result.success).toBe(true);
    expect(doc.verificationPinHash).toBeUndefined();
    expect(doc.pinExpiresAt).toBeUndefined();
    expect(doc.pinAttempts).toBe(0);
    expect(doc.whatsappVerifiedAt).toBeInstanceOf(Date);
    const filter = mockFindOne.mock.calls[0][0];
    expect(filter.phone.$in).toEqual(
      expect.arrayContaining(['+2348012345678', '08012345678'])
    );
  });

  it('AC5 — a wrong PIN is "Invalid PIN" and counts an attempt', async () => {
    const doc = buildUser('654321');
    found(doc);
    const result = await verify('+2348012345678', '111111');
    expect(result).toMatchObject({ success: false, message: 'Invalid PIN' });
    expect(doc.pinAttempts).toBe(1);
    expect(doc.verificationPinHash).toBeDefined();
  });

  it('AC5 — the fifth wrong attempt invalidates the PIN and asks for a new one', async () => {
    const doc = buildUser('654321', { pinAttempts: 4 });
    found(doc);
    const result = await verify('+2348012345678', '111111');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Too many wrong attempts/);
    expect(doc.verificationPinHash).toBeUndefined();
    expect(doc.pinExpiresAt).toBeUndefined();
  });

  it('AC5 — after invalidation even the correct PIN is refused', async () => {
    const doc = buildUser('654321', {
      verificationPinHash: undefined,
      pinExpiresAt: undefined,
    });
    found(doc);
    const result = await verify('+2348012345678', '654321');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/No verification PIN found/);
  });

  it('AC5 — an already exhausted PIN is invalidated even if the next entry is correct', async () => {
    const doc = buildUser('654321', { pinAttempts: 5 });
    found(doc);
    const result = await verify('+2348012345678', '654321');
    expect(result.success).toBe(false);
    expect(doc.verificationPinHash).toBeUndefined();
  });

  it('AC5 — an expired PIN is refused', async () => {
    const doc = buildUser('654321', {
      pinExpiresAt: new Date(Date.now() - 1000),
    });
    found(doc);
    const result = await verify('+2348012345678', '654321');
    expect(result.message).toMatch(/expired/i);
  });

  it('AC5 — a stored plaintext PIN field is never used for the comparison', async () => {
    const doc = buildUser('654321', { verificationPin: '999999' });
    found(doc);
    expect((await verify('+2348012345678', '999999')).success).toBe(false);
  });
});

describe('REQ-117 verifyWhatsAppPinAction: session (AC7, AC8)', () => {
  it('AC7 — a customer gets the 90-day session lifetime and a refresh stamp', async () => {
    found(buildUser('654321'));
    await verify('+2348012345678', '654321');
    const update = mockSession.updateConfig as ReturnType<typeof vi.fn>;
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].ttl).toBe(CUSTOMER_SESSION_TTL_SECONDS);
    expect(mockSession.refreshedAt).toBe(mockSession.createdAt);
    expect(mockSession.isLoggedIn).toBe(true);
    expect(mockSession.role).toBe('customer');
  });

  it('AC7 — a non-customer role keeps the default session lifetime', async () => {
    found(buildUser('654321', { role: 'admin' }));
    await verify('+2348012345678', '654321');
    expect(mockSession.updateConfig).not.toHaveBeenCalled();
  });

  it('AC8 — a legacy account whose phone was never verified is reused and verified by the WhatsApp round-trip', async () => {
    const doc = buildUser('654321', { phoneVerified: false });
    found(doc);
    const result = await verify('+2348012345678', '654321');
    expect(result.success).toBe(true);
    expect(doc.phoneVerified).toBe(true);
    expect(result.userId).toBe('user-1');
  });
});
