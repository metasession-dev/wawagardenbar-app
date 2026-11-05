/**
 * @requirement REQ-117 (AC6) — customers created by a PIN request who never
 * verified are deleted after 24 hours; nothing that looks like a real account
 * is ever removed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockFind = vi.fn();
const mockDeleteMany = vi.fn();
vi.mock('@/models/user-model', () => ({
  default: {
    find: (...a: unknown[]) => mockFind(...a),
    deleteMany: (...a: unknown[]) => mockDeleteMany(...a),
  },
}));

const mockDistinct = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: { distinct: (...a: unknown[]) => mockDistinct(...a) },
}));

vi.mock('@/services/rewards-service', () => ({ default: {} }));
vi.mock('@/services/instagram-service', () => ({ default: {} }));
vi.mock('@/services/inventory-service', () => ({ default: {} }));
vi.mock('@/services/order-service', () => ({ default: {} }));
vi.mock('@/services/tab-service', () => ({ default: {} }));
vi.mock('@/services/system-settings-service', () => ({ default: {} }));
vi.mock('@/services/incident-event-service', () => ({ default: {} }));
vi.mock('@/services/notification-service', () => ({ default: {} }));

function candidates(ids: string[]) {
  mockFind.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(ids.map((id) => ({ _id: id }))),
    }),
  });
}

beforeEach(() => {
  mockFind.mockReset();
  mockDeleteMany.mockReset().mockResolvedValue({ deletedCount: 0 });
  mockDistinct.mockReset().mockResolvedValue([]);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

async function run() {
  const { runUnverifiedUserPurgeJob } = await import('@/lib/scheduled-jobs');
  return runUnverifiedUserPurgeJob();
}

describe('REQ-117 runUnverifiedUserPurgeJob', () => {
  it('AC6 — queries only old, never-verified, never-signed-in customers with no email', async () => {
    candidates([]);
    await run();
    const filter = mockFind.mock.calls[0][0];
    expect(filter).toMatchObject({
      role: 'customer',
      phoneVerified: { $ne: true },
      emailVerified: { $ne: true },
      lastLoginAt: { $exists: false },
      isGuest: { $ne: true },
    });
    expect(filter.email).toEqual({ $in: [null, ''] });
    const cutoff = filter.createdAt.$lt as Date;
    const hoursOld = (Date.now() - cutoff.getTime()) / 3_600_000;
    expect(hoursOld).toBeGreaterThan(23.9);
    expect(hoursOld).toBeLessThan(24.1);
  });

  it('AC6 — deletes the matching accounts and returns the count', async () => {
    candidates(['u1', 'u2']);
    mockDeleteMany.mockResolvedValue({ deletedCount: 2 });
    expect(await run()).toBe(2);
    expect(mockDeleteMany).toHaveBeenCalledWith({ _id: { $in: ['u1', 'u2'] } });
  });

  it('AC6 — an account with an order is never deleted', async () => {
    candidates(['u1', 'u2']);
    mockDistinct.mockResolvedValue(['u2']);
    mockDeleteMany.mockResolvedValue({ deletedCount: 1 });
    await run();
    expect(mockDeleteMany).toHaveBeenCalledWith({ _id: { $in: ['u1'] } });
  });

  it('AC6 — nothing to delete means no delete call', async () => {
    candidates([]);
    expect(await run()).toBe(0);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('AC6 — when every candidate has orders nothing is deleted', async () => {
    candidates(['u1']);
    mockDistinct.mockResolvedValue(['u1']);
    expect(await run()).toBe(0);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('AC6 — a database error is logged, never thrown', async () => {
    mockFind.mockImplementation(() => {
      throw new Error('db down');
    });
    await expect(run()).resolves.toBe(0);
  });
});
