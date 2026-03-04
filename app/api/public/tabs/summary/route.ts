import { NextRequest } from 'next/server';
import { eachDayOfInterval, format, startOfDay, endOfDay } from 'date-fns';
import TabModel from '@/models/tab-model';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';
import { parsePeriodParams } from '@/lib/date-periods';

/**
 * GET /api/public/tabs/summary
 *
 * Period-based tab summary optimized for AI agent consumption.
 * Returns tab counts, revenue, average tab value, status distribution,
 * table utilisation, and daily time-series data.
 *
 * @authentication API Key required — scope: `tabs:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [period=today] - Period preset
 * @queryParam {string} [startDate]    - ISO 8601 start date (required when period is "custom")
 * @queryParam {string} [endDate]      - ISO 8601 end date (required when period is "custom")
 *
 * @returns {Object} response.data.period        - { label, startDate, endDate }
 * @returns {Object} response.data.totals        - { totalTabs, totalRevenue, averageTabValue, openTabs, closedTabs, paidTabs }
 * @returns {Object} response.data.byStatus      - { open, settling, closed }
 * @returns {Object} response.data.byPayment     - { pending, paid, failed }
 * @returns {Object[]} response.data.tableUsage  - [{ tableNumber, tabCount, totalRevenue }] sorted by tab count desc
 * @returns {Object[]} response.data.dailySeries - [{ date, tabsOpened, tabsClosed, revenue }]
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['tabs:read'], async () => {
    try {
      const { searchParams } = request.nextUrl;
      const dateRange = parsePeriodParams(searchParams);
      const { startDate, endDate, label } = dateRange;

      const allTabs = await TabModel.find({
        openedAt: { $gte: startDate, $lte: endDate },
      }).lean();

      // ── Totals ──
      const paidTabs = allTabs.filter((t) => t.paymentStatus === 'paid');
      const totalRevenue = paidTabs.reduce((s, t) => s + t.total, 0);
      const openTabs = allTabs.filter((t) => t.status === 'open').length;
      const closedTabs = allTabs.filter((t) => t.status === 'closed').length;

      // ── By status ──
      const byStatus: Record<string, number> = {};
      for (const tab of allTabs) {
        byStatus[tab.status] = (byStatus[tab.status] || 0) + 1;
      }

      // ── By payment status ──
      const byPayment: Record<string, number> = {};
      for (const tab of allTabs) {
        byPayment[tab.paymentStatus] = (byPayment[tab.paymentStatus] || 0) + 1;
      }

      // ── Table usage ──
      const tableMap = new Map<string, { tabCount: number; totalRevenue: number }>();
      for (const tab of allTabs) {
        const tn = tab.tableNumber;
        const existing = tableMap.get(tn) || { tabCount: 0, totalRevenue: 0 };
        existing.tabCount += 1;
        if (tab.paymentStatus === 'paid') {
          existing.totalRevenue += tab.total;
        }
        tableMap.set(tn, existing);
      }
      const tableUsage = Array.from(tableMap.entries())
        .map(([tableNumber, data]) => ({ tableNumber, ...data }))
        .sort((a, b) => b.tabCount - a.tabCount);

      // ── Daily series ──
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const dailySeries = days.map((day) => {
        const ds = startOfDay(day);
        const de = endOfDay(day);
        const opened = allTabs.filter((t) => {
          const d = new Date(t.openedAt);
          return d >= ds && d <= de;
        });
        const closed = allTabs.filter((t) => {
          if (!t.closedAt) return false;
          const d = new Date(t.closedAt);
          return d >= ds && d <= de;
        });
        const dayRevenue = opened
          .filter((t) => t.paymentStatus === 'paid')
          .reduce((s, t) => s + t.total, 0);
        return {
          date: format(day, 'yyyy-MM-dd'),
          tabsOpened: opened.length,
          tabsClosed: closed.length,
          revenue: dayRevenue,
        };
      });

      return apiSuccess(serialize({
        period: { label, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        totals: {
          totalTabs: allTabs.length,
          totalRevenue,
          averageTabValue: paidTabs.length > 0 ? Math.round(totalRevenue / paidTabs.length) : 0,
          openTabs,
          closedTabs,
          paidTabs: paidTabs.length,
        },
        byStatus,
        byPayment,
        tableUsage,
        dailySeries,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to generate tab summary';
      console.error('[PUBLIC API] GET /api/public/tabs/summary', error);
      return apiError(msg, 500);
    }
  });
}
