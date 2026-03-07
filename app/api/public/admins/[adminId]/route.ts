import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { UserModel } from '@/models';
import { AdminService } from '@/services/admin-service';
import { IAdminPermissions } from '@/interfaces';
import { withApiAuth, apiSuccess, apiError, serialize, parseJsonBody } from '@/lib/api-response';

/**
 * GET /api/public/admins/:adminId
 *
 * Get a single admin user by ID.
 *
 * @authentication API Key required — scope: `settings:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} adminId - MongoDB ObjectId of the admin user
 *
 * @returns {Object}  response
 * @returns {boolean} response.success - `true`
 * @returns {Object}  response.data    - Admin profile (sensitive fields excluded)
 *
 * @status 200 - Success
 * @status 400 - Invalid adminId format
 * @status 404 - Admin not found
 * @status 500 - Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['settings:read'], async () => {
    try {
      const { adminId } = await params;

      if (!Types.ObjectId.isValid(adminId)) {
        return apiError('Invalid adminId format', 400);
      }

      const admin = await UserModel.findById(adminId)
        .select('-password -verificationPin -pinExpiresAt -sessionToken')
        .lean();

      if (!admin || !admin.isAdmin) {
        return apiError('Admin not found', 404);
      }

      return apiSuccess(serialize(admin));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/admins/:adminId', error);
      return apiError('Failed to fetch admin', 500);
    }
  });
}

/**
 * PATCH /api/public/admins/:adminId
 *
 * Update an admin user's status and/or permissions.
 *
 * @authentication API Key required — scope: `settings:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} adminId - MongoDB ObjectId of the admin user
 *
 * @body {string} [status]      - New status: `active` | `suspended`
 * @body {Object} [permissions] - New permissions object
 *
 * @returns {Object}  response
 * @returns {boolean} response.success - `true`
 * @returns {Object}  response.data    - Updated admin profile
 *
 * @status 200 - Admin updated
 * @status 400 - Invalid request
 * @status 404 - Admin not found
 * @status 422 - Validation error
 * @status 500 - Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['settings:write'], async () => {
    try {
      const { adminId } = await params;

      if (!Types.ObjectId.isValid(adminId)) {
        return apiError('Invalid adminId format', 400);
      }

      const body = await parseJsonBody<{
        status?: 'active' | 'suspended';
        permissions?: IAdminPermissions;
      }>(request);

      if (!body) {
        return apiError('Invalid JSON body', 400);
      }

      const { status, permissions } = body;

      if (status === undefined && permissions === undefined) {
        return apiError('At least one field must be provided: status, permissions', 400);
      }

      const API_USER_ID = '000000000000000000000000';

      // Update status if provided
      if (status !== undefined) {
        if (!['active', 'suspended'].includes(status)) {
          return apiError('status must be one of: active, suspended', 422);
        }

        try {
          await AdminService.updateStatus({
            adminId,
            status,
            updatedBy: API_USER_ID,
          });
        } catch (err: any) {
          if (err.message === 'Admin user not found') {
            return apiError('Admin not found', 404);
          }
          throw err;
        }
      }

      // Update permissions if provided
      if (permissions !== undefined) {
        try {
          await AdminService.updateAdminPermissions({
            adminId,
            permissions,
            updatedBy: API_USER_ID,
          });
        } catch (err: any) {
          if (err.message === 'Admin not found' || err.message === 'User is not an admin') {
            return apiError('Admin not found', 404);
          }
          if (err.message === 'Cannot modify super-admin permissions') {
            return apiError(err.message, 422);
          }
          throw err;
        }
      }

      // Re-fetch to return clean object without sensitive fields
      const admin = await UserModel.findById(adminId)
        .select('-password -verificationPin -pinExpiresAt -sessionToken')
        .lean();

      return apiSuccess(serialize(admin));
    } catch (error) {
      console.error('[PUBLIC API] PATCH /api/public/admins/:adminId', error);
      return apiError('Failed to update admin', 500);
    }
  });
}

/**
 * DELETE /api/public/admins/:adminId
 *
 * Soft-delete an admin user.
 *
 * @authentication API Key required — scope: `settings:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} adminId - MongoDB ObjectId of the admin user
 *
 * @returns {Object}  response
 * @returns {boolean} response.success - `true`
 * @returns {Object}  response.data    - `{ deleted: true }`
 *
 * @status 200 - Admin deleted
 * @status 400 - Invalid adminId format
 * @status 404 - Admin not found
 * @status 422 - Cannot delete (e.g. last super-admin)
 * @status 500 - Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['settings:write'], async () => {
    try {
      const { adminId } = await params;

      if (!Types.ObjectId.isValid(adminId)) {
        return apiError('Invalid adminId format', 400);
      }

      await AdminService.deleteAdmin({
        adminId,
        deletedBy: '000000000000000000000000',
      });

      return apiSuccess({ deleted: true });
    } catch (error: any) {
      if (error.message === 'Admin user not found') {
        return apiError('Admin not found', 404);
      }

      if (error.message === 'Cannot delete the last super-admin') {
        return apiError(error.message, 422);
      }

      console.error('[PUBLIC API] DELETE /api/public/admins/:adminId', error);
      return apiError('Failed to delete admin', 500);
    }
  });
}
