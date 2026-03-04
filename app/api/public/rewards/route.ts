import { NextRequest } from 'next/server';
import { RewardsService } from '@/services/rewards-service';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';

/**
 * GET /api/public/rewards
 *
 * Get rewards data. Behaviour depends on whether `userId` is provided:
 * - **With `userId`:** Returns the user's active rewards and personal reward statistics.
 * - **Without `userId`:** Returns global reward statistics (total rules, issued, redeemed, redemption rate).
 *
 * @authentication API Key required — scope: `rewards:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [userId] - MongoDB ObjectId of a user. When provided, returns user-specific rewards + stats.
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                          - `true`
 *
 * **With `userId`:**
 * @returns {Object}   response.data.rewards                    - Array of active rewards
 * @returns {string}   response.data.rewards[]._id              - Reward ID
 * @returns {string}   response.data.rewards[].code             - Reward code (e.g. `"RWD-AB12CD34"`)
 * @returns {string}   response.data.rewards[].rewardType       - `"discount-percentage"` | `"discount-fixed"` | `"free-item"` | `"loyalty-points"`
 * @returns {number}   response.data.rewards[].rewardValue      - Value (percentage, ₦ amount, or points)
 * @returns {string}   response.data.rewards[].status           - `"active"`
 * @returns {string}   response.data.rewards[].expiresAt        - ISO 8601 expiry timestamp
 * @returns {Object}   response.data.stats                     - User reward statistics
 * @returns {number}   response.data.stats.totalEarned          - Total rewards earned
 * @returns {number}   response.data.stats.totalRedeemed        - Total redeemed
 * @returns {number}   response.data.stats.activeRewards        - Currently active count
 * @returns {number}   response.data.stats.totalSavings         - Total savings in ₦
 * @returns {number}   response.data.stats.loyaltyPoints        - Current points balance
 *
 * **Without `userId` (global stats):**
 * @returns {number}   response.data.totalRulesActive           - Active reward rules
 * @returns {number}   response.data.totalRewardsIssued         - All-time issued count
 * @returns {number}   response.data.totalRewardsRedeemed       - Redeemed count
 * @returns {number}   response.data.redemptionRate             - Percentage
 * @returns {number}   response.data.totalValueRedeemed         - Total redeemed value in ₦
 *
 * @returns {Object}   response.meta
 * @returns {string}   response.meta.timestamp
 *
 * @status 200 - Success
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `rewards:read` scope
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request — user-specific rewards
 * GET /api/public/rewards?userId=665e1f2a3b4c5d6e7f8a9b0c
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "rewards": [
 *       { "_id": "...", "code": "RWD-AB12CD34", "rewardType": "discount-percentage", "rewardValue": 10, "expiresAt": "..." }
 *     ],
 *     "stats": { "totalEarned": 5, "totalRedeemed": 2, "activeRewards": 1, "totalSavings": 1500, "loyaltyPoints": 350 }
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 *
 * @example
 * // Request — global stats
 * GET /api/public/rewards
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": { "totalRulesActive": 4, "totalRewardsIssued": 120, "totalRewardsRedeemed": 45, "redemptionRate": 37.5, "totalValueRedeemed": 85000 },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['rewards:read'], async () => {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');

    try {
      if (userId) {
        const [activeRewards, stats] = await Promise.all([
          RewardsService.getUserActiveRewards(userId),
          RewardsService.getUserRewardStats(userId),
        ]);

        return apiSuccess(serialize({ rewards: activeRewards, stats }));
      }

      // Global reward statistics
      const stats = await RewardsService.getRewardStatistics();
      return apiSuccess(serialize(stats));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/rewards', error);
      return apiError('Failed to fetch rewards', 500);
    }
  });
}
