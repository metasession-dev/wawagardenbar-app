import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { SystemSettingsService } from '@/services/system-settings-service';
import SystemSettingsModel from '@/models/system-settings-model';
import { AuditLogService } from '@/services/audit-log-service';
import { withApiAuth, apiSuccess, apiError, serialize, parseJsonBody } from '@/lib/api-response';

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

/**
 * PATCH /api/public/settings
 *
 * Update application settings (service fee, tax rate, points conversion rate).
 *
 * @authentication API Key required — scope: `settings:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @body {number} [serviceFee]           - Service fee percentage (e.g. `5` = 5%)
 * @body {number} [taxRate]              - Tax rate percentage (e.g. `7.5` = 7.5%)
 * @body {number} [pointsConversionRate] - Points-to-currency rate (e.g. `100` means 100 points = 1 unit)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success - `true`
 * @returns {Object}  response.data    - Object with updated field names and their new values
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Settings updated successfully
 * @status 400 - Invalid or missing request body
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `settings:write` scope
 * @status 422 - Validation error (e.g. invalid field values)
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 */
export async function PATCH(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['settings:write'], async () => {
    try {
      const body = await parseJsonBody<{
        serviceFee?: number;
        taxRate?: number;
        pointsConversionRate?: number;
      }>(request);

      if (!body) {
        return apiError('Invalid JSON body', 400);
      }

      const { serviceFee, taxRate, pointsConversionRate } = body;

      if (serviceFee === undefined && taxRate === undefined && pointsConversionRate === undefined) {
        return apiError('At least one field must be provided: serviceFee, taxRate, pointsConversionRate', 400);
      }

      const API_USER_ID = '000000000000000000000000';
      const updated: Record<string, unknown> = {};

      // Update service fee
      if (serviceFee !== undefined) {
        if (typeof serviceFee !== 'number' || serviceFee < 0 || serviceFee > 100) {
          return apiError('serviceFee must be a number between 0 and 100', 422);
        }
        await SystemSettingsModel.findOneAndUpdate(
          { key: 'service-fee' },
          {
            $set: {
              value: serviceFee,
              updatedBy: new Types.ObjectId(API_USER_ID),
              updatedAt: new Date(),
            },
            $push: {
              changeHistory: {
                value: serviceFee,
                changedBy: new Types.ObjectId(API_USER_ID),
                changedAt: new Date(),
                reason: 'Updated via public API',
              },
            },
          },
          { upsert: true, new: true }
        );
        updated.serviceFee = serviceFee;
      }

      // Update tax rate
      if (taxRate !== undefined) {
        if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 100) {
          return apiError('taxRate must be a number between 0 and 100', 422);
        }
        await SystemSettingsModel.findOneAndUpdate(
          { key: 'tax-rate' },
          {
            $set: {
              value: taxRate,
              updatedBy: new Types.ObjectId(API_USER_ID),
              updatedAt: new Date(),
            },
            $push: {
              changeHistory: {
                value: taxRate,
                changedBy: new Types.ObjectId(API_USER_ID),
                changedAt: new Date(),
                reason: 'Updated via public API',
              },
            },
          },
          { upsert: true, new: true }
        );
        updated.taxRate = taxRate;
      }

      // Update points conversion rate
      if (pointsConversionRate !== undefined) {
        if (typeof pointsConversionRate !== 'number') {
          return apiError('pointsConversionRate must be a number', 422);
        }
        try {
          const result = await SystemSettingsService.updatePointsConversionRate(
            pointsConversionRate,
            API_USER_ID,
            'Updated via public API'
          );
          updated.pointsConversionRate = result.rate;
        } catch (err: any) {
          return apiError(err.message, 422);
        }
      }

      // Audit log
      await AuditLogService.createLog({
        userId: API_USER_ID,
        userEmail: 'api',
        userRole: 'api',
        action: 'settings.update',
        resource: 'settings',
        resourceId: 'system',
        details: { updated },
      });

      return apiSuccess(serialize(updated));
    } catch (error) {
      console.error('[PUBLIC API] PATCH /api/public/settings', error);
      return apiError('Failed to update settings', 500);
    }
  });
}
