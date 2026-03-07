import { NextRequest } from 'next/server';
import {
  withApiAuth,
  apiSuccess,
  apiError,
  serialize,
  parseDateParam,
} from '@/lib/api-response';
import { AuditLogService } from '@/services/audit-log-service';

/**
 * GET /api/public/audit-logs/summary
 *
 * Get aggregated audit log statistics.
 *
 * @authentication API Key required — scope: `audit:read`
 *
 * @queryParam {string} [startDate] - ISO 8601 inclusive start date
 * @queryParam {string} [endDate]   - ISO 8601 inclusive end date
 *
 * @returns {Object}  response
 * @returns {boolean} response.success
 * @returns {Object}  response.data
 * @returns {number}  response.data.totalLogs        - Total log count
 * @returns {Object}  response.data.logsByAction     - Counts keyed by action type
 * @returns {Object}  response.data.logsByResource   - Counts keyed by resource type
 * @returns {Object[]} response.data.logsByUser      - Top users by log count
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['audit:read'], async () => {
    const { searchParams } = request.nextUrl;
    const startDate = parseDateParam(searchParams.get('startDate'));
    const endDate = parseDateParam(searchParams.get('endDate'));

    try {
      const statistics = await AuditLogService.getStatistics(
        startDate || undefined,
        endDate || undefined,
      );

      return apiSuccess(serialize(statistics));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/audit-logs/summary', error);
      return apiError('Failed to fetch audit log statistics', 500);
    }
  });
}
