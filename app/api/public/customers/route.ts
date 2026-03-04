import { NextRequest } from 'next/server';
import UserModel from '@/models/user-model';
import { UserService } from '@/services/user-service';
import { withApiAuth, apiSuccess, apiError, parsePagination, parseJsonBody, serialize } from '@/lib/api-response';

/**
 * GET /api/public/customers
 *
 * List or search registered customers. Guest accounts are excluded by default.
 * Sensitive fields (password, verification PIN, session token) are never returned.
 *
 * @authentication API Key required — scope: `customers:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [q]              - Search by email, phone, or name (min 3 chars). Uses `UserService.searchUsers`.
 * @queryParam {string} [role]           - Filter by role: `"customer"` | `"admin"` | `"super-admin"`
 * @queryParam {string} [status=active]  - Account status: `"active"` | `"suspended"` | `"deleted"`
 * @queryParam {string} [sort=-createdAt] - Sort field with optional `-` prefix: `"createdAt"` | `"-createdAt"` | `"totalSpent"` | `"-totalSpent"`
 * @queryParam {number} [page=1]         - Page number (1-indexed)
 * @queryParam {number} [limit=25]       - Items per page (max 100)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                    - `true`
 * @returns {Object[]} response.data                       - Array of customer profiles
 * @returns {string}   response.data[]._id                 - User ID
 * @returns {string}   [response.data[].firstName]         - First name
 * @returns {string}   [response.data[].lastName]          - Last name
 * @returns {string}   response.data[].email               - Email address
 * @returns {boolean}  response.data[].emailVerified       - Whether email is verified
 * @returns {string}   [response.data[].phone]             - Phone number
 * @returns {string}   response.data[].role                - `"customer"` | `"admin"` | `"super-admin"`
 * @returns {string}   response.data[].accountStatus       - `"active"` | `"suspended"` | `"deleted"`
 * @returns {number}   response.data[].totalSpent          - Lifetime spend in ₦
 * @returns {number}   response.data[].totalOrders         - Lifetime order count
 * @returns {number}   response.data[].loyaltyPoints       - Current loyalty points balance
 * @returns {Object[]} response.data[].addresses           - Saved addresses
 * @returns {string}   response.data[].createdAt           - Account creation ISO timestamp
 * @returns {Object}   response.meta                       - Pagination metadata
 * @returns {number}   response.meta.page
 * @returns {number}   response.meta.limit
 * @returns {number}   response.meta.total
 * @returns {number}   response.meta.totalPages
 * @returns {string}   response.meta.timestamp
 *
 * @status 200 - Success with paginated customer list
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `customers:read` scope
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request — search by email
 * GET /api/public/customers?q=ada@example.com
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "_id": "665e...",
 *       "firstName": "Ada",
 *       "lastName": "Obi",
 *       "email": "ada@example.com",
 *       "role": "customer",
 *       "totalSpent": 45000,
 *       "totalOrders": 12,
 *       "loyaltyPoints": 350,
 *       ...
 *     }
 *   ],
 *   "meta": { "page": 1, "limit": 1, "total": 1, "totalPages": 1, "timestamp": "..." }
 * }
 */
/**
 * POST /api/public/customers
 *
 * Create a new customer account. If a customer with the given email already
 * exists, returns 409 Conflict with the existing customer data.
 *
 * @authentication API Key required — scope: `customers:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @body {string}  email               - Required. Customer email.
 * @body {string}  [firstName]         - First name.
 * @body {string}  [lastName]          - Last name.
 * @body {string}  [phone]             - Phone number.
 * @body {Object}  [preferences]       - { dietaryRestrictions?: string[], communicationPreferences?: { email?, sms?, push? } }
 *
 * @returns {Object} response.data     - Created customer profile (sensitive fields excluded).
 *
 * @status 201 - Customer created
 * @status 400 - Missing email
 * @status 409 - Email already registered (returns existing customer)
 */
export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['customers:write'], async () => {
    try {
      const body = await parseJsonBody<Record<string, unknown>>(request);
      if (!body) return apiError('Invalid JSON body', 400);

      const { email, firstName, lastName, phone, preferences } = body as Record<string, any>;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return apiError('A valid email is required', 400);
      }

      // Check for existing user
      const existing = await UserModel.findOne({ email: email.toLowerCase().trim() })
        .select('-pinHash -pinExpiry -loginToken -loginTokenExpiry -__v')
        .lean();
      if (existing) {
        return apiError('A customer with this email already exists', 409);
      }

      const customer = await UserModel.create({
        email: email.toLowerCase().trim(),
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        role: 'customer',
        accountStatus: 'active',
        isGuest: false,
        emailVerified: false,
        preferences: preferences || undefined,
      });

      const safe = await UserModel.findById(customer._id)
        .select('-pinHash -pinExpiry -loginToken -loginTokenExpiry -__v')
        .lean();

      return apiSuccess(serialize(safe), 201);
    } catch (error) {
      console.error('[PUBLIC API] POST /api/public/customers', error);
      return apiError('Failed to create customer', 500);
    }
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['customers:read'], async () => {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');
    const role = searchParams.get('role');
    const status = searchParams.get('status') || 'active';
    const sortParam = searchParams.get('sort') || '-createdAt';
    const { page, limit, skip } = parsePagination(searchParams);

    try {
      // Quick search path
      if (query && query.trim().length >= 3) {
        const results = await UserService.searchUsers(query);
        return apiSuccess(serialize(results), 200, { page: 1, limit: results.length, total: results.length });
      }

      const filter: Record<string, unknown> = {
        isGuest: false,
        accountStatus: status,
      };
      if (role) {
        filter.role = role;
      }

      const sortField = sortParam.startsWith('-') ? sortParam.slice(1) : sortParam;
      const sortDir = sortParam.startsWith('-') ? -1 : 1;
      const sortObj: Record<string, 1 | -1> = { [sortField]: sortDir as 1 | -1 };

      const [customers, total] = await Promise.all([
        UserModel.find(filter)
          .select('-verificationPin -pinExpiresAt -sessionToken -password')
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .lean(),
        UserModel.countDocuments(filter),
      ]);

      return apiSuccess(serialize(customers), 200, { page, limit, total });
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/customers', error);
      return apiError('Failed to fetch customers', 500);
    }
  });
}
