import { connectDB } from '@/lib/mongodb';
import Order from '@/models/order-model';
import { watCalendarDayRange } from '@/lib/business-date';

export interface ProfitabilitySummary {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  orderCount: number;
  averageOrderProfit: number;
}

export interface ItemProfitability {
  menuItemId: string;
  name: string;
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

export interface CategoryProfitability {
  category: string;
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

export interface OrderTypeProfitability {
  orderType: string;
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  averageOrderValue: number;
}

export interface DailyProfitability {
  date: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  orderCount: number;
}

export interface ProfitabilityReport {
  period: { start: Date; end: Date };
  summary: ProfitabilitySummary;
  byCategory: CategoryProfitability[];
  byItem: ItemProfitability[];
  byOrderType: OrderTypeProfitability[];
  trends: {
    daily: DailyProfitability[];
  };
}

export class ProfitabilityAnalyticsService {
  /**
   * Generate comprehensive profitability report for a date range
   */
  static async generateProfitabilityReport(
    startDate: Date,
    endDate: Date,
    filters?: {
      orderType?: string;
      category?: string;
    }
  ): Promise<ProfitabilityReport> {
    await connectDB();

    // Build query
    const { start } = watCalendarDayRange(startDate);
    const { end } = watCalendarDayRange(endDate);
    const query: any = {
      businessDate: { $gte: start, $lte: end },
      paymentStatus: 'paid',
    };

    if (filters?.orderType) {
      query.orderType = filters.orderType;
    }

    // Fetch orders
    const orders = await Order.find(query).lean();
    const filteredOrders = filters?.category
      ? orders
          .map((order: any) => {
            const items = (order.items ?? []).filter(
              (item: any) => item.categoryAtSale === filters.category
            );
            // Order-level overhead cannot be truthfully assigned to one
            // category in a multi-category order. Category reports therefore
            // use immutable line revenue/COGS only, rather than retaining the
            // full order total after its lines were narrowed.
            return {
              ...order,
              items,
              total: items.reduce(
                (sum: number, item: any) => sum + (item.subtotal ?? 0),
                0
              ),
              totalCost: items.reduce(
                (sum: number, item: any) => sum + (item.totalCost ?? 0),
                0
              ),
              operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
            };
          })
          .filter((order: any) => order.items.length > 0)
      : orders;

    // Calculate summary
    const summary = this.calculateSummary(filteredOrders);

    // Calculate by category (would need menu item population)
    const byCategory = await this.calculateByCategory(filteredOrders);

    // Calculate by item
    const byItem = await this.calculateByItem(filteredOrders);

    // Calculate by order type
    const byOrderType = this.calculateByOrderType(filteredOrders);

    // Calculate daily trends
    const daily = this.calculateDailyTrends(filteredOrders, startDate, endDate);

    return {
      period: { start: startDate, end: endDate },
      summary,
      byCategory,
      byItem,
      byOrderType,
      trends: { daily },
    };
  }

  /**
   * Calculate overall summary metrics
   */
  private static calculateSummary(orders: any[]): ProfitabilitySummary {
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );
    const totalCosts = orders.reduce(
      (sum, order) => sum + (order.totalCost || 0),
      0
    );
    const totalOperationalCosts = orders.reduce(
      (sum, order) =>
        sum +
        ((order.operationalCosts?.delivery || 0) +
          (order.operationalCosts?.packaging || 0) +
          (order.operationalCosts?.processing || 0)),
      0
    );

    const grossProfit = totalRevenue - totalCosts - totalOperationalCosts;
    const profitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const averageOrderProfit =
      orders.length > 0 ? grossProfit / orders.length : 0;

    return {
      totalRevenue,
      totalCosts: totalCosts + totalOperationalCosts,
      grossProfit,
      profitMargin,
      orderCount: orders.length,
      averageOrderProfit,
    };
  }

  /**
   * Calculate profitability by menu item
   */
  private static async calculateByItem(
    orders: any[]
  ): Promise<ItemProfitability[]> {
    const itemMap = new Map<string, ItemProfitability>();

    orders.forEach((order) => {
      order.items?.forEach((item: any) => {
        const itemId = item.menuItemId.toString();
        const existing = itemMap.get(itemId);

        if (existing) {
          existing.orderCount += 1;
          existing.totalRevenue += item.subtotal || 0;
          existing.totalCost += item.totalCost || 0;
          existing.grossProfit += item.grossProfit || 0;
        } else {
          itemMap.set(itemId, {
            menuItemId: itemId,
            name: item.name,
            orderCount: 1,
            totalRevenue: item.subtotal || 0,
            totalCost: item.totalCost || 0,
            grossProfit: item.grossProfit || 0,
            profitMargin:
              item.subtotal > 0
                ? ((item.grossProfit || 0) / item.subtotal) * 100
                : 0,
          });
        }
      });
    });

    // Recalculate margins
    const items = Array.from(itemMap.values());
    items.forEach((item) => {
      item.profitMargin =
        item.totalRevenue > 0
          ? (item.grossProfit / item.totalRevenue) * 100
          : 0;
    });

    // Sort by gross profit descending
    return items.sort((a, b) => b.grossProfit - a.grossProfit);
  }

