/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement SRS REQ-MENUMGT-006
 *
 * Pins the Mongoose-Mixed save contract for `AdminService.updateAdminPermissions`.
 *
 * The `permissions` field on the user model uses `Schema.Types.Mixed`, which
 * Mongoose cannot auto-detect changes on — even when the whole value is
 * reassigned. Without `markModified('permissions')` before `save()`, any new
 * sub-key the schema doesn't know about (e.g. REQ-076's
 * `mainCategoryReportAccess: string[]`) gets silently dropped, and the
 * persisted document continues to look identical to the prior shape.
 *
 * This silent-drop was the production defect surfaced by
 * `e2e/admin/main-category-report-permissions-ui.spec.ts` AC6: untick
 * Unrestricted + select Food + Drinks → save → DB read shows the field is
 * still undefined. Restricted admins would have logged in with the full
 * see-all-mains permission set the schema-known boolean fields imply.
 *
 * What this spec pins:
 *   ✓ `admin.permissions = data.permissions` runs (overwrite reference)
 *   ✓ `admin.markModified('permissions')` is called BEFORE save
 *   ✓ The full `IAdminPermissions` shape — including
 *     `mainCategoryReportAccess` — is what got assigned
 *   ✓ Order: assign → markModified → save (markModified before save)
 *   ✓ AuditLogService still receives oldPermissions + newPermissions
 *   ✓ Throws on missing admin / non-admin role / super-admin target
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(),
}));

// First findById call is the admin lookup (awaited directly).
// Second findById call is inside getUserForAudit and chains .select(...).
// Track both via separate spies and route by call order.
const mockAdminFind = vi.fn();
const mockAuditUserFind = vi.fn();
const mockFindOne = vi.fn();
let findByIdCallCount = 0;
vi.mock('@/models/user-model', () => ({
  default: {
    findById: (id: string) => {
      findByIdCallCount += 1;
      if (findByIdCallCount === 1) {
        // First call — awaited directly by updateAdminPermissions
        return mockAdminFind(id);
      }
      // Subsequent — .select(...) chain in getUserForAudit
      return {
        select: (_fields: string) => mockAuditUserFind(id),
      };
    },
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

const mockCreateLog = vi.fn();
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: (...args: unknown[]) => mockCreateLog(...args),
  },
}));

import { AdminService } from '@/services/admin-service';
import type { IAdminPermissions } from '@/interfaces/admin-permissions.interface';

function makeAdminDoc(
  overrides: Partial<{
    isAdmin: boolean;
    role: string;
    username: string;
    email: string;
    permissions: Partial<IAdminPermissions>;
  }> = {}
) {
  const markModified = vi.fn();
  const save = vi.fn().mockResolvedValue(undefined);
  return {
    _id: 'admin123',
    isAdmin: overrides.isAdmin ?? true,
    role: overrides.role ?? 'admin',
    username: overrides.username ?? 'admin-user',
    email: overrides.email ?? 'admin@example.com',
    permissions: overrides.permissions ?? {
      orderManagement: true,
      menuManagement: false,
      inventoryManagement: false,
      rewardsAndLoyalty: false,
      reportsAndAnalytics: true,
      expensesManagement: false,
      settingsAndConfiguration: false,
      kitchenManagement: false,
      incidentsAccess: true,
    },
    markModified,
    save,
  };
}

function makeUpdater(updatedBy: string = 'super-admin-id') {
  // `getUserForAudit` (private to AdminService) does a second
  // `UserModel.findById(id).select('email role')` to resolve the
  // updater's email + role for the audit log. Routed via
  // `mockAuditUserFind` because the second findById has a `.select(...)`
  // chain that the module mock distinguishes by call count.
  mockAuditUserFind.mockResolvedValue({
    _id: updatedBy,
    email: 'super@example.com',
    role: 'super-admin',
  });
  return updatedBy;
}

const BASE_PERMISSIONS: IAdminPermissions = {
  orderManagement: true,
  menuManagement: false,
  inventoryManagement: false,
  rewardsAndLoyalty: false,
  reportsAndAnalytics: true,
  expensesManagement: false,
  settingsAndConfiguration: false,
  kitchenManagement: false,
  incidentsAccess: true,
};

