import { NextRequest } from 'next/server';
import { eachDayOfInterval, format, startOfDay, endOfDay, getHours } from 'date-fns';
import OrderModel from '@/models/order-model';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';
import { parsePeriodParams } from '@/lib/date-periods';

/**
 * GET /api/public/orders/summary
 *
 * Period-based order summary optimized for AI agent consumption.
 * Provides revenue, average order value, order type distribution,
 * payment method breakdown, peak hours, and daily time-series data.
 *
 * @authentication API Key required — scope: `orders:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [period=today] - Period preset (see date-periods.ts for full list)
 * @queryParam {string} [startDate]    - ISO 8601 start date (required when period is "custom")
 * @queryParam {string} [endDate]      - ISO 8601 end date (required when period is "custom")
 * @queryParam {string} [orderType]    - Filter by order type: "dine-in" | "pickup" | "delivery" | "pay-now"
 *
 * @returns {Object} response.data
 * @returns {Object} response.data.period           - { label, startDate, endDate }
 * @returns {Object} response.data.totals           - { totalOrders, totalRevenue, averageOrderValue, completedOrders, cancelledOrders, cancellationRate }
 * @returns {Object} response.data.byType           - { "dine-in": { count, revenue }, "pickup": { count, revenue }, ... }
 * @returns {Object} response.data.byStatus         - { pending: count, confirmed: count, ... }
 * @returns {Object} response.data.byPaymentMethod  - { cash: { count, revenue }, card: { count, revenue }, ... }
 * @returns {Object} response.data.peakHours        - [{ hour: 0-23, orderCount, revenue }] sorted by order count desc
 * @returns {Object[]} response.data.dailySeries    - [{ date, orderCount, revenue, avgValue }]
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['orders:read'], async () => {
    try {
      const { searchParams } = request.nextUrl;
      const dateRange = parsePeriodParams(searchParams);
      const { startDate, endDate, label } = dateRange;
      const orderTypeFilter = searchParams.get('orderType');

      // Build query
      const query: Record<string, unknown> = {
        createdAt: { $gte: startDate, $lte: endDate },
      };
      if (orderTypeFilter) {
        query.orderType = orderTypeFilter;
      }

      const allOrders = await OrderModel.find(query).lean();
      const paidOrders = allOrders.filter((o) => o.paymentStatus === 'paid');

      // ── Totals ──
      const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
      const completedOrders = allOrders.filter(
        (o) => o.status === 'completed' || o.status === 'delivered'
      ).length;
      const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled').length;

      // ── By type ──
      const byType: Record<string, { count: number; revenue: number }> = {};
      for (const order of allOrders) {
        const t = order.orderType;
        if (!byType[t]) byType[t] = { count: 0, revenue: 0 };
        byType[t].count += 1;
        if (order.paymentStatus === 'paid') {
          byType[t].revenue += order.total;
        }
      }

      // ── By status ──
      const byStatus: Record<string, number> = {};
      for (const order of allOrders) {
        byStatus[order.status] = (byStatus[order.status] || 0) + 1;
      }

      // ── By payment method ──
      const byPaymentMethod: Record<string, { count: number; revenue: number }> = {};
      for (const order of paidOrders) {
        const pm = order.paymentMethod || 'unknown';
        if (!byPaymentMethod[pm]) byPaymentMethod[pm] = { count: 0, revenue: 0 };
        byPaymentMethod[pm].count += 1;
        byPaymentMethod[pm].revenue += order.total;
      }

      // ── Peak hours ──
      const hourMap = new Map<number, { orderCount: number; revenue: number }>();
      for (const order of allOrders) {
        const h = getHours(new Date(order.createdAt));
        const existing = hourMap.get(h) || { orderCount: 0, revenue: 0 };
        existing.orderCount += 1;
        if (order.paymentStatus === 'paid') {
          existing.revenue += order.total;
        }
        hourMap.set(h, existing);
      }
      const peakHours = Array.from(hourMap.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => b.orderCount - a.orderCount);

      // ── Daily series ──
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const dailySeries = days.map((day) => {
        const ds = startOfDay(day);
        const de = endOfDay(day);
        const dayOrders = paidOrders.filter((o) => {
          const d = new Date(o.paidAt || o.createdAt);
          return d >= ds && d <= de;
        });
        const dayRevenue = dayOrders.reduce((s, o) => s + o.total, 0);
        return {
          date: format(day, 'yyyy-MM-dd'),
          orderCount: dayOrders.length,
          revenue: dayRevenue,
          avgValue: dayOrders.length > 0 ? Math.round(dayRevenue / dayOrders.length) : 0,
        };
      });

      return apiSuccess(serialize({
        period: { label, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        totals: {
          totalOrders: allOrders.length,
          totalRevenue,
          averageOrderValue: paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0,
          completedOrders,
          cancelledOrders,
          cancellationRate: allOrders.length > 0
            ? Math.round((cancelledOrders / allOrders.length) * 10000) / 100
            : 0,
        },
        byType,
        byStatus,
        byPaymentMethod,
        peakHours,
        dailySeries,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to generate order summary';
      console.error('[PUBLIC API] GET /api/public/orders/summary', error);
      return apiError(msg, 500);
    }
  });
}
