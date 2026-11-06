import bcrypt from 'bcrypt';
import { UserModel } from '../models';
import { AuditLogService } from './audit-log-service';
import { IAdminPermissions } from '../interfaces';
import { StaffRole, STAFF_ROLES } from '../interfaces/user.interface';
import { getRoles, getPrimaryRole, hasAnyRole } from '../lib/session';
import {
  defaultPermissionsForRoles,
  recomputePermissionsForRoleChange,
} from '../lib/permissions';

/** REQ-119 — roles only a super-admin may grant, remove, or edit on a holder. */
const PRIVILEGED_ROLES: readonly StaffRole[] = ['admin', 'super-admin'];

export interface RoleChangeActor {
  userId: string;
  roles: readonly string[];
}

/** Canonical order, no duplicates, staff roles only. */
export function normalizeStaffRoles(input: readonly string[]): StaffRole[] {
  return STAFF_ROLES.filter((role) => input.includes(role));
}

export class AdminService {
  private static readonly BCRYPT_ROUNDS = 12;

  private static readonly MAX_FAILED_ATTEMPTS = 5;

  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Get user details for audit log
   */
  private static async getUserForAudit(userId: string) {
    const user = await UserModel.findById(userId).select('email role roles');
    return {
      userEmail: user?.email || 'unknown',
      userRole: getPrimaryRole(user) || 'unknown',
    };
  }

