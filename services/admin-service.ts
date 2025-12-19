import bcrypt from 'bcrypt';
import { UserModel } from '../models';
import { AuditLogService } from './audit-log-service';
import { IAdminPermissions, DEFAULT_ADMIN_PERMISSIONS } from '../interfaces';

export class AdminService {
  private static readonly BCRYPT_ROUNDS = 12;

  private static readonly MAX_FAILED_ATTEMPTS = 5;

  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Get user details for audit log
   */
  private static async getUserForAudit(userId: string) {
    const user = await UserModel.findById(userId).select('email role');
    return {
      userEmail: user?.email || 'unknown',
      userRole: user?.role || 'unknown',
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
    role: 'admin' | 'super-admin';
    createdBy: string;
    permissions?: IAdminPermissions;
  }) {
    // Validate username uniqueness
    const existingUser = await UserModel.findOne({
      username: data.username.toLowerCase(),
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

    // Determine permissions based on role
    const adminPermissions = data.role === 'admin' 
      ? (data.permissions || DEFAULT_ADMIN_PERMISSIONS)
      : null; // Super-admin has no restrictions

    // Create user
    const admin = await UserModel.create({
      username: data.username.toLowerCase(),
      password: hashedPassword,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
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
        role: data.role,
      },
    });

    return admin;
  }

  /**
   * List all admin users
   */
  static async listAdmins(filters?: {
    search?: string;
    role?: 'admin' | 'super-admin';
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
      query.role = filters.role;
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
    const admin = await UserModel.findById(data.adminId);

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
    if (admin.role === 'super-admin') {
      const superAdminCount = await UserModel.countDocuments({
        role: 'super-admin',
        accountStatus: 'active',
      });

      if (superAdminCount <= 1) {
        throw new Error('Cannot delete the last super-admin');
      }
    }

    // Soft delete
    admin.accountStatus = 'deleted';
    admin.sessionToken = undefined;
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

    if (admin.role === 'super-admin') {
      throw new Error('Cannot modify super-admin permissions');
    }

    const oldPermissions = admin.permissions;
    admin.permissions = data.permissions;
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
