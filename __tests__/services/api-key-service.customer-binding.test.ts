/**
 * @requirement REQ-120 — AC8
 * @srs REQ-API-007
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('h') },
}));

const create = vi.hoisted(() => vi.fn());
vi.mock('@/models/api-key-model', () => ({ default: { create } }));
const findById = vi.hoisted(() => vi.fn());
vi.mock('@/models/user-model', () => ({ default: { findById } }));

import { ApiKeyService } from '@/services/api-key-service';

const USER = '665b00000000000000000001';
const doc = (extra = {}) => ({
  _id: { toString: () => 'k' },
  name: 'n',
  keyPrefix: 'p',
  role: 'customer',
  scopes: ['orders:write'],
  createdBy: { toString: () => 'admin' },
  isActive: true,
  rateLimit: 60,
  createdAt: new Date(),
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  create.mockImplementation(async (d: any) =>
    doc({ ...d, userId: d.userId && { toString: () => d.userId } })
  );
});

describe('ApiKeyService.createKey — customer binding', () => {
  it('requires a bound user for the customer role', async () => {
    await expect(
      ApiKeyService.createKey(
        { name: 'n', role: 'customer', scopes: ['orders:write'] },
        'admin'
      )
    ).rejects.toThrow(/bound to a customer/);
    expect(create).not.toHaveBeenCalled();
  });

  it('requires the bound user to be an existing customer', async () => {
    findById.mockReturnValue({ select: async () => ({ role: 'csr' }) });
    await expect(
      ApiKeyService.createKey(
        { name: 'n', role: 'customer', userId: USER, scopes: ['orders:write'] },
        'admin'
      )
    ).rejects.toThrow(/existing customer/);
  });

  it('stores the binding and returns it', async () => {
    findById.mockReturnValue({ select: async () => ({ role: 'customer' }) });
    const { apiKey } = await ApiKeyService.createKey(
      { name: 'n', role: 'customer', userId: USER, scopes: ['orders:write'] },
      'admin'
    );
    expect(create.mock.calls[0][0].userId).toBe(USER);
    expect(apiKey.userId).toBe(USER);
  });

  it('refuses a user binding on any other role', async () => {
    await expect(
      ApiKeyService.createKey(
        { name: 'n', role: 'csr', userId: USER, scopes: ['orders:write'] },
        'admin'
      )
    ).rejects.toThrow(/Only customer-role/);
  });
});
