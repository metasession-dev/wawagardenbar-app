import { NextRequest } from 'next/server';
import { RewardsService } from '@/services/rewards-service';
import { withApiAuth, apiSuccess, apiError, parseJsonBody, serialize } from '@/lib/api-response';

interface ValidateRewardBody {
  userId: string;
  code: string;
}

/**
 * POST /api/public/rewards/validate
 *
 * Validate a reward code for a specific user. Checks that the code exists,
 * belongs to the user, is still active, and has not expired.
 * If the reward has expired, it is automatically marked as expired in the database.
 *
 * @authentication API Key required — scope: `rewards:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @requestBody {Object} body
 * @requestBody {string} body.userId - MongoDB ObjectId of the user (**required**)
 * @requestBody {string} body.code   - Reward code to validate, e.g. `"RWD-AB12CD34"` (**required**)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success              - `true`
 * @returns {Object}  response.data                 - Validation result
 * @returns {boolean} response.data.valid           - Whether the code is valid and redeemable
 * @returns {string}  [response.data.message]       - Reason if invalid (e.g. `"This reward has expired"`)
 * @returns {Object}  [response.data.reward]        - Reward object (only present when valid)
 * @returns {string}  response.data.reward._id      - Reward ID (use for redemption)
 * @returns {string}  response.data.reward.code     - Reward code
 * @returns {string}  response.data.reward.rewardType - `"discount-percentage"` | `"discount-fixed"` | `"free-item"` | `"loyalty-points"`
 * @returns {number}  response.data.reward.rewardValue - Value
 * @returns {string}  response.data.reward.expiresAt - ISO 8601 expiry
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Validation result returned (check `data.valid`)
 * @status 400 - Missing userId or code
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `rewards:read` scope
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * POST /api/public/rewards/validate
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * { "userId": "665e1f2a3b4c5d6e7f8a9b0c", "code": "RWD-AB12CD34" }
 *
 * // Response 200 (valid)
 * {
 *   "success": true,
 *   "data": {
 *     "valid": true,
 *     "reward": { "_id": "...", "code": "RWD-AB12CD34", "rewardType": "discount-percentage", "rewardValue": 10, "expiresAt": "..." }
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 *
 * // Response 200 (invalid)
 * { "success": true, "data": { "valid": false, "message": "This reward has expired" }, "meta": { ... } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['rewards:read'], async () => {
    const body = await parseJsonBody<ValidateRewardBody>(request);

    if (!body?.userId || !body?.code) {
      return apiError('userId and code are required', 400);
    }

    try {
      const result = await RewardsService.validateRewardCode(body.userId, body.code);
      return apiSuccess(serialize(result));
    } catch (error) {
      console.error('[PUBLIC API] POST /api/public/rewards/validate', error);
      return apiError('Failed to validate reward code', 500);
    }
  });
}
