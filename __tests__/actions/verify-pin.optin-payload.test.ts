/**
 * @requirement REQ-063 — Bundle B (P4 #21 explicit-consent split)
 *
 * AC1 + AC3: verify-pin accepts a three-field `optIn` payload
 * (whatsappTransactional, whatsappMarketing, emailMarketing) and persists
 * each independently on FIRST verification only, plus stamps
 * `communicationPreferencesUpdatedAt`. Subsequent verifies (when the user
 * already has `phoneVerified` or `emailVerified === true`) ignore the
 * payload — mirrors REQ-053's first-verify-only contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/session', () => ({
  sessionOptions: {},
  SessionData: {},
}));

const mockSessionSave = vi.fn().mockResolvedValue(undefined);
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue({
    save: mockSessionSave,
    userId: undefined,
    email: undefined,
    phone: undefined,
    role: undefined,
    isGuest: undefined,
    isLoggedIn: undefined,
    createdAt: undefined,
  }),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/auth-utils', () => ({
  generateSessionToken: vi.fn().mockReturnValue('token-xyz'),
  isPinExpired: vi.fn().mockReturnValue(false),
  sanitizePhone: (p: string) => p,
}));

const mockUserFindOne = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...a: unknown[]) => mockUserFindOne(...a),
  },
}));

function mockUser(overrides: Record<string, unknown> = {}) {
  const setCalls: Array<[string, unknown]> = [];
  const u = {
    _id: { toString: () => 'user-id' },
    phone: '+2348011112222',
    phoneVerified: false,
    emailVerified: false,
    verificationPin: '1234',
    pinExpiresAt: new Date(Date.now() + 60_000),
    role: 'customer',
    set: vi.fn((path: string, value: unknown) => {
      setCalls.push([path, value]);
    }),
    save: vi.fn().mockResolvedValue(undefined),
    sessionToken: undefined as string | undefined,
    lastLoginAt: undefined as Date | undefined,
    ...overrides,
  };
  return { user: u, setCalls };
}

beforeEach(() => {
  mockUserFindOne.mockReset();
  mockSessionSave.mockClear();
});

describe('REQ-063 verifyPinAction — three-checkbox optIn payload', () => {
  it('AC1+AC3 — first verify: persists all three booleans + stamps timestamp', async () => {
    const { user, setCalls } = mockUser();
    mockUserFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });

    const { verifyPinAction } = await import('@/app/actions/auth/verify-pin');

    const result = await verifyPinAction('+2348011112222', '1234', {
      whatsappTransactional: true,
      whatsappMarketing: false,
      emailMarketing: false,
    });

    expect(result.success).toBe(true);

    const paths = setCalls.map(([p]) => p);
    expect(paths).toContain(
      'preferences.communicationPreferences.whatsappTransactional'
    );
    expect(paths).toContain(
      'preferences.communicationPreferences.whatsappMarketing'
    );
    expect(paths).toContain(
      'preferences.communicationPreferences.emailMarketing'
    );
    expect(paths).toContain('preferences.communicationPreferencesUpdatedAt');

    // Independence check: the three booleans were set to DIFFERENT values
    // (whatsappTransactional=true, whatsappMarketing=false). The pre-REQ-063
    // bug collapsed both to the same value, which this test catches.
    const transactional = setCalls.find(
      ([p]) =>
        p === 'preferences.communicationPreferences.whatsappTransactional'
    )?.[1];
    const marketing = setCalls.find(
      ([p]) => p === 'preferences.communicationPreferences.whatsappMarketing'
    )?.[1];
    expect(transactional).toBe(true);
    expect(marketing).toBe(false);
  });

  it('AC1 — returning user (phoneVerified=true) — optIn is ignored', async () => {
    const { user, setCalls } = mockUser({ phoneVerified: true });
    mockUserFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });

    const { verifyPinAction } = await import('@/app/actions/auth/verify-pin');

    const result = await verifyPinAction('+2348011112222', '1234', {
      whatsappTransactional: false,
      whatsappMarketing: true,
      emailMarketing: true,
    });

    expect(result.success).toBe(true);

    const prefPaths = setCalls
      .map(([p]) => p)
      .filter((p) => p.startsWith('preferences.'));
    expect(prefPaths).toHaveLength(0);
  });
});