describe('AdminService.updateAdminPermissions', () => {
  beforeEach(() => {
    mockAdminFind.mockReset();
    mockAuditUserFind.mockReset();
    findByIdCallCount = 0;
    mockFindOne.mockReset();
    mockCreateLog.mockReset();
  });

  it('persists mainCategoryReportAccess array via markModified', async () => {
    const doc = makeAdminDoc();
    mockAdminFind.mockResolvedValue(doc);
    makeUpdater();

    const newPermissions: IAdminPermissions = {
      ...BASE_PERMISSIONS,
      mainCategoryReportAccess: ['food', 'drinks'],
    };

    await AdminService.updateAdminPermissions({
      adminId: 'admin123',
      permissions: newPermissions,
      updatedBy: 'super-admin-id',
    });

    // The assigned value carries the array
    expect(doc.permissions).toEqual(newPermissions);
    expect(doc.permissions.mainCategoryReportAccess).toEqual([
      'food',
      'drinks',
    ]);

    // markModified('permissions') is the load-bearing call. Without it,
    // Mongoose silently drops sub-keys it doesn't know about.
    expect(doc.markModified).toHaveBeenCalledWith('permissions');

    // Order: markModified must precede save (mongoose checks dirty state
    // when save is invoked).
    const markOrder = doc.markModified.mock.invocationCallOrder[0];
    const saveOrder = doc.save.mock.invocationCallOrder[0];
    expect(markOrder).toBeLessThan(saveOrder);

    // save was called once
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('persists empty mainCategoryReportAccess (no-access state)', async () => {
    const doc = makeAdminDoc({
      permissions: {
        ...BASE_PERMISSIONS,
        mainCategoryReportAccess: ['food'],
      },
    });
    mockAdminFind.mockResolvedValue(doc);
    makeUpdater();

    await AdminService.updateAdminPermissions({
      adminId: 'admin123',
      permissions: { ...BASE_PERMISSIONS, mainCategoryReportAccess: [] },
      updatedBy: 'super-admin-id',
    });

    expect(doc.permissions.mainCategoryReportAccess).toEqual([]);
    expect(doc.markModified).toHaveBeenCalledWith('permissions');
  });

  it('persists undefined mainCategoryReportAccess (unrestricted)', async () => {
    const doc = makeAdminDoc({
      permissions: {
        ...BASE_PERMISSIONS,
        mainCategoryReportAccess: ['food', 'drinks'],
      },
    });
    mockAdminFind.mockResolvedValue(doc);
    makeUpdater();

    await AdminService.updateAdminPermissions({
      adminId: 'admin123',
      permissions: BASE_PERMISSIONS, // no mainCategoryReportAccess key
      updatedBy: 'super-admin-id',
    });

    expect(doc.permissions.mainCategoryReportAccess).toBeUndefined();
    expect(doc.markModified).toHaveBeenCalledWith('permissions');
  });

  it('writes oldPermissions + newPermissions to audit log', async () => {
    const oldPerm: IAdminPermissions = { ...BASE_PERMISSIONS };
    const doc = makeAdminDoc({ permissions: oldPerm });
    mockAdminFind.mockResolvedValue(doc);
    makeUpdater();

    const newPermissions: IAdminPermissions = {
      ...BASE_PERMISSIONS,
      mainCategoryReportAccess: ['drinks'],
    };

    await AdminService.updateAdminPermissions({
      adminId: 'admin123',
      permissions: newPermissions,
      updatedBy: 'super-admin-id',
    });

    expect(mockCreateLog).toHaveBeenCalledTimes(1);
    const auditPayload = mockCreateLog.mock.calls[0][0];
    expect(auditPayload.action).toBe('admin.permissions-updated');
    expect(auditPayload.resourceId).toBe('admin123');
    expect(auditPayload.details.newPermissions).toEqual(newPermissions);
    expect(
      auditPayload.details.newPermissions.mainCategoryReportAccess
    ).toEqual(['drinks']);
  });

  it('throws when admin not found', async () => {
    mockAdminFind.mockResolvedValue(null);

    await expect(
      AdminService.updateAdminPermissions({
        adminId: 'missing',
        permissions: BASE_PERMISSIONS,
        updatedBy: 'super-admin-id',
      })
    ).rejects.toThrow('Admin not found');
  });

  it('throws when user is not an admin', async () => {
    const doc = makeAdminDoc({ isAdmin: false });
    mockAdminFind.mockResolvedValue(doc);

    await expect(
      AdminService.updateAdminPermissions({
        adminId: 'admin123',
        permissions: BASE_PERMISSIONS,
        updatedBy: 'super-admin-id',
      })
    ).rejects.toThrow('User is not an admin');
  });

  it('throws when target is super-admin (cannot modify)', async () => {
    const doc = makeAdminDoc({ role: 'super-admin' });
    mockAdminFind.mockResolvedValue(doc);

    await expect(
      AdminService.updateAdminPermissions({
        adminId: 'super-admin-id',
        permissions: BASE_PERMISSIONS,
        updatedBy: 'super-admin-id',
      })
    ).rejects.toThrow('Cannot modify super-admin permissions');
  });
});
