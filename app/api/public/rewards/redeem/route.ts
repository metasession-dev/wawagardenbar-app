import { NextRequest } from 'next/server';
import { RewardsService } from '@/services/rewards-service';
import { withApiAuth, apiSuccess, apiError, parseJsonBody, serialize } from '@/lib/api-response';

interface RedeemRewardBody {
  rewardId: string;
  orderId: string;
}

/**
 * POST /api/public/rewards/redeem
 *
 * Redeem an active reward against an order. Marks the reward as `"redeemed"`,
 * records the redemption timestamp and linked order ID.
 * Only active, non-expired rewards can be redeemed.
 *
 * @authentication API Key required — scope: `rewards:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @requestBody {Object} body
 * @requestBody {string} body.rewardId - MongoDB ObjectId of the reward to redeem (**required**)
 * @requestBody {string} body.orderId  - MongoDB ObjectId of the order to apply the reward to (**required**)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success         - `true`
 * @returns {Object}  response.data            - Redemption result
 * @returns {boolean} response.data.success    - Whether the redemption succeeded
 * @returns {string}  [response.data.message]  - Error message if redemption failed
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Reward redeemed successfully
 * @status 400 - Missing rewardId or orderId
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `rewards:read` scope
 * @status 422 - Reward not active, already redeemed, or expired
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * POST /api/public/rewards/redeem
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * { "rewardId": "665f1a2b3c4d5e6f7a8b9c0d", "orderId": "665d1e2f3a4b5c6d7e8f9a0b" }
 *
 * // Response 200
 * { "success": true, "data": { "success": true }, "meta": { "timestamp": "..." } }
 *
 * // Response 422 (expired)
 * { "success": false, "error": "Reward has expired" }
 */
export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['rewards:read'], async () => {
    const body = await parseJsonBody<RedeemRewardBody>(request);

    if (!body?.rewardId || !body?.orderId) {
      return apiError('rewardId and orderId are required', 400);
    }

    try {
      const result = await RewardsService.redeemReward(body.rewardId, body.orderId);

      if (!result.success) {
        return apiError(result.message || 'Failed to redeem reward', 422);
      }

      return apiSuccess(serialize(result));
    } catch (error) {
      console.error('[PUBLIC API] POST /api/public/rewards/redeem', error);
      return apiError('Failed to redeem reward', 500);
    }
  });
}