  /**
   * Calculate profitability by category
   */
  private static async calculateByCategory(
    orders: any[]
  ): Promise<CategoryProfitability[]> {
    const categoryMap = new Map<string, CategoryProfitability>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const category = item.categoryAtSale ?? 'Legacy category unavailable';
        const existing = categoryMap.get(category);
        const revenue = item.subtotal ?? 0;
        const cost = item.totalCost ?? 0;
        const grossProfit = item.grossProfit ?? revenue - cost;
        if (existing) {
          existing.orderCount += 1;
          existing.totalRevenue += revenue;
          existing.totalCost += cost;
          existing.grossProfit += grossProfit;
        } else {
          categoryMap.set(category, {
            category,
            orderCount: 1,
            totalRevenue: revenue,
            totalCost: cost,
            grossProfit,
            profitMargin: 0,
          });
        }
      }
    }
    return Array.from(categoryMap.values())
      .map((category) => ({
        ...category,
        profitMargin:
          category.totalRevenue > 0
            ? (category.grossProfit / category.totalRevenue) * 100
            : 0,
      }))
      .sort((a, b) => b.grossProfit - a.grossProfit);
  }

  /**
   * Calculate profitability by order type
   */
  private static calculateByOrderType(orders: any[]): OrderTypeProfitability[] {
    const typeMap = new Map<string, OrderTypeProfitability>();

    orders.forEach((order) => {
      const orderType = order.orderType;
      const existing = typeMap.get(orderType);

      const revenue = order.total || 0;
      const cost = order.totalCost || 0;
      const operationalCost =
        (order.operationalCosts?.delivery || 0) +
        (order.operationalCosts?.packaging || 0) +
        (order.operationalCosts?.processing || 0);
      const profit = revenue - cost - operationalCost;

      if (existing) {
        existing.orderCount += 1;
        existing.totalRevenue += revenue;
        existing.totalCost += cost + operationalCost;
        existing.grossProfit += profit;
      } else {
        typeMap.set(orderType, {
          orderType,
          orderCount: 1,
          totalRevenue: revenue,
          totalCost: cost + operationalCost,
          grossProfit: profit,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          averageOrderValue: revenue,
        });
      }
    });

    // Recalculate averages and margins
    const types = Array.from(typeMap.values());
    types.forEach((type) => {
      type.profitMargin =
        type.totalRevenue > 0
          ? (type.grossProfit / type.totalRevenue) * 100
          : 0;
      type.averageOrderValue =
        type.orderCount > 0 ? type.totalRevenue / type.orderCount : 0;
    });

    return types;
  }

  /**
   * Calculate daily profitability trends
   */
  private static calculateDailyTrends(
    orders: any[],
    startDate: Date,
    endDate: Date
  ): DailyProfitability[] {
    const dailyMap = new Map<string, DailyProfitability>();

    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyMap.set(dateKey, {
        date: dateKey,
        revenue: 0,
        costs: 0,
        profit: 0,
        margin: 0,
        orderCount: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate orders by date
    orders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      const daily = dailyMap.get(dateKey);

      if (daily) {
        const revenue = order.total || 0;
        const cost = order.totalCost || 0;
        const operationalCost =
          (order.operationalCosts?.delivery || 0) +
          (order.operationalCosts?.packaging || 0) +
          (order.operationalCosts?.processing || 0);
        const profit = revenue - cost - operationalCost;

        daily.revenue += revenue;
        daily.costs += cost + operationalCost;
        daily.profit += profit;
        daily.orderCount += 1;
      }
    });

    // Calculate margins
    const trends = Array.from(dailyMap.values());
    trends.forEach((day) => {
      day.margin = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0;
    });

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get top performing items by profit
   */
  static async getTopProfitableItems(
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<ItemProfitability[]> {
    await connectDB();

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: 'paid',
    }).lean();

    const items = await this.calculateByItem(orders);
    return items.slice(0, limit);
  }

  /**
   * Get items with declining margins
   */
  static async getItemsWithDecliningMargins(
    threshold: number = 20
  ): Promise<ItemProfitability[]> {
    await connectDB();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await Order.find({
      createdAt: { $gte: thirtyDaysAgo },
      paymentStatus: 'paid',
    }).lean();

    const items = await this.calculateByItem(orders);
    return items.filter((item) => item.profitMargin < threshold);
  }
}
