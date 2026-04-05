import { NextRequest } from 'next/server';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import OrderModel from '@/models/order-model';
import MenuItemModel from '@/models/menu-item-model';
import { ExpenseModel } from '@/models/expense-model';
import {
  withApiAuth,
  apiSuccess,
  apiError,
  serialize,
} from '@/lib/api-response';
import { parsePeriodParams } from '@/lib/date-periods';

interface SalesDaySeries {
  date: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

/**
 * GET /api/public/sales/summary
 *
 * Comprehensive sales summary optimized for AI agent consumption.
 * Supports period presets (today, this-week, this-month, this-quarter,
 * this-year, last-7-days, last-30-days, last-90-days, custom) and
 * returns revenue, COGS, profit, top items, payment method breakdown,
 * and daily time-series data.
 *
 * @authentication API Key required — scope: `analytics:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [period=today] - Period preset: "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-month" | "this-quarter" | "last-quarter" | "this-year" | "last-year" | "last-7-days" | "last-30-days" | "last-90-days" | "custom"
 * @queryParam {string} [startDate] - ISO 8601 start date (required when period is "custom")
 * @queryParam {string} [endDate]   - ISO 8601 end date (required when period is "custom")
 *
 * @returns {Object}  response
 * @returns {boolean} response.success
 * @returns {Object}  response.data
 * @returns {Object}  response.data.period              - Resolved period info { label, startDate, endDate }
 * @returns {Object}  response.data.revenue             - { total, food, drinks, serviceFees, tax, tips, discounts }
 * @returns {Object}  response.data.costs               - { totalCOGS, foodCOGS, drinksCOGS }
 * @returns {Object}  response.data.profit              - { grossProfit, grossMargin, operatingExpenses, netProfit, netMargin }
 * @returns {Object}  response.data.orders              - { total, completed, cancelled, averageValue, byType, byStatus }
 * @returns {Object}  response.data.payments            - { byMethod, byStatus }
 * @returns {Object[]} response.data.topItems           - Top 10 items by revenue [{ name, category, quantity, revenue }]
 * @returns {Object[]} response.data.dailySeries        - Daily time-series [{ date, revenue, orderCount, averageOrderValue }]
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['analytics:read'], async () => {
    try {
      const { searchParams } = request.nextUrl;
      const dateRange = parsePeriodParams(searchParams);
      const { startDate, endDate, label } = dateRange;

      // Fetch paid orders in range
      const paidOrders = await OrderModel.find({
        paymentStatus: 'paid',
        paidAt: { $gte: startDate, $lte: endDate },
      }).lean();

      // Fetch ALL orders in range (for status/type breakdown)
      const allOrders = await OrderModel.find({
        createdAt: { $gte: startDate, $lte: endDate },
      }).lean();

      // ── Revenue breakdown ──
      let foodRevenue = 0;
      let drinksRevenue = 0;
      let totalServiceFees = 0;
      let totalTax = 0;
      let totalTips = 0;
      let totalDiscounts = 0;

      const itemAgg = new Map<
        string,
        {
          name: string;
          category: string;
          mainCategory: string;
          quantity: number;
          revenue: number;
          costPerUnit: number;
        }
      >();

      for (const order of paidOrders) {
        totalServiceFees += order.serviceFee || 0;
        totalTax += order.tax || 0;
        totalTips += order.tipAmount || 0;
        totalDiscounts += order.discount || 0;

        for (const item of order.items) {
          const itemId = item.menuItemId.toString();
          if (itemAgg.has(itemId)) {
            const existing = itemAgg.get(itemId)!;
            existing.quantity += item.quantity;
            existing.revenue += item.subtotal;
          } else {
            const menuItem = await MenuItemModel.findById(item.menuItemId)
              .select('mainCategory category')
              .lean();
            itemAgg.set(itemId, {
              name: item.name,
              category: menuItem?.category || 'unknown',
              mainCategory: menuItem?.mainCategory || 'food',
              quantity: item.quantity,
              revenue: item.subtotal,
              costPerUnit: item.costPerUnit || 0,
            });
          }
        }
      }

      let foodCOGS = 0;
      let drinksCOGS = 0;

      for (const [, item] of itemAgg) {
        const costTotal = item.costPerUnit * item.quantity;
        if (item.mainCategory === 'drinks') {
          drinksRevenue += item.revenue;
          drinksCOGS += costTotal;
        } else {
          foodRevenue += item.revenue;
          foodCOGS += costTotal;
        }
      }

      const totalRevenue = foodRevenue + drinksRevenue;
      const totalCOGS = foodCOGS + drinksCOGS;
      const grossProfit = totalRevenue - totalCOGS;

      // ── Operating expenses ──
      const expenses = await ExpenseModel.find({
        date: { $gte: startDate, $lte: endDate },
        expenseType: 'operating-expense',
      }).lean();

      const operatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - operatingExpenses;

      // ── Order breakdowns ──
      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byPaymentMethod: Record<string, number> = {};
      const byPaymentStatus: Record<string, number> = {};

      for (const order of allOrders) {
        byType[order.orderType] = (byType[order.orderType] || 0) + 1;
        byStatus[order.status] = (byStatus[order.status] || 0) + 1;
        const pm = order.paymentMethod || 'unset';
        byPaymentMethod[pm] = (byPaymentMethod[pm] || 0) + 1;
        const ps = order.paymentStatus || 'pending';
        byPaymentStatus[ps] = (byPaymentStatus[ps] || 0) + 1;
      }

      const completedCount =
        (byStatus['completed'] || 0) + (byStatus['delivered'] || 0);
      const cancelledCount = byStatus['cancelled'] || 0;
      const avgValue =
        paidOrders.length > 0
          ? Math.round(
              paidOrders.reduce((s, o) => s + o.total, 0) / paidOrders.length
            )
          : 0;

      // ── Top items by revenue ──
      const topItems = Array.from(itemAgg.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(({ name, category, quantity, revenue }) => ({
          name,
          category,
          quantity,
          revenue,
        }));

      // ── Daily time-series ──
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const dailySeries: SalesDaySeries[] = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayOrders = paidOrders.filter((o) => {
          const paidAt = new Date(o.paidAt!);
          return paidAt >= dayStart && paidAt <= dayEnd;
        });
        const dayRevenue = dayOrders.reduce((s, o) => s + o.total, 0);
        return {
          date: format(day, 'yyyy-MM-dd'),
          revenue: dayRevenue,
          orderCount: dayOrders.length,
          averageOrderValue:
            dayOrders.length > 0
              ? Math.round(dayRevenue / dayOrders.length)
              : 0,
        };
      });

      return apiSuccess(
        serialize({
          period: {
            label,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          revenue: {
            total: totalRevenue,
            food: foodRevenue,
            drinks: drinksRevenue,
            serviceFees: totalServiceFees,
            tax: totalTax,
            tips: totalTips,
            discounts: totalDiscounts,
          },
          costs: { totalCOGS, foodCOGS, drinksCOGS },
          profit: {
            grossProfit,
            grossMargin:
              totalRevenue > 0
                ? Math.round((grossProfit / totalRevenue) * 10000) / 100
                : 0,
            operatingExpenses,
            netProfit,
            netMargin:
              totalRevenue > 0
                ? Math.round((netProfit / totalRevenue) * 10000) / 100
                : 0,
          },
          orders: {
            total: allOrders.length,
            completed: completedCount,
            cancelled: cancelledCount,
            averageValue: avgValue,
            byType,
            byStatus,
          },
          payments: { byMethod: byPaymentMethod, byStatus: byPaymentStatus },
          topItems,
          dailySeries,
        })
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to generate sales summary';
      console.error('[PUBLIC API] GET /api/public/sales/summary', error);
      return apiError(msg, 500);
    }
  });
}
