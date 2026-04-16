/**
 * @requirement REQ-027 - User re-creation after admin deletion
 *
 * Tests that deleteUserAction soft-deletes users (sets accountStatus to 'deleted'),
 * nulls unique fields (email, phone, username) to free them for reuse,
 * and creates an audit log entry.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: (...args: unknown[]) => mockAuditLog(...args),
  },
}));

// Mock user document
function createMockUser(overrides: Record<string, unknown> = {}) {
  const user: Record<string, unknown> = {
    _id: { toString: () => USER_OID },
    email: 'deleted@example.com',
    phone: '+2341234567890',
    username: null,
    role: 'customer',
    accountStatus: 'active',
    sessionToken: 'some-token',
    save: vi.fn().mockResolvedValue(undefined),
    deleteOne: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return user;
}

const mockFindById = vi.fn();
vi.mock('@/models/user-model', () => ({
  default: {
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

import { getIronSession } from 'iron-session';
import { deleteUserAction } from '@/app/actions/admin/user-actions';

// ── Session helper ────────────────────────────────────────────────────────────

// Valid ObjectId strings for Mongoose validation
const ADMIN_OID = '65a1b2c3d4e5f6a7b8c9d0e1';
const USER_OID = '65a1b2c3d4e5f6a7b8c9d0e2';

function mockSuperAdminSession() {
  vi.mocked(getIronSession).mockResolvedValue({
    isLoggedIn: true,
    userId: ADMIN_OID,
    email: 'admin@example.com',
    role: 'super-admin',
  } as any);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('REQ-027: deleteUserAction soft-delete behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft-deletes user by setting accountStatus to deleted', async () => {
    mockSuperAdminSession();
    const mockUser = createMockUser();
    mockFindById.mockResolvedValue(mockUser);

    const result = await deleteUserAction(USER_OID);

    expect(result.success).toBe(true);
    expect(mockUser.accountStatus).toBe('deleted');
    expect(mockUser.save).toHaveBeenCalled();
    // Should NOT hard-delete
    expect(mockUser.deleteOne).not.toHaveBeenCalled();
  });

  it('mangles unique fields (email, phone, username) on deletion', async () => {
    mockSuperAdminSession();
    const mockUser = createMockUser({
      email: 'reuse-me@example.com',
      phone: '+2349876543210',
      username: 'someuser',
    });
    mockFindById.mockResolvedValue(mockUser);

    await deleteUserAction(USER_OID);

    expect(mockUser.email).toBe(`del_${USER_OID}@deleted`);
    expect(mockUser.phone).toBe(`del_${USER_OID}`);
    expect(mockUser.username).toBe(`del_${USER_OID}`);
  });

  it('clears sessionToken on deletion', async () => {
    mockSuperAdminSession();
    const mockUser = createMockUser({ sessionToken: 'active-token' });
    mockFindById.mockResolvedValue(mockUser);

    await deleteUserAction(USER_OID);

    expect(mockUser.sessionToken).toBeUndefined();
  });

  it('creates audit log with deleted user details', async () => {
    mockSuperAdminSession();
    const mockUser = createMockUser({
      email: 'audit@example.com',
      role: 'customer',
    });
    mockFindById.mockResolvedValue(mockUser);

    await deleteUserAction(USER_OID);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ADMIN_OID,
        action: 'user.delete',
        resource: 'user',
        resourceId: USER_OID,
        details: expect.objectContaining({
          deletedUserEmail: 'audit@example.com',
          deletedUserRole: 'customer',
        }),
      })
    );
  });

  it('rejects non-super-admin users', async () => {
    vi.mocked(getIronSession).mockResolvedValue({
      isLoggedIn: true,
      userId: 'admin-id-123',
      role: 'admin',
    } as any);

    const result = await deleteUserAction(USER_OID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('super-admin');
  });

  it('prevents deleting own account', async () => {
    mockSuperAdminSession();
    const mockUser = createMockUser({
      _id: { toString: () => ADMIN_OID },
    });
    mockFindById.mockResolvedValue(mockUser);

    const result = await deleteUserAction(ADMIN_OID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot delete your own account');
  });

  it('prevents deleting other super-admins', async () => {
    mockSuperAdminSession();
    const mockUser = createMockUser({ role: 'super-admin' });
    mockFindById.mockResolvedValue(mockUser);

    const result = await deleteUserAction(USER_OID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('super-admin');
  });
});
