import { NextRequest } from 'next/server';
import {
  withApiAuth,
  apiSuccess,
  apiError,
  serialize,
  parsePagination,
  parseDateParam,
} from '@/lib/api-response';
import { AuditLogService, AuditLogFilters } from '@/services/audit-log-service';
import { AuditAction } from '@/interfaces/audit-log.interface';

/**
 * GET /api/public/audit-logs
 *
 * List and search audit logs with filtering and pagination.
 *
 * @authentication API Key required — scope: `audit:read`
 *
 * @queryParam {string} [userId]    - Filter by user MongoDB ObjectId
 * @queryParam {string} [action]    - Filter by action type
 * @queryParam {string} [resource]  - Filter by resource type
 * @queryParam {string} [startDate] - ISO 8601 inclusive start date
 * @queryParam {string} [endDate]   - ISO 8601 inclusive end date
 * @queryParam {number} [page=1]    - Page number (1-indexed)
 * @queryParam {number} [limit=50]  - Items per page (max 100)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success
 * @returns {Object[]} response.data       - Array of audit log entries
 * @returns {Object}   response.meta       - Pagination metadata
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['audit:read'], async () => {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const startDate = parseDateParam(searchParams.get('startDate'));
    const endDate = parseDateParam(searchParams.get('endDate'));
    const { page, limit } = parsePagination(searchParams);

    try {
      const filters: AuditLogFilters = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action as AuditAction;
      if (resource) filters.resource = resource;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const result = await AuditLogService.getLogs(filters, page, limit);

      return apiSuccess(serialize(result.logs), 200, {
        page: result.page,
        limit,
        total: result.total,
      });
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/audit-logs', error);
      return apiError('Failed to fetch audit logs', 500);
    }
  });
}
