/**
 * @requirement REQ-006 - Tab Lookup by tabNumber, Item Name Lookup, SOP Enhancement
 */
import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import TabModel from '@/models/tab-model';
import { TabService } from '@/services/tab-service';
import {
  withApiAuth,
  apiSuccess,
  apiError,
  parsePagination,
  parseJsonBody,
  serialize,
} from '@/lib/api-response';

/**
 * GET /api/public/tabs
 *
 * List tabs with filtering, sorting, and pagination.
 *
 * @authentication API Key required — scope: `tabs:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string}  [status]       - "open" | "settling" | "closed"
 * @queryParam {string}  [tableNumber]  - Filter by table number
 * @queryParam {string}  [tabNumber]   - Filter by tab number (e.g. "TAB-5-123456")
 * @queryParam {string}  [customerId]   - Filter by user ObjectId
 * @queryParam {string}  [paymentStatus]- "pending" | "paid" | "failed"
 * @queryParam {string}  [startDate]    - ISO 8601 start date (openedAt >=)
 * @queryParam {string}  [endDate]      - ISO 8601 end date (openedAt <=)
 * @queryParam {string}  [sort]         - "openedAt" | "-openedAt" | "total" | "-total" (default: "-openedAt")
 * @queryParam {number}  [page=1]
 * @queryParam {number}  [limit=25]     - max 100
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['tabs:read'], async () => {
    try {
      const { searchParams } = request.nextUrl;
      const { page, limit, skip } = parsePagination(searchParams);

      // Build filter
      const filter: Record<string, unknown> = {};
      const status = searchParams.get('status');
      if (status && ['open', 'settling', 'closed'].includes(status)) {
        filter.status = status;
      }
      const tableNumber = searchParams.get('tableNumber');
      if (tableNumber) filter.tableNumber = tableNumber;
      const tabNumber = searchParams.get('tabNumber');
      if (tabNumber) filter.tabNumber = tabNumber;
      const customerId = searchParams.get('customerId');
      if (customerId && Types.ObjectId.isValid(customerId)) {
        filter.userId = new Types.ObjectId(customerId);
      }
      const paymentStatus = searchParams.get('paymentStatus');
      if (paymentStatus && ['pending', 'paid', 'failed'].includes(paymentStatus)) {
        filter.paymentStatus = paymentStatus;
      }
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
        filter.openedAt = dateFilter;
      }

      // Sorting
      const sortParam = searchParams.get('sort') || '-openedAt';
      const sortDir = sortParam.startsWith('-') ? -1 : 1;
      const sortField = sortParam.replace(/^-/, '');
      const allowedSortFields = ['openedAt', 'total', 'createdAt'];
      const sortKey = allowedSortFields.includes(sortField) ? sortField : 'openedAt';

      const [tabs, total] = await Promise.all([
        TabModel.find(filter)
          .sort({ [sortKey]: sortDir })
          .skip(skip)
          .limit(limit)
          .populate('orders')
          .lean(),
        TabModel.countDocuments(filter),
      ]);

      return apiSuccess(serialize(tabs), 200, { page, limit, total });
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/tabs', error);
      return apiError('Failed to list tabs', 500);
    }
  });
}

/**
 * POST /api/public/tabs
 *
 * Create a new tab for a table.
 *
 * @authentication API Key required — scope: `tabs:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @body {string}  tableNumber    - Required. Table identifier.
 * @body {string}  [customerName] - Customer display name.
 * @body {string}  [customerEmail]
 * @body {string}  [customerPhone]
 * @body {string}  [userId]       - Link to registered user ObjectId.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['tabs:write'], async () => {
    try {
      const body = await parseJsonBody<Record<string, unknown>>(request);
      if (!body) return apiError('Invalid JSON body', 400);

      const { tableNumber, customerName, customerEmail, customerPhone, userId } = body as Record<string, string>;
      if (!tableNumber || typeof tableNumber !== 'string') {
        return apiError('tableNumber is required', 400);
      }

      // Check for existing open tab on this table
      const existingTab = await TabService.getOpenTabForTable(tableNumber.trim());
      if (existingTab) {
        return apiError('There is already an open tab for this table', 409);
      }

      const tab = await TabService.createTab({
        tableNumber: tableNumber.trim(),
        userId: userId && Types.ObjectId.isValid(userId) ? userId : undefined,
        customerName,
        customerEmail,
        customerPhone,
      });

      return apiSuccess(serialize(tab), 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create tab';
      console.error('[PUBLIC API] POST /api/public/tabs', error);
      return apiError(msg, 500);
    }
  });
}
