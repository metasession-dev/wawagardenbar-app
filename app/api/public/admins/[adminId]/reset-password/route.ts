import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { AdminService } from '@/services/admin-service';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-response';

/**
 * POST /api/public/admins/:adminId/reset-password
 *
 * Reset an admin user's password and return a temporary password.
 * The admin will be required to change their password on next login.
 *
 * @authentication API Key required — scope: `settings:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} adminId - MongoDB ObjectId of the admin user
 *
 * @returns {Object}  response
 * @returns {boolean} response.success          - `true`
 * @returns {Object}  response.data
 * @returns {string}  response.data.tempPassword - Temporary password to relay to the admin
 *
 * @status 200 - Password reset successfully
 * @status 400 - Invalid adminId format
 * @status 404 - Admin not found
 * @status 500 - Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['settings:write'], async () => {
    try {
      const { adminId } = await params;

      if (!Types.ObjectId.isValid(adminId)) {
        return apiError('Invalid adminId format', 400);
      }

      const result = await AdminService.resetPassword({
        adminId,
        resetBy: '000000000000000000000000',
      });

      return apiSuccess({ tempPassword: result.tempPassword });
    } catch (error: any) {
      if (error.message === 'Admin user not found') {
        return apiError('Admin not found', 404);
      }

      console.error('[PUBLIC API] POST /api/public/admins/:adminId/reset-password', error);
      return apiError('Failed to reset password', 500);
    }
  });
}
