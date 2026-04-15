'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { UserRole } from '@/interfaces/user.interface';
import UserModel from '@/models/user-model';
import { connectDB } from '@/lib/mongodb';
import { AuditLogService } from '@/services/audit-log-service';
import { Types } from 'mongoose';

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Change user role (admin only)
 */
export async function changeUserRoleAction(
  userId: string,
  newRole: UserRole
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Check if user is admin
    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin can create other admins
    if (newRole === 'super-admin' && session.role !== 'super-admin') {
      return {
        success: false,
        error: 'Only super-admin can assign super-admin role',
      };
    }

    if (newRole === 'admin' && session.role !== 'super-admin') {
      return {
        success: false,
        error: 'Only super-admin can assign admin role',
      };
    }

    await connectDB();

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Prevent changing own role
    if (user._id.toString() === session.userId) {
      return { success: false, error: 'Cannot change your own role' };
    }

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: 'user.role-change',
      resource: 'user',
      resourceId: userId,
      details: {
        oldRole,
        newRole,
        targetUserEmail: user.email,
      },
    });

    revalidatePath('/dashboard/customers');

    return {
      success: true,
      message: `User role updated to ${newRole}`,
    };
  } catch (error) {
    console.error('Error changing user role:', error);
    return {
      success: false,
      error: 'Failed to change user role',
    };
  }
}

/**
 * Delete user (super-admin only)
 */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Only super-admin can delete users
    if (!session.userId || session.role !== 'super-admin') {
      return { success: false, error: 'Only super-admin can delete users' };
    }

    await connectDB();

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Prevent deleting own account
    if (user._id.toString() === session.userId) {
      return { success: false, error: 'Cannot delete your own account' };
    }

    // Prevent deleting other super-admins
    if (user.role === 'super-admin') {
      return { success: false, error: 'Cannot delete super-admin accounts' };
    }

    const userEmail = user.email;
    const userRole = user.role;

    // Soft delete: set status and unset unique fields to free them for reuse
    user.accountStatus = 'deleted';
    user.sessionToken = undefined;
    user.set('email', null);
    user.set('phone', null);
    user.set('username', null);
    await user.save();

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: 'user.delete',
      resource: 'user',
      resourceId: userId,
      details: {
        deletedUserEmail: userEmail,
        deletedUserRole: userRole,
      },
    });

    revalidatePath('/dashboard/customers');

    return {
      success: true,
      message: 'User deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: 'Failed to delete user',
    };
  }
}

/**
 * Get user details (admin only)
 */
export async function getUserDetailsAction(
  userId: string
): Promise<ActionResult<unknown>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    if (!Types.ObjectId.isValid(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }

    const user = await UserModel.findById(userId)
      .select('-verificationPin -pinExpiresAt -sessionToken')
      .lean();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error getting user details:', error);
    return {
      success: false,
      error: 'Failed to get user details',
    };
  }
}
