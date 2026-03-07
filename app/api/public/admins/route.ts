import { NextRequest } from 'next/server';
import { AdminService } from '@/services/admin-service';
import { IAdminPermissions } from '@/interfaces';
import { withApiAuth, apiSuccess, apiError, serialize, parsePagination, parseJsonBody } from '@/lib/api-response';

/**
 * GET /api/public/admins
 *
 * List admin users with optional filtering, sorting, and pagination.
 *
 * @authentication API Key required — scope: `settings:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string}  [search]    - Search by username, email, first/last name
 * @queryParam {string}  [role]      - Filter by role: `csr` | `admin` | `super-admin`
 * @queryParam {string}  [status]    - Filter by status: `active` | `suspended` | `deleted`
 * @queryParam {string}  [sortBy]    - Sort field: `username` | `role` | `lastLoginAt` | `createdAt`
 * @queryParam {string}  [sortOrder] - Sort direction: `asc` | `desc`
 * @queryParam {number}  [page]      - Page number (default 1)
 * @queryParam {number}  [limit]     - Page size (default 25, max 100)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success      - `true`
 * @returns {Object[]} response.data         - Array of admin objects
 * @returns {Object}   response.meta         - Pagination metadata
 *
 * @status 200 - Success
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `settings:read` scope
 * @status 500 - Internal server error
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['settings:read'], async () => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const { page, limit } = parsePagination(searchParams);

      const filters: Parameters<typeof AdminService.listAdmins>[0] = {
        page,
        limit,
        search: searchParams.get('search') || undefined,
        role: (searchParams.get('role') as 'csr' | 'admin' | 'super-admin') || undefined,
        status: (searchParams.get('status') as 'active' | 'suspended' | 'deleted') || undefined,
        sortBy: (searchParams.get('sortBy') as 'username' | 'role' | 'lastLoginAt' | 'createdAt') || undefined,
        sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      };

      const result = await AdminService.listAdmins(filters);

      return apiSuccess(serialize(result.admins), 200, {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
      });
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/admins', error);
      return apiError('Failed to list admins', 500);
    }
  });
}

/**
 * POST /api/public/admins
 *
 * Create a new admin user.
 *
 * @authentication API Key required — scope: `settings:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @body {string}  username               - Unique username (required)
 * @body {string}  password               - Password meeting strength requirements (required)
 * @body {string}  [email]                - Email address
 * @body {string}  [firstName]            - First name
 * @body {string}  [lastName]             - Last name
 * @body {string}  role                   - Role: `csr` | `admin` | `super-admin` (required)
 * @body {Object}  [permissions]          - Custom permissions object
 *
 * @returns {Object}  response
 * @returns {boolean} response.success    - `true`
 * @returns {Object}  response.data       - Created admin object
 *
 * @status 201 - Admin created
 * @status 400 - Invalid request body
 * @status 409 - Username already exists
 * @status 422 - Password validation failed
 * @status 500 - Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['settings:write'], async () => {
    try {
      const body = await parseJsonBody<{
        username: string;
        password: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        role: 'csr' | 'admin' | 'super-admin';
        permissions?: IAdminPermissions;
      }>(request);

      if (!body) {
        return apiError('Invalid JSON body', 400);
      }

      const { username, password, role } = body;

      if (!username || typeof username !== 'string') {
        return apiError('username is required', 400);
      }

      if (!password || typeof password !== 'string') {
        return apiError('password is required', 400);
      }

      if (!role || !['csr', 'admin', 'super-admin'].includes(role)) {
        return apiError('role must be one of: csr, admin, super-admin', 400);
      }

      const admin = await AdminService.createAdmin({
        username: body.username,
        password: body.password,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        createdBy: '000000000000000000000000',
        permissions: body.permissions,
      });

      const adminObj = admin.toObject();
      const { password: _pw, verificationPin: _vp, pinExpiresAt: _pe, sessionToken: _st, ...safeAdmin } = adminObj;

      return apiSuccess(serialize(safeAdmin), 201);
    } catch (error: any) {
      if (error.message === 'Username already exists') {
        return apiError('Username already exists', 409);
      }

      if (error.message?.includes('Password must') || error.message?.includes('password must')) {
        return apiError(error.message, 422);
      }

      console.error('[PUBLIC API] POST /api/public/admins', error);
      return apiError('Failed to create admin', 500);
    }
  });
}
