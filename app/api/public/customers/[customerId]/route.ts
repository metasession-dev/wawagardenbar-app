import { NextRequest } from 'next/server';
import { UserService } from '@/services/user-service';
import { withApiAuth, apiSuccess, apiError, parseJsonBody, serialize } from '@/lib/api-response';

/**
 * GET /api/public/customers/:customerId
 *
 * Get a single customer profile by ID. Sensitive authentication fields
 * (password, verification PIN, session token) are excluded from the response.
 *
 * @authentication API Key required — scope: `customers:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} customerId - MongoDB ObjectId of the user
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                  - `true`
 * @returns {Object}   response.data                     - Customer profile
 * @returns {string}   response.data._id                 - User ID
 * @returns {string}   [response.data.firstName]         - First name
 * @returns {string}   [response.data.lastName]          - Last name
 * @returns {string}   response.data.email               - Email address
 * @returns {boolean}  response.data.emailVerified       - Email verified flag
 * @returns {string}   [response.data.phone]             - Phone number
 * @returns {string}   response.data.role                - `"customer"` | `"admin"` | `"super-admin"`
 * @returns {string}   response.data.accountStatus       - `"active"` | `"suspended"` | `"deleted"`
 * @returns {number}   response.data.totalSpent          - Lifetime spend in ₦
 * @returns {number}   response.data.totalOrders         - Lifetime order count
 * @returns {number}   response.data.loyaltyPoints       - Current points balance
 * @returns {number}   response.data.rewardsEarned       - Total rewards earned
 * @returns {Object[]} response.data.addresses           - Saved delivery addresses
 * @returns {Object}   [response.data.preferences]       - Dietary and communication preferences
 * @returns {string}   response.data.createdAt           - Account creation ISO timestamp
 * @returns {Object}   response.meta
 * @returns {string}   response.meta.timestamp
 *
 * @status 200 - Success
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `customers:read` scope
 * @status 404 - Customer not found
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/customers/665e1f2a3b4c5d6e7f8a9b0c
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "665e...",
 *     "firstName": "Ada",
 *     "lastName": "Obi",
 *     "email": "ada@example.com",
 *     "role": "customer",
 *     "totalSpent": 45000,
 *     "totalOrders": 12,
 *     "loyaltyPoints": 350,
 *     "addresses": [...],
 *     ...
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['customers:read'], async () => {
    const { customerId } = await params;
    try {
      const user = await UserService.getUserById(customerId);
      if (!user) {
        return apiError('Customer not found', 404);
      }
      return apiSuccess(serialize(user));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/customers/:id', error);
      return apiError('Failed to fetch customer', 500);
    }
  });
}

interface UpdateCustomerBody {
  firstName?: string;
  lastName?: string;
  phone?: string;
  preferences?: {
    dietaryRestrictions?: string[];
    communicationPreferences?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };
}

/**
 * PATCH /api/public/customers/:customerId
 *
 * Update a customer's profile fields. Only safe, non-sensitive fields are accepted.
 * Fields like email, role, password, and account status cannot be changed through this endpoint.
 *
 * @authentication API Key required — scope: `customers:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} customerId - MongoDB ObjectId of the user
 *
 * @requestBody {Object} body
 * @requestBody {string} [body.firstName]                              - Updated first name
 * @requestBody {string} [body.lastName]                               - Updated last name
 * @requestBody {string} [body.phone]                                  - Updated phone number
 * @requestBody {Object} [body.preferences]                            - Updated preferences
 * @requestBody {string[]} [body.preferences.dietaryRestrictions]      - e.g. `["vegetarian", "gluten-free"]`
 * @requestBody {Object}   [body.preferences.communicationPreferences] - `{ email?: boolean, sms?: boolean, push?: boolean }`
 *
 * @returns {Object}  response
 * @returns {boolean} response.success - `true`
 * @returns {Object}  response.data    - Updated customer profile (same shape as GET response)
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Profile updated successfully
 * @status 400 - Invalid body or no valid fields to update
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `customers:write` scope
 * @status 404 - Customer not found
 * @status 422 - Business logic error
 * @status 429 - Rate limit exceeded
 *
 * @example
 * // Request
 * PATCH /api/public/customers/665e1f2a3b4c5d6e7f8a9b0c
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * {
 *   "firstName": "Adaeze",
 *   "phone": "+2348012345678",
 *   "preferences": {
 *     "dietaryRestrictions": ["vegetarian"],
 *     "communicationPreferences": { "email": true, "sms": false }
 *   }
 * }
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": { "_id": "665e...", "firstName": "Adaeze", "phone": "+2348012345678", ... },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['customers:write'], async () => {
    const { customerId } = await params;
    const body = await parseJsonBody<UpdateCustomerBody>(request);

    if (!body) {
      return apiError('Invalid JSON body', 400);
    }

    // Only allow safe, non-sensitive fields to be updated
    const allowedUpdates: Record<string, unknown> = {};
    if (body.firstName !== undefined) allowedUpdates.firstName = body.firstName;
    if (body.lastName !== undefined) allowedUpdates.lastName = body.lastName;
    if (body.phone !== undefined) allowedUpdates.phone = body.phone;
    if (body.preferences !== undefined) allowedUpdates.preferences = body.preferences;

    if (Object.keys(allowedUpdates).length === 0) {
      return apiError('No valid fields to update', 400);
    }

    try {
      const updated = await UserService.updateUserProfile(customerId, allowedUpdates as any);
      if (!updated) {
        return apiError('Customer not found', 404);
      }
      return apiSuccess(serialize(updated));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update customer';
      console.error('[PUBLIC API] PATCH /api/public/customers/:id', error);
      return apiError(msg, 422);
    }
  });
}
