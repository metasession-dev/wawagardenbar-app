'use server';

import {
  requireSuperAdmin,
  requireRole,
  getCurrentSession,
} from '@/lib/auth-middleware';
import { revalidatePath } from 'next/cache';
import type { StaffRole } from '@/interfaces/user.interface';
import { getRoles } from '@/lib/session';
import { AdminService } from '@/services/admin-service';
import { connectDB } from '@/lib/mongodb';
import { IAdminPermissions } from '@/interfaces';

/**
 * Create new admin user
 */
export async function createAdminAction(data: {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  /** REQ-119 — one or more staff roles; `role` (single) is still accepted. */
  roles?: StaffRole[];
  role?: StaffRole;
  permissions?: IAdminPermissions;
}) {
  try {
    const session = await requireSuperAdmin();
    await connectDB();

    const admin = await AdminService.createAdmin({
      ...data,
      createdBy: session.userId!,
    });

    return {
      success: true,
      message: 'Admin created successfully',
      adminId: admin._id.toString(),
    };
  } catch (error: any) {
    console.error('Create admin error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create admin',
    };
  }
}

/**
 * List all admins
 */
export async function listAdminsAction(filters?: {
  search?: string;
  role?: StaffRole;
  status?: 'active' | 'suspended' | 'deleted';
  sortBy?: 'username' | 'role' | 'lastLoginAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) {
  try {
    await requireSuperAdmin();
    await connectDB();

    const result = await AdminService.listAdmins(filters);

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error('List admins error:', error);
    return {
      success: false,
      message: error.message || 'Failed to list admins',
      admins: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    };
  }
}

/**
 * Reset admin password
 */
export async function resetAdminPasswordAction(
  adminId: string
): Promise<
  | { success: true; message: string; tempPassword: string }
  | { success: false; message: string; tempPassword?: never }
> {
  try {
    const session = await requireSuperAdmin();
    await connectDB();

    const result = await AdminService.resetPassword({
      adminId,
      resetBy: session.userId!,
    });

    console.log('AdminService.resetPassword result:', {
      hasTempPassword: !!result.tempPassword,
      tempPasswordLength: result.tempPassword?.length,
      tempPassword: result.tempPassword,
    });

    const response = {
      success: true as const,
      message: 'Password reset successfully',
      tempPassword: result.tempPassword,
    };

    console.log('Returning from action:', response);

    return response;
  } catch (error: any) {
    console.error('Reset password error:', error);
    return {
      success: false as const,
      message: error.message || 'Failed to reset password',
    };
  }
}

/**
 * Change own password
 */
export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const session = await getCurrentSession();

    if (!session || !session.userId) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    await connectDB();

    await AdminService.changePassword({
      adminId: session.userId,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error: any) {
    console.error('Change password error:', error);
    return {
      success: false,
      message: error.message || 'Failed to change password',
    };
  }
}

/**
 * Update admin status
 */
export async function updateAdminStatusAction(data: {
  adminId: string;
  status: 'active' | 'suspended';
}) {
  try {
    const session = await requireSuperAdmin();
    await connectDB();

    await AdminService.updateStatus({
      adminId: data.adminId,
      status: data.status,
      updatedBy: session.userId!,
    });

    return {
      success: true,
      message: `Admin ${data.status === 'active' ? 'activated' : 'suspended'} successfully`,
    };
  } catch (error: any) {
    console.error('Update admin status error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update admin status',
    };
  }
}

/**
 * Update admin permissions
 */
export async function updateAdminPermissionsAction(
  adminId: string,
  permissions: IAdminPermissions
) {
  try {
    const session = await requireSuperAdmin();
    await connectDB();

    await AdminService.updateAdminPermissions({
      adminId,
      permissions,
      updatedBy: session.userId!,
    });

    return {
      success: true,
      message: 'Permissions updated successfully',
    };
  } catch (error: any) {
    console.error('Update permissions error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update permissions',
    };
  }
}

/**
 * Delete admin
 */
export async function deleteAdminAction(adminId: string) {
  try {
    const session = await requireSuperAdmin();
    await connectDB();

    await AdminService.deleteAdmin({
      adminId,
      deletedBy: session.userId!,
    });

    return {
      success: true,
      message: 'Admin deleted successfully',
    };
  } catch (error: any) {
    console.error('Delete admin error:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete admin',
    };
  }
}

/**
 * REQ-119 (AC3, AC5) — change the roles of a staff member. The rules (at
 * least one role, no self-edit, super-admin-only for admin/super-admin, last
 * super-admin protected) are enforced in `AdminService.updateRoles`.
 */
export async function updateAdminRolesAction(data: {
  adminId: string;
  roles: StaffRole[];
}) {
  try {
    const session = await requireRole(['admin', 'super-admin']);
    await connectDB();

    await AdminService.updateRoles({
      actor: { userId: session.userId!, roles: getRoles(session) },
      targetUserId: data.adminId,
      roles: data.roles,
    });

    revalidatePath('/dashboard/settings/admins');

    return {
      success: true,
      message:
        'Roles updated. The change takes effect at the member’s next sign-in (up to 7 days); suspend the account to cut access immediately.',
    };
  } catch (error: any) {
    console.error('Update admin roles error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update roles',
    };
  }
}
