/**
 * @requirement REQ-119 — AC3, AC5, AC7 (ADR-009)
 * @srs REQ-AUTHA-006
 *
 * `AdminService.updateRoles` enforces the role-management rules server-side
 * (not only in the dialogs) and writes exactly one audit row per change.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));

const docs: Record<string, any> = {};
const mockCountDocuments = vi.fn();
const mockCreate = vi.fn();
const mockFindOne = vi.fn();
vi.mock('@/models/user-model', () => ({
  default: {
    findById: (id: string) => {
      const query: any = Promise.resolve(docs[id] ?? null);
      query.select = () => Promise.resolve(docs[id] ?? null);
      return query;
    },
    countDocuments: (...args: unknown[]) => mockCountDocuments(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

const mockCreateLog = vi.fn();
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: (...args: unknown[]) => mockCreateLog(...args),
  },
}));

import { AdminService } from '@/services/admin-service';
import { CSR_DEFAULT_PERMISSIONS } from '@/interfaces/admin-permissions.interface';

function makeUser(id: string, fields: Record<string, unknown>) {
  const doc: any = {
    _id: { toString: () => id },
    email: `${id}@test`,
    username: id,
    isAdmin: true,
    accountStatus: 'active',
    permissions: { ...CSR_DEFAULT_PERMISSIONS },
    ...fields,
    markModified: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  };
  docs[id] = doc;
  return doc;
}

const superAdmin = { userId: 'sa', roles: ['super-admin'] };
const admin = { userId: 'ad', roles: ['admin'] };

beforeEach(() => {
  for (const key of Object.keys(docs)) delete docs[key];
  mockCreateLog.mockReset();
  mockCountDocuments.mockReset();
  mockCountDocuments.mockResolvedValue(1);
  mockCreate.mockReset();
  mockFindOne.mockReset();
  makeUser('sa', { role: 'super-admin', roles: ['super-admin'] });
  makeUser('ad', { role: 'admin', roles: ['admin'] });
});

describe('updateRoles — happy path (AC3, AC5, AC7)', () => {
  it('sets roles, the highest role as role, and writes one audit row', async () => {
    const target = makeUser('t1', { role: 'csr', roles: ['csr'] });

    await AdminService.updateRoles({
      actor: superAdmin,
      targetUserId: 't1',
      roles: ['kitchen', 'csr'],
    });

    expect(target.roles).toEqual(['csr', 'kitchen']);
    expect(target.role).toBe('csr');
    expect(target.save).toHaveBeenCalledTimes(1);
    expect(mockCreateLog).toHaveBeenCalledTimes(1);
    expect(mockCreateLog.mock.calls[0][0]).toMatchObject({
      userId: 'sa',
      action: 'admin.roles-updated',
      resourceId: 't1',
      details: {
        before: ['csr'],
        after: ['csr', 'kitchen'],
        added: ['kitchen'],
        removed: [],
      },
    });
  });

  it('reads an unmigrated user (only role) as [role] for the before value', async () => {
    makeUser('t2', { role: 'csr' });

    await AdminService.updateRoles({
      actor: superAdmin,
      targetUserId: 't2',
      roles: ['csr', 'manager'],
    });

    expect(mockCreateLog.mock.calls[0][0].details).toMatchObject({
      before: ['csr'],
      after: ['csr', 'manager'],
      added: ['manager'],
    });
  });

  it('recomputes permissions: adding manager turns reports on, markModified is called', async () => {
    const target = makeUser('t3', { role: 'csr', roles: ['csr'] });

    await AdminService.updateRoles({
      actor: superAdmin,
      targetUserId: 't3',
      roles: ['csr', 'manager'],
    });

    expect(target.permissions.reportsAndAnalytics).toBe(true);
    expect(target.markModified).toHaveBeenCalledWith('permissions');
  });

  it('writes no audit row and does not save when nothing changes', async () => {
    const target = makeUser('t4', { role: 'csr', roles: ['csr'] });

    await AdminService.updateRoles({
      actor: superAdmin,
      targetUserId: 't4',
      roles: ['csr'],
    });

    expect(target.save).not.toHaveBeenCalled();
    expect(mockCreateLog).not.toHaveBeenCalled();
  });

  it('an admin may change csr, kitchen and manager on a non-privileged member', async () => {
    const target = makeUser('t5', { role: 'csr', roles: ['csr'] });

    await AdminService.updateRoles({
      actor: admin,
      targetUserId: 't5',
      roles: ['csr', 'kitchen', 'manager'],
    });

    expect(target.roles).toEqual(['csr', 'kitchen', 'manager']);
  });
});

describe('updateRoles — rejections (AC3)', () => {
  it('rejects an empty role list', async () => {
    makeUser('t6', { role: 'csr', roles: ['csr'] });
    await expect(
      AdminService.updateRoles({
        actor: superAdmin,
        targetUserId: 't6',
        roles: [],
      })
    ).rejects.toThrow('At least one role is required');
    expect(mockCreateLog).not.toHaveBeenCalled();
  });

  it('rejects unknown roles', async () => {
    makeUser('t7', { role: 'csr', roles: ['csr'] });
    await expect(
      AdminService.updateRoles({
        actor: superAdmin,
        targetUserId: 't7',
        roles: ['csr', 'bar'],
      })
    ).rejects.toThrow('Unknown role');
  });

  it('rejects a self-edit', async () => {
    await expect(
      AdminService.updateRoles({
        actor: superAdmin,
        targetUserId: 'sa',
        roles: ['super-admin', 'csr'],
      })
    ).rejects.toThrow('Cannot change your own roles');
  });

  it('rejects an actor who is not an admin or super-admin', async () => {
    makeUser('t8', { role: 'csr', roles: ['csr'] });
    await expect(
      AdminService.updateRoles({
        actor: { userId: 'cs', roles: ['csr', 'manager', 'kitchen'] },
        targetUserId: 't8',
        roles: ['csr', 'kitchen'],
      })
    ).rejects.toThrow('Unauthorized');
  });

  it('an admin cannot grant admin or super-admin', async () => {
    const target = makeUser('t9', { role: 'csr', roles: ['csr'] });
    for (const granted of ['admin', 'super-admin']) {
      await expect(
        AdminService.updateRoles({
          actor: admin,
          targetUserId: 't9',
          roles: ['csr', granted],
        })
      ).rejects.toThrow(/Only a super-admin/);
    }
    expect(target.save).not.toHaveBeenCalled();
  });

  it('an admin cannot change the roles of an admin or super-admin holder', async () => {
    makeUser('t10', { role: 'admin', roles: ['admin'] });
    await expect(
      AdminService.updateRoles({
        actor: admin,
        targetUserId: 't10',
        roles: ['admin', 'kitchen'],
      })
    ).rejects.toThrow(/Only a super-admin/);
    makeUser('t11', { role: 'super-admin', roles: ['super-admin'] });
    await expect(
      AdminService.updateRoles({
        actor: admin,
        targetUserId: 't11',
        roles: ['csr'],
      })
    ).rejects.toThrow(/Only a super-admin/);
  });

  it('the last super-admin cannot lose that role', async () => {
    makeUser('only', { role: 'super-admin', roles: ['super-admin'] });
    mockCountDocuments.mockResolvedValue(0);
    await expect(
      AdminService.updateRoles({
        actor: superAdmin,
        targetUserId: 'only',
        roles: ['admin'],
      })
    ).rejects.toThrow('Cannot remove the last super-admin');
    expect(mockCreateLog).not.toHaveBeenCalled();
  });

  it('a super-admin can be demoted while another super-admin exists', async () => {
    const target = makeUser('two', {
      role: 'super-admin',
      roles: ['super-admin'],
    });
    mockCountDocuments.mockResolvedValue(1);
    await AdminService.updateRoles({
      actor: superAdmin,
      targetUserId: 'two',
      roles: ['admin'],
    });
    expect(target.roles).toEqual(['admin']);
    expect(target.role).toBe('admin');
  });

  it('rejects a missing target', async () => {
    await expect(
      AdminService.updateRoles({
        actor: superAdmin,
        targetUserId: 'nope',
        roles: ['csr'],
      })
    ).rejects.toThrow('User not found');
  });
});

describe('updateRoles — customers-page demotion (allowEmpty)', () => {
  it('empty roles with allowEmpty returns the account to a plain customer', async () => {
    const target = makeUser('t12', { role: 'csr', roles: ['csr'] });

    await AdminService.updateRoles({
      actor: superAdmin,
      targetUserId: 't12',
      roles: [],
      allowEmpty: true,
    });

    expect(target.roles).toEqual([]);
    expect(target.role).toBe('customer');
    expect(target.isAdmin).toBe(false);
    expect(mockCreateLog.mock.calls[0][0].details).toMatchObject({
      before: ['csr'],
      after: [],
      removed: ['csr'],
    });
  });
});

describe('createAdmin writes roles and an audit row (AC1, AC5, AC7)', () => {
  beforeEach(() => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockImplementation(async (data: any) => ({
      ...data,
      _id: { toString: () => 'new1' },
    }));
  });

  it('stores roles[], the highest role, and the union of role defaults', async () => {
    await AdminService.createAdmin({
      username: 'multi',
      password: 'Str0ng!Passw0rd',
      roles: ['kitchen', 'csr'],
      createdBy: 'sa',
    });

    const created = mockCreate.mock.calls[0][0];
    expect(created.roles).toEqual(['csr', 'kitchen']);
    expect(created.role).toBe('csr');
    expect(created.permissions.orderManagement).toBe(true);
    expect(created.permissions.rewardsAndLoyalty).toBe(true);
    expect(created.permissions.settingsAndConfiguration).toBe(false);

    const actions = mockCreateLog.mock.calls.map((call) => call[0].action);
    expect(actions).toContain('admin.create');
    expect(actions).toContain('admin.roles-updated');
    const rolesRow = mockCreateLog.mock.calls
      .map((call) => call[0])
      .find((row) => row.action === 'admin.roles-updated');
    expect(rolesRow.details).toMatchObject({
      before: [],
      after: ['csr', 'kitchen'],
      added: ['csr', 'kitchen'],
    });
  });

  it('still accepts the legacy single role', async () => {
    await AdminService.createAdmin({
      username: 'legacy',
      password: 'Str0ng!Passw0rd',
      role: 'admin',
      createdBy: 'sa',
    });
    expect(mockCreate.mock.calls[0][0].roles).toEqual(['admin']);
    expect(mockCreate.mock.calls[0][0].role).toBe('admin');
  });

  it('a super-admin account has no permission restrictions (null)', async () => {
    await AdminService.createAdmin({
      username: 'boss',
      password: 'Str0ng!Passw0rd',
      roles: ['super-admin'],
      createdBy: 'sa',
    });
    expect(mockCreate.mock.calls[0][0].permissions).toBeNull();
  });

  it('rejects creation with no role', async () => {
    await expect(
      AdminService.createAdmin({
        username: 'norole',
        password: 'Str0ng!Passw0rd',
        createdBy: 'sa',
      })
    ).rejects.toThrow('At least one role is required');
  });
});
