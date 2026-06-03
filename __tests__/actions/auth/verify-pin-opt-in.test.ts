/**
 * @requirement REQ-053 — WhatsApp opt-in surface at signup + profile
 *
 * Verify-pin actions accept an optional `optIn` payload and persist it to
 * `user.preferences.communicationPreferences` ONLY on first verification
 * (when `user.phoneVerified === false` at the start of the action).
 * Subsequent verifies must NOT overwrite the user's profile-set preferences
 * — that's how returning users keep whatever they chose in their profile,
 * even if the client sends a stale opt-in payload.
 *
 * The three verify actions (SMS / WhatsApp / Email) share the same gate
 * pattern, so the tests are parameterised. The Mongo connection is fully
 * mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSession = {
  userId: undefined as string | undefined,
  email: undefined as string | undefined,
  phone: undefined as string | undefined,
  role: undefined as string | undefined,
  isGuest: false,
  isLoggedIn: false,
  createdAt: 0,
  save: vi.fn().mockResolvedValue(undefined),
};
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockResolvedValue(mockSession),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('@/lib/auth-utils', () => ({
  generateSessionToken: vi.fn(() => 'session-token-stub'),
  isPinExpired: vi.fn(() => false),
  sanitizePhone: vi.fn((p: string) => p),
  sanitizeEmail: vi.fn((e: string) => e.toLowerCase()),
}));

const mockFindOne = vi.fn();
vi.mock('@/models', () => ({
  UserModel: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

// Helper — build a mock user doc with chainable `.select(...)`.
function buildUser(overrides: Record<string, unknown> = {}) {
  const doc: Record<string, unknown> = {
    _id: { toString: () => '65a1b2c3d4e5f6a7b8c9d0e1' },
    phone: '+2347000000010',
    email: 'opt-in@example.com',
    role: 'customer',
    phoneVerified: false,
    verificationPin: '1234',
    pinExpiresAt: new Date(Date.now() + 60_000),
    sessionToken: undefined,
    lastLoginAt: undefined,
    preferences: {
      communicationPreferences: {
        email: true,
        sms: false,
        push: false,
        whatsappTransactional: true,
        whatsappMarketing: false,
      },
    },
    save: vi.fn().mockResolvedValue(undefined),
    // Mirror Mongoose's `doc.set('a.b.c', value)` — split the path and
    // walk the object, creating intermediate keys when missing, so the
    // production code's `set('preferences.communicationPreferences.x',
    // value)` mutates the test mock just like a real doc.
    set: vi.fn(function (
      this: Record<string, unknown>,
      path: string,
      value: unknown
    ) {
      const keys = path.split('.');
      let target: Record<string, unknown> = this;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (typeof target[k] !== 'object' || target[k] === null) {
          target[k] = {};
        }
        target = target[k] as Record<string, unknown>;
      }
      target[keys[keys.length - 1]] = value;
    }),
    ...overrides,
  };
  return doc;
}

// Small typed view of the mock doc's preferences for assertion clarity.
function cp(user: Record<string, unknown>): {
  whatsappTransactional: boolean;
  whatsappMarketing: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
} {
  return (
    user.preferences as {
      communicationPreferences: {
        whatsappTransactional: boolean;
        whatsappMarketing: boolean;
        email: boolean;
        sms: boolean;
        push: boolean;
      };
    }
  ).communicationPreferences;
}

beforeEach(() => {
  mockFindOne.mockReset();
  mockSession.userId = undefined;
  mockSession.isLoggedIn = false;
  mockSession.save.mockClear();
});

describe('REQ-053 AC4: verifyPinAction persists optIn on FIRST verify only', () => {
  it('AC4 — first verify (phoneVerified false) writes both fields', async () => {
    const user = buildUser({ phoneVerified: false });
    mockFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });

    const { verifyPinAction } = await import('@/app/actions/auth/verify-pin');
    const result = await verifyPinAction('+2347000000010', '1234', {
      whatsappTransactional: true,
      whatsappMarketing: true,
      emailMarketing: false,
    });

    expect(result.success).toBe(true);
    expect(cp(user).whatsappTransactional).toBe(true);
    expect(cp(user).whatsappMarketing).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('AC4 — first verify with marketing opt-out persists false on marketing', async () => {
    const user = buildUser({ phoneVerified: false });
    mockFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });

    const { verifyPinAction } = await import('@/app/actions/auth/verify-pin');
    await verifyPinAction('+2347000000010', '1234', {
      whatsappTransactional: true,
      whatsappMarketing: false,
      emailMarketing: false,
    });

    expect(cp(user).whatsappMarketing).toBe(false);
  });

  it('AC4 — subsequent verify (phoneVerified true) does NOT overwrite preferences', async () => {
    // Returning user with their profile-set preferences: marketing OFF.
    const user = buildUser({
      phoneVerified: true,
      preferences: {
        communicationPreferences: {
          email: true,
          sms: false,
          push: false,
          whatsappTransactional: true,
          // User went to profile and unchecked marketing.
          whatsappMarketing: false,
        },
      },
    });
    mockFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });

    const { verifyPinAction } = await import('@/app/actions/auth/verify-pin');
    // Client sends stale opt-in payload trying to flip marketing back on.
    await verifyPinAction('+2347000000010', '1234', {
      whatsappTransactional: true,
      whatsappMarketing: true,
      emailMarketing: true,
    });

    // Marketing stays OFF — the profile choice wins.
    expect(cp(user).whatsappMarketing).toBe(false);
  });

  it('AC6 — no optIn payload (backwards-compat): action still succeeds', async () => {
    const user = buildUser({ phoneVerified: false });
    mockFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });

    const { verifyPinAction } = await import('@/app/actions/auth/verify-pin');
    const result = await verifyPinAction('+2347000000010', '1234');

    expect(result.success).toBe(true);
    // Preferences untouched at defaults.
    expect(cp(user).whatsappTransactional).toBe(true);
    expect(cp(user).whatsappMarketing).toBe(false);
  });
});
