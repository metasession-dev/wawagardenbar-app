/**
 * @requirement REQ-119 — AC9
 * @srs REQ-AUTHA-007
 *
 * `POST /api/public/admins` still accepts the legacy single `role` and also
 * accepts `roles` (which wins when both are sent); invalid values are a 400.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateAdmin = vi.fn();
vi.mock('@/services/admin-service', () => ({
  AdminService: {
    createAdmin: (...args: unknown[]) => mockCreateAdmin(...args),
    listAdmins: vi.fn(),
  },
}));

vi.mock('@/lib/api-response', () => ({
  withApiAuth: async (
    _req: unknown,
    _scopes: string[],
    handler: () => unknown
  ) => handler(),
  apiSuccess: (data: unknown, status = 200) => ({ ok: true, status, data }),
  apiError: (message: string, status = 400) => ({ ok: false, status, message }),
  serialize: (value: unknown) => value,
  parsePagination: () => ({ page: 1, limit: 25 }),
  parseJsonBody: async (req: { json: () => Promise<unknown> }) => req.json(),
}));

import { POST } from '@/app/api/public/admins/route';

const request = (body: unknown) =>
  ({ json: async () => body }) as unknown as Parameters<typeof POST>[0];

const base = { username: 'someone', password: 'Str0ng!Passw0rd' };

beforeEach(() => {
  mockCreateAdmin.mockReset();
  mockCreateAdmin.mockResolvedValue({
    toObject: () => ({ _id: 'id1', username: 'someone', roles: [] }),
  });
});

describe('POST /api/public/admins — roles (AC9)', () => {
  it('accepts the legacy single role and passes it as roles', async () => {
    const res: any = await POST(request({ ...base, role: 'csr' }));
    expect(res.status).toBe(201);
    expect(mockCreateAdmin.mock.calls[0][0].roles).toEqual(['csr']);
  });

  it('accepts roles', async () => {
    const res: any = await POST(
      request({ ...base, roles: ['csr', 'kitchen'] })
    );
    expect(res.status).toBe(201);
    expect(mockCreateAdmin.mock.calls[0][0].roles).toEqual(['csr', 'kitchen']);
  });

  it('roles wins when both role and roles are sent', async () => {
    await POST(request({ ...base, role: 'admin', roles: ['manager'] }));
    expect(mockCreateAdmin.mock.calls[0][0].roles).toEqual(['manager']);
  });

  it('accepts the new kitchen and manager values', async () => {
    const res: any = await POST(request({ ...base, role: 'kitchen' }));
    expect(res.status).toBe(201);
  });

  it('400 when neither role nor roles is sent', async () => {
    const res: any = await POST(request(base));
    expect(res.status).toBe(400);
    expect(mockCreateAdmin).not.toHaveBeenCalled();
  });

  it('400 on an unknown role value, even alongside valid ones', async () => {
    for (const bad of [{ role: 'bar' }, { roles: ['csr', 'bar'] }]) {
      const res: any = await POST(request({ ...base, ...bad }));
      expect(res.status).toBe(400);
    }
    expect(mockCreateAdmin).not.toHaveBeenCalled();
  });

  it('400 on customer, which is not a staff role', async () => {
    const res: any = await POST(request({ ...base, role: 'customer' }));
    expect(res.status).toBe(400);
  });
});
