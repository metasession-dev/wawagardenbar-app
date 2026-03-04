import { NextRequest } from 'next/server';
import { SystemSettingsService } from '@/services/system-settings-service';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';

/**
 * GET /api/public/settings
 *
 * Get public application settings including pricing configuration,
 * menu categories, payment provider, and loyalty points conversion rate.
 *
 * @authentication API Key required — scope: `settings:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success                       - `true`
 * @returns {Object}  response.data                          - Application settings
 * @returns {number}  response.data.serviceFee               - Service fee percentage (e.g. `5` = 5%)
 * @returns {number}  response.data.taxRate                  - Tax rate percentage (e.g. `7.5` = 7.5%)
 * @returns {number}  response.data.pointsConversionRate     - Points-to-₦ rate (e.g. `100` means 100 points = ₦1)
 * @returns {Object}  response.data.menuCategories           - Dynamic menu category configuration
 * @returns {Object}  response.data.menuCategories.drinks    - Drink category config with labels, slugs, enabled status
 * @returns {Object}  response.data.menuCategories.food      - Food category config
 * @returns {string}  response.data.paymentProvider          - Active payment provider: `"monnify"` | `"paystack"`
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Success with settings
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `settings:read` scope
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/settings
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "serviceFee": 5,
 *     "taxRate": 7.5,
 *     "pointsConversionRate": 100,
 *     "menuCategories": { "drinks": { ... }, "food": { ... } },
 *     "paymentProvider": "monnify"
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['settings:read'], async () => {
    try {
      const [serviceFee, taxRate, pointsRate, menuCategories, paymentSettings] =
        await Promise.all([
          SystemSettingsService.getSetting('service-fee'),
          SystemSettingsService.getSetting('tax-rate'),
          SystemSettingsService.getSetting('points-conversion-rate'),
          SystemSettingsService.getMenuCategories(),
          SystemSettingsService.getPaymentSettings(),
        ]);

      return apiSuccess(
        serialize({
          serviceFee: serviceFee?.value ?? 0,
          taxRate: taxRate?.value ?? 0,
          pointsConversionRate: pointsRate?.value ?? 100,
          menuCategories,
          paymentProvider: paymentSettings.activeProvider,
        })
      );
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/settings', error);
      return apiError('Failed to fetch settings', 500);
    }
  });
}
