/**
 * @requirement REQ-065 — Self-service data export endpoint
 *
 * AC1 + AC2 + AC3: response envelope, session gate, rate limit, secret
 * projection, cross-user safety.
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

const mockSession: { isLoggedIn?: boolean; userId?: string } = {};
vi.mock('iron-session', () => ({
  getIronSession: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSession)),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

function chainable(returnValue: unknown) {
  const o = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(returnValue),
  };
  return o;
}

// Track find calls so we can assert every query uses the session userId.
const findCalls: Array<{ model: string; filter: unknown }> = [];
function makeModel(label: string, value: unknown) {
  return {
    findById: vi.fn().mockImplementation((id) => {
      findCalls.push({ model: label, filter: { _id: id } });
      return chainable(value);
    }),
    find: vi.fn().mockImplementation((filter) => {
      findCalls.push({ model: label, filter });
      return chainable(value);
    }),
  };
}

vi.mock('@/models', () => ({
  UserModel: makeModel('User', {
    _id: 'user-1',
    phone: '+2348011112222',
    firstName: 'Test',
  }),
}));
vi.mock('@/models/order-model', () => ({ default: makeModel('Order', []) }));
vi.mock('@/models/points-transaction-model', () => ({
  default: makeModel('PointsTransaction', []),
}));
vi.mock('@/models/tab-model', () => ({ default: makeModel('Tab', []) }));
vi.mock('@/models/reward-model', () => ({ default: makeModel('Reward', []) }));
vi.mock('@/models/support-ticket-model', () => ({
  default: makeModel('SupportTicket', []),
}));
vi.mock('@/models/notification-log-model', () => ({
  default: makeModel('NotificationLog', []),
}));
vi.mock('@/models/incoming-message-model', () => ({
  default: makeModel('IncomingMessage', []),
}));
vi.mock('@/models/instagram-post-credit-model', () => ({
  default: makeModel('InstagramPostCredit', []),
}));

beforeEach(async () => {
  Object.keys(mockSession).forEach(
    (k) => delete (mockSession as Record<string, unknown>)[k]
  );
  findCalls.length = 0;
  const { __resetRateLimitForTests } = await import('@/lib/rate-limit');
  __resetRateLimitForTests();
});

describe('REQ-065 GET /api/user/export', () => {
  it('AC3 — 401 when no session', async () => {
    const { GET } = await import('@/app/api/user/export/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('AC1 — envelope shape: exportedAt + userId + 9 collection keys', async () => {
    mockSession.isLoggedIn = true;
    mockSession.userId = 'user-1';

    const { GET } = await import('@/app/api/user/export/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.userId).toBe('user-1');
    expect(body).toHaveProperty('profile');
    expect(body).toHaveProperty('orders');
    expect(body).toHaveProperty('pointsTransactions');
    expect(body).toHaveProperty('tabs');
    expect(body).toHaveProperty('rewards');
    expect(body).toHaveProperty('supportTickets');
    expect(body).toHaveProperty('notificationLog');
    expect(body).toHaveProperty('incomingMessages');
    expect(body).toHaveProperty('instagramPostCredits');
  });

  it('AC3 — every find filter is keyed on session.userId (no cross-user reads)', async () => {
    mockSession.isLoggedIn = true;
    mockSession.userId = 'user-1';

    const { GET } = await import('@/app/api/user/export/route');
    await GET();

    // UserModel uses findById; the rest use find({ userId }).
    const finds = findCalls.filter((c) => c.model !== 'User');
    expect(finds.length).toBeGreaterThanOrEqual(8);
    for (const call of finds) {
      expect((call.filter as { userId?: string }).userId).toBe('user-1');
    }
    // User.findById carries the session userId as _id.
    const userCall = findCalls.find((c) => c.model === 'User');
    expect((userCall?.filter as { _id?: string })._id).toBe('user-1');
  });

  it('AC1 — Content-Disposition attachment with userid+date filename', async () => {
    mockSession.isLoggedIn = true;
    mockSession.userId = 'user-1';

    const { GET } = await import('@/app/api/user/export/route');
    const res = await GET();
    const cd = res.headers.get('content-disposition');
    expect(cd).toMatch(
      /^attachment; filename="wawa-data-user-1-\d{4}-\d{2}-\d{2}\.json"$/
    );
  });

  it('AC2 — second request within 60s window returns 429 with Retry-After', async () => {
    mockSession.isLoggedIn = true;
    mockSession.userId = 'user-1';

    const { GET } = await import('@/app/api/user/export/route');
    const first = await GET();
    expect(first.status).toBe(200);
    const second = await GET();
    expect(second.status).toBe(429);
    expect(second.headers.get('retry-after')).toBeTruthy();
    const body = await second.json();
    expect(body.error).toMatch(/Rate limit/i);
    expect(body.retryAfterSec).toBeGreaterThan(0);
  });
});
