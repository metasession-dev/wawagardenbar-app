/**
 * @requirement REQ-121 — AC2
 * @srs REQ-CHECKOUT-015
 *
 * `/api/auth/user` says explicitly whether the account has a real name. `name`
 * falls back to the email prefix, so checkout cannot use it to decide whether
 * to ask for a first name.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const session: Record<string, unknown> = {};
vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockImplementation(async () => session),
}));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
const findById = vi.hoisted(() => vi.fn());
vi.mock('@/models', () => ({ UserModel: { findById } }));

import { GET } from '@/app/api/auth/user/route';

const returns = (doc: Record<string, unknown>) =>
  findById.mockReturnValue({
    select: async () => ({ _id: { toString: () => 'u1' }, ...doc }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(session, { isLoggedIn: true, userId: 'u1', isGuest: false });
});

async function user() {
  const res = await GET({} as never);
  return (await res.json()).user;
}

describe('GET /api/auth/user hasName', () => {
  it('an account with only an email has no name, even though `name` falls back to the email prefix', async () => {
    returns({ email: 'ada@example.com', phone: '+2348012345678' });
    const body = await user();
    expect(body.name).toBe('ada');
    expect(body.hasName).toBe(false);
  });

  it('an account with a first name has one', async () => {
    returns({ email: 'a@b.c', firstName: 'Ngozi', phone: '+2348012345678' });
    expect((await user()).hasName).toBe(true);
  });

  it('an account with a stored name has one', async () => {
    returns({ name: 'Ada Obi', phone: '+2348012345678' });
    expect((await user()).hasName).toBe(true);
  });

  it('whitespace is not a name', async () => {
    returns({ name: '  ', firstName: ' ', phone: '+2348012345678' });
    expect((await user()).hasName).toBe(false);
  });

  it('a signed-out request is refused', async () => {
    Object.assign(session, { isLoggedIn: false });
    const res = await GET({} as never);
    expect(res.status).toBe(401);
  });
});