  /**
   * Hash password with bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify password
   */
  static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate temporary password
   */
  static generateTemporaryPassword(): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each required character type
    password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)];
    password += '23456789'[Math.floor(Math.random() * 8)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill remaining characters
    for (let i = 4; i < 12; i += 1) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Create admin user
   */
  static async createAdmin(data: {
    username: string;
    password: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    /** REQ-119 — one or more staff roles. `role` (single) is still accepted. */
    roles?: StaffRole[];
    role?: StaffRole;
    createdBy: string;
    permissions?: IAdminPermissions;
  }) {
    const roles = normalizeStaffRoles(
      data.roles && data.roles.length > 0
        ? data.roles
        : data.role
          ? [data.role]
          : []
    );
    if (roles.length === 0) {
      throw new Error('At least one role is required');
    }

    // Validate username uniqueness (exclude soft-deleted users)
    const existingUser = await UserModel.findOne({
      username: data.username.toLowerCase(),
      accountStatus: { $ne: 'deleted' },
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Validate password strength
    const passwordValidation = this.validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password);

    // Permissions: the union of the roles' defaults unless explicit ones are
    // given. A super-admin has no restrictions (null).
    const adminPermissions: IAdminPermissions | null = roles.includes(
      'super-admin'
    )
      ? null
      : data.permissions || defaultPermissionsForRoles(roles);

    // Create user
    const admin = await UserModel.create({
      username: data.username.toLowerCase(),
      password: hashedPassword,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: getPrimaryRole({ roles }),
      roles,
      isAdmin: true,
      accountStatus: 'active',
      emailVerified: true, // Admin emails don't need verification
      phoneVerified: false,
      phone: `admin_${Date.now()}`, // Dummy phone to satisfy required field
      permissions: adminPermissions,
    });

    // Create audit log
    const auditUser = await this.getUserForAudit(data.createdBy);
    await AuditLogService.createLog({
      userId: data.createdBy,
      userEmail: auditUser.userEmail,
      userRole: auditUser.userRole,
      action: 'admin.create',
      resource: 'admin',
      resourceId: admin._id.toString(),
      details: {
        username: data.username,
        role: getPrimaryRole({ roles }),
        roles,
      },
    });
    await this.logRolesUpdated({
      actorId: data.createdBy,
      targetId: admin._id.toString(),
      targetName: data.username,
      before: [],
      after: roles,
    });

    return admin;
  }

  /**
   * REQ-119 (AC5) — one audit row per creation or change of roles.
   */
  private static async logRolesUpdated(data: {
    actorId: string;
    targetId: string;
    targetName?: string;
    before: readonly StaffRole[];
    after: readonly StaffRole[];
  }) {
    const auditUser = await this.getUserForAudit(data.actorId);
    await AuditLogService.createLog({
      userId: data.actorId,
      userEmail: auditUser.userEmail,
      userRole: auditUser.userRole,
      action: 'admin.roles-updated',
      resource: 'admin',
      resourceId: data.targetId,
      details: {
        target: data.targetName,
        before: [...data.before],
        after: [...data.after],
        added: data.after.filter((role) => !data.before.includes(role)),
        removed: data.before.filter((role) => !data.after.includes(role)),
      },
    });
  }

  /** Active accounts holding super-admin, excluding one user id. */
  private static async countOtherSuperAdmins(excludeUserId: string) {
    return UserModel.countDocuments({
      _id: { $ne: excludeUserId },
      accountStatus: 'active',
      $or: [{ roles: 'super-admin' }, { role: 'super-admin' }],
    });
  }

  /**
   * REQ-119 (AC3, AC5, AC7) — set the roles of a staff member (or, with an
   * empty list, demote them to a plain customer account).
   *
   * Enforced here, not only in the dialogs: the actor must be an admin or
   * super-admin; nobody changes their own roles; only a super-admin grants or
   * removes `admin` or `super-admin` or touches a holder of them; the last
   * super-admin cannot lose that role. Writes `roles`, the back-compat `role`
   * (highest), the recomputed permissions, and one audit row.
   */
  static async updateRoles(data: {
    actor: RoleChangeActor;
    targetUserId: string;
    roles: readonly string[];
    /** The customers-page flow may demote to a customer (empty roles). */
    allowEmpty?: boolean;
  }) {
    const after = normalizeStaffRoles(data.roles);
    if (after.length !== new Set(data.roles).size) {
      throw new Error('Unknown role');
    }
    if (after.length === 0 && !data.allowEmpty) {
      throw new Error('At least one role is required');
    }

    const actorIsSuperAdmin = hasAnyRole({ roles: [...data.actor.roles] }, [
      'super-admin',
    ]);
    const actorIsAdmin = hasAnyRole({ roles: [...data.actor.roles] }, [
      'admin',
      'super-admin',
    ]);
    if (!actorIsAdmin) {
      throw new Error('Unauthorized');
    }
    if (data.targetUserId === data.actor.userId) {
      throw new Error('Cannot change your own roles');
    }

    const target = await UserModel.findById(data.targetUserId);
    if (!target) {
      throw new Error('User not found');
    }

    const before = getRoles(target).filter((role): role is StaffRole =>
      STAFF_ROLES.includes(role as StaffRole)
    );
    const changed = [
      ...after.filter((role) => !before.includes(role)),
      ...before.filter((role) => !after.includes(role)),
    ];

    if (!actorIsSuperAdmin) {
      const holdsPrivileged = before.some((role) =>
        PRIVILEGED_ROLES.includes(role)
      );
      const touchesPrivileged = changed.some((role) =>
        PRIVILEGED_ROLES.includes(role)
      );
      if (holdsPrivileged || touchesPrivileged) {
        throw new Error(
          'Only a super-admin can grant or remove admin or super-admin, or change their holders'
        );
      }
    }

    if (changed.length === 0) {
      return target;
    }

    if (
      before.includes('super-admin') &&
      !after.includes('super-admin') &&
      (await this.countOtherSuperAdmins(data.targetUserId)) === 0
    ) {
      throw new Error('Cannot remove the last super-admin');
    }

    target.roles = after;
    target.role =
      after.length > 0 ? getPrimaryRole({ roles: after })! : 'customer';
    if (after.length === 0) {
      target.isAdmin = false;
    } else {
      target.isAdmin = true;
      target.permissions = after.includes('super-admin')
        ? (null as unknown as IAdminPermissions)
        : recomputePermissionsForRoleChange(
            target.permissions ?? undefined,
            before,
            after
          );
      target.markModified('permissions');
    }
    await target.save();

    await this.logRolesUpdated({
      actorId: data.actor.userId,
      targetId: data.targetUserId,
      targetName: target.username || target.email,
      before,
      after,
    });

    return target;
  }

  /**
   * List all admin users
   */
  static async listAdmins(filters?: {
    search?: string;
    role?: StaffRole;
    status?: 'active' | 'suspended' | 'deleted';
    sortBy?: 'username' | 'role' | 'lastLoginAt' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const query: any = { isAdmin: true };

    // Apply filters
    if (filters?.search) {
      query.$or = [
        { username: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters?.role) {
      // REQ-119 — match `roles`, and `role` for records not yet migrated.
      const roleMatch = [{ roles: filters.role }, { role: filters.role }];
      query.$and = [...(query.$and || []), { $or: roleMatch }];
    }

    if (filters?.status) {
      query.accountStatus = filters.status;
    }

    // Build sort
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    // Execute query
    const [admins, total] = await Promise.all([
      UserModel.find(query)
        .select('-password -verificationPin -pinExpiresAt -sessionToken')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ]);

    return {
      admins: JSON.parse(JSON.stringify(admins)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reset admin password
   */
  static async resetPassword(data: { adminId: string; resetBy: string }) {
    const admin = await UserModel.findById(data.adminId).select('+password');

    if (!admin || !admin.isAdmin) {
      throw new Error('Admin user not found');
    }

    // Generate temporary password
    const tempPassword = this.generateTemporaryPassword();
    const hashedPassword = await this.hashPassword(tempPassword);

    // Update admin
    admin.password = hashedPassword;
    admin.mustChangePassword = true;
    admin.passwordChangedAt = new Date();
    admin.failedLoginAttempts = 0;
    admin.accountLockedUntil = undefined;
    admin.sessionToken = undefined; // Invalidate session
    await admin.save();

    // Create audit log
    const auditUser = await this.getUserForAudit(data.resetBy);
    await AuditLogService.createLog({
      userId: data.resetBy,
      userEmail: auditUser.userEmail,
      userRole: auditUser.userRole,
      action: 'user.password-reset',
      resource: 'admin',
      resourceId: data.adminId,
      details: {
        username: admin.username,
      },
    });

    return {
      tempPassword,
      admin,
    };
  }

  /**
   * Change admin password
   */
  static async changePassword(data: {
    adminId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const admin = await UserModel.findById(data.adminId).select('+password');

    if (!admin || !admin.isAdmin) {
      throw new Error('Admin user not found');
    }

    // Verify current password
    const isValid = await this.verifyPassword(
      data.currentPassword,
      admin.password!
    );

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(data.newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(data.newPassword);

    // Update admin
    admin.password = hashedPassword;
    admin.mustChangePassword = false;
    admin.passwordChangedAt = new Date();
    await admin.save();

    // Create audit log
    await AuditLogService.createLog({
      userId: data.adminId,
      userEmail: admin.email || 'unknown',
      userRole: admin.role,
      action: 'user.password-change',
      resource: 'admin',
      resourceId: data.adminId,
      details: {
        username: admin.username,
      },
    });

    return admin;
  }

  /**
   * Update admin status
   */
  static async updateStatus(data: {
    adminId: string;
    status: 'active' | 'suspended';
    updatedBy: string;
  }) {
    const admin = await UserModel.findById(data.adminId);

    if (!admin || !admin.isAdmin) {
      throw new Error('Admin user not found');
    }

    // Update status
    admin.accountStatus = data.status;

    // If suspending, invalidate session
    if (data.status === 'suspended') {
      admin.sessionToken = undefined;
    }

    await admin.save();

    // Create audit log
    const auditUser = await this.getUserForAudit(data.updatedBy);
    await AuditLogService.createLog({
      userId: data.updatedBy,
      userEmail: auditUser.userEmail,
      userRole: auditUser.userRole,
      action: 'user.status-change',
      resource: 'admin',
      resourceId: data.adminId,
      details: {
        username: admin.username,
        newStatus: data.status,
      },
    });

    return admin;
  }

  /**
   * Delete admin
   */
  static async deleteAdmin(data: { adminId: string; deletedBy: string }) {
    const admin = await UserModel.findById(data.adminId);

    if (!admin || !admin.isAdmin) {
      throw new Error('Admin user not found');
    }

    // Check if last super-admin
    if (hasAnyRole(admin, ['super-admin'])) {
      if ((await this.countOtherSuperAdmins(data.adminId)) === 0) {
        throw new Error('Cannot delete the last super-admin');
      }
    }

    // Soft delete: set status and mangle unique fields to free them for reuse
    // Replace values with a unique identifier to avoid duplicate key errors
    const uid = admin._id.toString();
    admin.accountStatus = 'deleted';
    admin.sessionToken = undefined;
    if (admin.email) admin.email = `del_${uid}@deleted`;
    if (admin.phone) admin.phone = `del_${uid}`;
    if (admin.username) admin.username = `del_${uid}`;
    await admin.save();

    // Create audit log
    const auditUser = await this.getUserForAudit(data.deletedBy);
    await AuditLogService.createLog({
      userId: data.deletedBy,
      userEmail: auditUser.userEmail,
      userRole: auditUser.userRole,
      action: 'user.delete',
      resource: 'admin',
      resourceId: data.adminId,
      details: {
        username: admin.username,
        role: admin.role,
        roles: getRoles(admin),
      },
    });

    return admin;
  }

  /**
   * Update admin permissions
   */
  static async updateAdminPermissions(data: {
    adminId: string;
    permissions: IAdminPermissions;
    updatedBy: string;
  }) {
    const admin = await UserModel.findById(data.adminId);

    if (!admin) {
      throw new Error('Admin not found');
    }

    if (!admin.isAdmin) {
      throw new Error('User is not an admin');
    }

    if (hasAnyRole(admin, ['super-admin'])) {
      throw new Error('Cannot modify super-admin permissions');
    }

    const oldPermissions = admin.permissions;
    admin.permissions = data.permissions;
    // `permissions` is Schema.Types.Mixed; Mongoose can't auto-detect
    // changes to a Mixed path even when the whole value is reassigned.
    // markModified is the documented pattern. Without it, REQ-076's
    // `mainCategoryReportAccess` (a new sub-key the schema doesn't
    // know about) gets silently dropped on save.
    admin.markModified('permissions');
    await admin.save();

    const auditUser = await this.getUserForAudit(data.updatedBy);
    await AuditLogService.createLog({
      userId: data.updatedBy,
      userEmail: auditUser.userEmail,
      userRole: auditUser.userRole,
      action: 'admin.permissions-updated',
      resource: 'admin',
      resourceId: data.adminId,
      details: {
        username: admin.username,
        oldPermissions,
        newPermissions: data.permissions,
      },
    });

    return admin;
  }

  /**
   * Authenticate admin
   */
  static async authenticate(username: string, password: string) {
    // Find admin by username
    const admin = await UserModel.findOne({
      username: username.toLowerCase(),
      isAdmin: true,
    }).select('+password +failedLoginAttempts +accountLockedUntil');

    if (!admin) {
      throw new Error('Invalid credentials');
    }

    // Check account status
    if (admin.accountStatus === 'suspended') {
      throw new Error('Account is suspended');
    }

    if (admin.accountStatus === 'deleted') {
      throw new Error('Account not found');
    }

    // Check if account is locked
    if (admin.accountLockedUntil && admin.accountLockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (admin.accountLockedUntil.getTime() - Date.now()) / 60000
      );
      throw new Error(
        `Account is locked. Try again in ${minutesRemaining} minute(s)`
      );
    }

    // Verify password
    const isValid = await this.verifyPassword(password, admin.password!);

    if (!isValid) {
      // Increment failed attempts
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;

      // Lock account after max attempts
      if (admin.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
        admin.accountLockedUntil = new Date(
          Date.now() + this.LOCKOUT_DURATION_MS
        );
        await admin.save();

        // Create audit log
        await AuditLogService.createLog({
          userId: admin._id.toString(),
          userEmail: admin.email || 'unknown',
          userRole: admin.role,
          action: 'admin.account-locked',
          resource: 'admin',
          resourceId: admin._id.toString(),
          details: {
            username: admin.username,
            reason: 'Too many failed login attempts',
          },
        });

        throw new Error(
          'Account locked due to too many failed login attempts. Try again in 15 minutes.'
        );
      }

      await admin.save();

      // Create audit log
      await AuditLogService.createLog({
        userId: admin._id.toString(),
        userEmail: admin.email || 'unknown',
        userRole: admin.role,
        action: 'admin.login-failed',
        resource: 'admin',
        resourceId: admin._id.toString(),
        details: {
          username: admin.username,
          failedAttempts: admin.failedLoginAttempts,
        },
      });

      throw new Error('Invalid credentials');
    }

    // Reset failed attempts and unlock
    admin.failedLoginAttempts = 0;
    admin.accountLockedUntil = undefined;
    admin.lastLoginAt = new Date();
    await admin.save();

    // Create audit log
    await AuditLogService.createLog({
      userId: admin._id.toString(),
      userEmail: admin.email || 'unknown',
      userRole: admin.role,
      action: 'admin.login',
      resource: 'admin',
      resourceId: admin._id.toString(),
      details: {
        username: admin.username,
      },
    });

    return admin;
  }
}
