import OrderModel from '@/models/order-model';
import { startOfDay, endOfDay, format } from 'date-fns';

export interface PriceOverrideMetrics {
  totalOverrides: number;
  totalImpact: number; // Positive = markup, Negative = discount
  averageImpact: number;
  totalRevenueLost: number; // Only discounts
  totalRevenueGained: number; // Only markups
  impactOnProfit: number;
  overrideRate: number; // Percentage of orders with overrides
}

export interface OverrideByReason {
  reason: string;
  count: number;
  totalImpact: number;
  averageImpact: number;
}

export interface OverrideByStaff {
  staffId: string;
  staffName: string;
  staffEmail: string;
  count: number;
  totalImpact: number;
  averageImpact: number;
}

export interface OverrideTrend {
  date: string;
  count: number;
  totalImpact: number;
  discounts: number;
  markups: number;
}

/**
 * Price Override Analytics Service
 * Provides analytics and reporting for price overrides
 */
class PriceOverrideAnalyticsService {
  /**
   * Get price override metrics for a date range
   */
  static async getOverrideMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<PriceOverrideMetrics> {
    const orders = await OrderModel.find({
      createdAt: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    }).lean();

    let totalOverrides = 0;
    let totalImpact = 0;
    let totalRevenueLost = 0;
    let totalRevenueGained = 0;
    let ordersWithOverrides = 0;

    for (const order of orders) {
      let orderHasOverride = false;

      for (const item of order.items) {
        if (item.priceOverridden && item.originalPrice) {
          totalOverrides++;
          orderHasOverride = true;

          const impact = (item.price - item.originalPrice) * item.quantity;
          totalImpact += impact;

          if (impact < 0) {
            totalRevenueLost += Math.abs(impact);
          } else {
            totalRevenueGained += impact;
          }
        }
      }

      if (orderHasOverride) {
        ordersWithOverrides++;
      }
    }

    const averageImpact = totalOverrides > 0 ? totalImpact / totalOverrides : 0;
    const overrideRate = orders.length > 0 ? (ordersWithOverrides / orders.length) * 100 : 0;
    const impactOnProfit = totalImpact; // Simplified - could be more complex with cost calculations

    return {
      totalOverrides,
      totalImpact,
      averageImpact,
      totalRevenueLost,
      totalRevenueGained,
      impactOnProfit,
      overrideRate,
    };
  }

  /**
   * Get override breakdown by reason
   */
  static async getOverridesByReason(
    startDate: Date,
    endDate: Date
  ): Promise<OverrideByReason[]> {
    const orders = await OrderModel.find({
      createdAt: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    }).lean();

    const reasonMap = new Map<string, { count: number; totalImpact: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        if (item.priceOverridden && item.originalPrice) {
          const reason = item.priceOverrideReason || 'No reason provided';
          const impact = (item.price - item.originalPrice) * item.quantity;

          const existing = reasonMap.get(reason) || { count: 0, totalImpact: 0 };
          reasonMap.set(reason, {
            count: existing.count + 1,
            totalImpact: existing.totalImpact + impact,
          });
        }
      }
    }

    return Array.from(reasonMap.entries())
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        totalImpact: data.totalImpact,
        averageImpact: data.totalImpact / data.count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get override breakdown by staff member
   */
  static async getOverridesByStaff(
    startDate: Date,
    endDate: Date
  ): Promise<OverrideByStaff[]> {
    const orders = await OrderModel.find({
      createdAt: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    })
      .populate('items.priceOverriddenBy', 'firstName lastName email')
      .lean();

    const staffMap = new Map<string, { 
      name: string; 
      email: string; 
      count: number; 
      totalImpact: number 
    }>();

    for (const order of orders) {
      for (const item of order.items) {
        if (item.priceOverridden && item.originalPrice && item.priceOverriddenBy) {
          const staff = item.priceOverriddenBy as any;
          const staffId = staff._id?.toString() || 'unknown';
          const staffName = staff.firstName && staff.lastName 
            ? `${staff.firstName} ${staff.lastName}` 
            : 'Unknown Staff';
          const staffEmail = staff.email || '';

          const impact = (item.price - item.originalPrice) * item.quantity;

          const existing = staffMap.get(staffId) || { 
            name: staffName, 
            email: staffEmail,
            count: 0, 
            totalImpact: 0 
          };
          
          staffMap.set(staffId, {
            name: staffName,
            email: staffEmail,
            count: existing.count + 1,
            totalImpact: existing.totalImpact + impact,
          });
        }
      }
    }

    return Array.from(staffMap.entries())
      .map(([staffId, data]) => ({
        staffId,
        staffName: data.name,
        staffEmail: data.email,
        count: data.count,
        totalImpact: data.totalImpact,
        averageImpact: data.totalImpact / data.count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get override trend over time (daily breakdown)
   */
  static async getOverrideTrend(
    startDate: Date,
    endDate: Date
  ): Promise<OverrideTrend[]> {
    const orders = await OrderModel.find({
      createdAt: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    }).lean();

    const trendMap = new Map<string, { 
      count: number; 
      totalImpact: number;
      discounts: number;
      markups: number;
    }>();

    for (const order of orders) {
      const dateKey = format(new Date(order.createdAt), 'yyyy-MM-dd');

      for (const item of order.items) {
        if (item.priceOverridden && item.originalPrice) {
          const impact = (item.price - item.originalPrice) * item.quantity;
          const existing = trendMap.get(dateKey) || { 
            count: 0, 
            totalImpact: 0,
            discounts: 0,
            markups: 0,
          };

          trendMap.set(dateKey, {
            count: existing.count + 1,
            totalImpact: existing.totalImpact + impact,
            discounts: impact < 0 ? existing.discounts + 1 : existing.discounts,
            markups: impact > 0 ? existing.markups + 1 : existing.markups,
          });
        }
      }
    }

    // Fill in missing dates with zero values
    const result: OverrideTrend[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const data = trendMap.get(dateKey) || { 
        count: 0, 
        totalImpact: 0,
        discounts: 0,
        markups: 0,
      };

      result.push({
        date: dateKey,
        count: data.count,
        totalImpact: data.totalImpact,
        discounts: data.discounts,
        markups: data.markups,
      });

      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * Get detailed override list for a date range
   */
  static async getOverrideDetails(
    startDate: Date,
    endDate: Date,
    limit: number = 50
  ) {
    const orders = await OrderModel.find({
      createdAt: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
      'items.priceOverridden': true,
    })
      .populate('items.priceOverriddenBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const details = [];

    for (const order of orders) {
      for (const item of order.items) {
        if (item.priceOverridden && item.originalPrice) {
          const staff = item.priceOverriddenBy as any;
          const impact = (item.price - item.originalPrice) * item.quantity;

          details.push({
            orderNumber: order.orderNumber,
            orderId: order._id.toString(),
            itemName: item.name,
            quantity: item.quantity,
            originalPrice: item.originalPrice,
            overriddenPrice: item.price,
            impact,
            reason: item.priceOverrideReason || 'No reason provided',
            staffName: staff?.firstName && staff?.lastName 
              ? `${staff.firstName} ${staff.lastName}` 
              : 'Unknown',
            staffEmail: staff?.email || '',
            timestamp: item.priceOverriddenAt || order.createdAt,
          });
        }
      }
    }

    return details.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export default PriceOverrideAnalyticsService;
