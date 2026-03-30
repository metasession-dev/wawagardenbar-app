/**
 * @requirement REQ-013 - Include partial payments in daily report aggregation
 * @requirement REQ-017 - Total Revenue reflects money received (paymentBreakdown.total)
 */
import { startOfDay, endOfDay } from 'date-fns';
import { connectDB } from '@/lib/mongodb';
import OrderModel from '@/models/order-model';
import TabModel from '@/models/tab-model';
import { ExpenseModel } from '@/models/expense-model';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';

export interface DailySummaryReport {
  date: Date;
  revenue: {
    food: {
      items: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
      }>;
      totalRevenue: number;
    };
    drink: {
      items: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
      }>;
      totalRevenue: number;
    };
    totalRevenue: number;
  };
  costs: {
    food: {
      items: Array<{
        name: string;
        quantity: number;
        costPerUnit: number;
        total: number;
      }>;
      totalCost: number;
    };
    drink: {
      items: Array<{
        name: string;
        quantity: number;
        costPerUnit: number;
        total: number;
      }>;
      totalCost: number;
    };
    totalDirectCosts: number;
  };
  grossProfit: {
    food: number;
    drink: number;
    total: number;
  };
  operatingExpenses: {
    directCosts: Array<{
      category: string;
      description: string;
      amount: number;
    }>;
    operatingCosts: Array<{
      category: string;
      description: string;
      amount: number;
    }>;
    totalDirectCosts: number;
    totalOperatingExpenses: number;
    totalExpenses: number;
  };
  paymentBreakdown: {
    cash: number;
    card: number;
    transfer: number;
    ussd: number;
    phone: number;
    unspecified: number;
    total: number;
  };
  netProfit: number;
  metrics: {
    grossProfitMargin: number;
    netProfitMargin: number;
    orderCount: number;
  };
}

export class FinancialReportService {
  /**
   * @requirement REQ-013 - Aggregate partial payments from tabs into payment breakdown
   * Queries Tab.partialPayments where paidAt falls in the date range and adds
   * amounts to the payment breakdown by payment type. Also returns the total
   * partial payment amount per tab so order totals can be adjusted to avoid
   * double-counting.
   */
  private static async aggregatePartialPayments(
    startDate: Date,
    endDate: Date,
    paymentBreakdown: Record<string, number>
  ): Promise<{
    tabPartialTotals: Map<string, number>;
    totalPartialPayments: number;
  }> {
    const validMethods = ['cash', 'card', 'transfer', 'ussd', 'phone'];
    const tabPartialTotals = new Map<string, number>();
    let totalPartialPayments = 0;

    // Find all tabs that have partial payments in this date range
    const tabsWithPartials = await TabModel.find({
      'partialPayments.paidAt': { $gte: startDate, $lte: endDate },
    }).lean();

    for (const tab of tabsWithPartials) {
      for (const pp of tab.partialPayments || []) {
        const paidAt = new Date(pp.paidAt);
        if (paidAt >= startDate && paidAt <= endDate) {
          const method = pp.paymentType as string;
          const amount = pp.amount || 0;

          if (method && validMethods.includes(method)) {
            paymentBreakdown[method] += amount;
          } else {
            paymentBreakdown.unspecified += amount;
          }
          paymentBreakdown.total += amount;
          totalPartialPayments += amount;

          // Track total partial payments per tab for double-counting prevention
          const tabId = tab._id.toString();
          tabPartialTotals.set(
            tabId,
            (tabPartialTotals.get(tabId) || 0) + amount
          );
        }
      }
    }

    return { tabPartialTotals, totalPartialPayments };
  }

  /**
   * Generate daily summary report for a specific date
   */
  static async generateDailySummary(date: Date): Promise<DailySummaryReport> {
    await connectDB();

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    // Fetch all paid orders for the date (based on payment date, not creation date)
    const orders = await OrderModel.find({
      paymentStatus: 'paid',
      paidAt: { $gte: startDate, $lte: endDate },
    }).lean();

    // Initialize report structure
    const report: DailySummaryReport = {
      date,
      revenue: {
        food: { items: [], totalRevenue: 0 },
        drink: { items: [], totalRevenue: 0 },
        totalRevenue: 0,
      },
      costs: {
        food: { items: [], totalCost: 0 },
        drink: { items: [], totalCost: 0 },
        totalDirectCosts: 0,
      },
      grossProfit: {
        food: 0,
        drink: 0,
        total: 0,
      },
      operatingExpenses: {
        directCosts: [],
        operatingCosts: [],
        totalDirectCosts: 0,
        totalOperatingExpenses: 0,
        totalExpenses: 0,
      },
      paymentBreakdown: {
        cash: 0,
        card: 0,
        transfer: 0,
        ussd: 0,
        phone: 0,
        unspecified: 0,
        total: 0,
      },
      netProfit: 0,
      metrics: {
        grossProfitMargin: 0,
        netProfitMargin: 0,
        orderCount: orders.length,
      },
    };

    /**
     * @requirement REQ-013 - Aggregate partial payments from tabs first,
     * then aggregate order payments, subtracting partial payment amounts
     * from tab orders to avoid double-counting.
     */
    const {} = await FinancialReportService.aggregatePartialPayments(
      startDate,
      endDate,
      report.paymentBreakdown as Record<string, number>
    );

    // Build a map of tabId -> total partial payments (all time, not just this period)
    // to correctly subtract from order totals when the tab is closed in this period
    const tabIdsWithPartials = new Set<string>();
    const allTimeTabPartials = new Map<string, number>();

    // For orders belonging to tabs, we need to know ALL partial payments on that tab
    // (not just ones in this date range) to correctly subtract from the order total
    for (const order of orders) {
      if (order.tabId) {
        tabIdsWithPartials.add(order.tabId.toString());
      }
    }

    if (tabIdsWithPartials.size > 0) {
      const tabsForOrders = await TabModel.find({
        _id: { $in: Array.from(tabIdsWithPartials) },
        'partialPayments.0': { $exists: true },
      }).lean();

      for (const tab of tabsForOrders) {
        const totalPP = (tab.partialPayments || []).reduce(
          (sum: number, pp: any) => sum + (pp.amount || 0),
          0
        );
        if (totalPP > 0) {
          allTimeTabPartials.set(tab._id.toString(), totalPP);
        }
      }
    }

    const validMethods = ['cash', 'card', 'transfer', 'ussd', 'phone'];
    for (const order of orders) {
      let amount = order.total || 0;
      const method = order.paymentMethod as string | undefined;

      // If this order belongs to a tab with partial payments, subtract the
      // partial payment total so only the final payment portion is attributed
      // to the closing day. The partial payments are counted separately above.
      if (order.tabId) {
        const tabId = order.tabId.toString();
        const ppTotal = allTimeTabPartials.get(tabId) || 0;
        if (ppTotal > 0) {
          // Distribute the subtraction proportionally across orders in the tab
          // For simplicity, subtract from the first order's attribution
          // by reducing the total attributed amount for this tab's orders
          const remaining = allTimeTabPartials.get(tabId) || 0;
          if (remaining > 0) {
            const subtract = Math.min(remaining, amount);
            amount -= subtract;
            allTimeTabPartials.set(tabId, remaining - subtract);
          }
        }
      }

      if (amount > 0) {
        if (method && validMethods.includes(method)) {
          (report.paymentBreakdown as Record<string, number>)[method] += amount;
        } else {
          report.paymentBreakdown.unspecified += amount;
        }
        report.paymentBreakdown.total += amount;
      }
    }

    // Aggregate items by menu item
    const itemMap = new Map<
      string,
      {
        name: string;
        category: string;
        mainCategory: string;
        quantity: number;
        price: number;
        costPerUnit: number;
      }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const itemId = item.menuItemId.toString();

        if (itemMap.has(itemId)) {
          const existing = itemMap.get(itemId)!;
          existing.quantity += item.quantity;
        } else {
          // Fetch menu item to get category
          const menuItem = await MenuItemModel.findById(item.menuItemId).lean();

          if (!menuItem) continue;

          // Get cost from inventory
          const inventory = await InventoryModel.findOne({
            menuItemId: item.menuItemId,
          }).lean();

          itemMap.set(itemId, {
            name: item.name,
            category: menuItem.category,
            mainCategory: menuItem.mainCategory,
            quantity: item.quantity,
            price: item.price,
            costPerUnit: inventory?.costPerUnit || 0,
          });
        }
      }
    }

    // Process aggregated items
    for (const [_, item] of itemMap) {
      const total = item.price * item.quantity;
      const costTotal = item.costPerUnit * item.quantity;

      const revenueItem = {
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total,
      };

      const costItem = {
        name: item.name,
        quantity: item.quantity,
        costPerUnit: item.costPerUnit,
        total: costTotal,
      };

      // Categorize by food or drink using mainCategory
      if (item.mainCategory === 'drinks') {
        report.revenue.drink.items.push(revenueItem);
        report.revenue.drink.totalRevenue += total;
        report.costs.drink.items.push(costItem);
        report.costs.drink.totalCost += costTotal;
      } else {
        report.revenue.food.items.push(revenueItem);
        report.revenue.food.totalRevenue += total;
        report.costs.food.items.push(costItem);
        report.costs.food.totalCost += costTotal;
      }
    }

    // Calculate totals
    // totalRevenue = money actually received (payment breakdown total)
    // food/drink totals remain item-based for the detailed breakdown
    const itemRevenue =
      report.revenue.food.totalRevenue + report.revenue.drink.totalRevenue;
    report.revenue.totalRevenue = report.paymentBreakdown.total || itemRevenue;
    report.costs.totalDirectCosts =
      report.costs.food.totalCost + report.costs.drink.totalCost;

    // Calculate gross profit (based on item revenue vs COGS)
    report.grossProfit.food =
      report.revenue.food.totalRevenue - report.costs.food.totalCost;
    report.grossProfit.drink =
      report.revenue.drink.totalRevenue - report.costs.drink.totalCost;
    report.grossProfit.total =
      report.grossProfit.food + report.grossProfit.drink;

    // Fetch expenses for the date
    const expenses = await ExpenseModel.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate('createdBy', 'firstName lastName')
      .lean();

    // Categorize expenses
    for (const expense of expenses) {
      const expenseItem = {
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
      };

      if (expense.expenseType === 'direct-cost') {
        report.operatingExpenses.directCosts.push(expenseItem);
        report.operatingExpenses.totalDirectCosts += expense.amount;
      } else {
        report.operatingExpenses.operatingCosts.push(expenseItem);
        report.operatingExpenses.totalOperatingExpenses += expense.amount;
      }
    }

    report.operatingExpenses.totalExpenses =
      report.operatingExpenses.totalDirectCosts +
      report.operatingExpenses.totalOperatingExpenses;

    // Calculate net profit
    // Net Profit = Gross Profit - Operating Expenses (Overhead)
    // We exclude Direct Costs (Purchases) because COGS is already subtracted from Revenue to get Gross Profit
    report.netProfit =
      report.grossProfit.total -
      report.operatingExpenses.totalOperatingExpenses;

    // Calculate metrics (margins based on item revenue, not payment total)
    if (itemRevenue > 0) {
      report.metrics.grossProfitMargin =
        (report.grossProfit.total / itemRevenue) * 100;
      report.metrics.netProfitMargin = (report.netProfit / itemRevenue) * 100;
    }

    return report;
  }

  /**
   * Generate report for a date range
   */
  static async generateDateRangeReport(
    startDate: Date,
    endDate: Date
  ): Promise<DailySummaryReport> {
    await connectDB();

    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // Fetch all paid orders for the date range (based on payment date, not creation date)
    const orders = await OrderModel.find({
      paymentStatus: 'paid',
      paidAt: { $gte: start, $lte: end },
    }).lean();

    // Similar logic to generateDailySummary but for date range
    const report: DailySummaryReport = {
      date: startDate,
      revenue: {
        food: { items: [], totalRevenue: 0 },
        drink: { items: [], totalRevenue: 0 },
        totalRevenue: 0,
      },
      costs: {
        food: { items: [], totalCost: 0 },
        drink: { items: [], totalCost: 0 },
        totalDirectCosts: 0,
      },
      grossProfit: {
        food: 0,
        drink: 0,
        total: 0,
      },
      operatingExpenses: {
        directCosts: [],
        operatingCosts: [],
        totalDirectCosts: 0,
        totalOperatingExpenses: 0,
        totalExpenses: 0,
      },
      paymentBreakdown: {
        cash: 0,
        card: 0,
        transfer: 0,
        ussd: 0,
        phone: 0,
        unspecified: 0,
        total: 0,
      },
      netProfit: 0,
      metrics: {
        grossProfitMargin: 0,
        netProfitMargin: 0,
        orderCount: orders.length,
      },
    };

    /**
     * @requirement REQ-013 - Same partial payment logic as generateDailySummary
     */
    const {} = await FinancialReportService.aggregatePartialPayments(
      start,
      end,
      report.paymentBreakdown as Record<string, number>
    );

    const rangeTabIdsWithPartials = new Set<string>();
    const rangeAllTimeTabPartials = new Map<string, number>();

    for (const order of orders) {
      if (order.tabId) {
        rangeTabIdsWithPartials.add(order.tabId.toString());
      }
    }

    if (rangeTabIdsWithPartials.size > 0) {
      const tabsForOrders = await TabModel.find({
        _id: { $in: Array.from(rangeTabIdsWithPartials) },
        'partialPayments.0': { $exists: true },
      }).lean();

      for (const tab of tabsForOrders) {
        const totalPP = (tab.partialPayments || []).reduce(
          (sum: number, pp: any) => sum + (pp.amount || 0),
          0
        );
        if (totalPP > 0) {
          rangeAllTimeTabPartials.set(tab._id.toString(), totalPP);
        }
      }
    }

    const validMethods = ['cash', 'card', 'transfer', 'ussd', 'phone'];
    for (const order of orders) {
      let amount = order.total || 0;
      const method = order.paymentMethod as string | undefined;

      if (order.tabId) {
        const tabId = order.tabId.toString();
        const remaining = rangeAllTimeTabPartials.get(tabId) || 0;
        if (remaining > 0) {
          const subtract = Math.min(remaining, amount);
          amount -= subtract;
          rangeAllTimeTabPartials.set(tabId, remaining - subtract);
        }
      }

      if (amount > 0) {
        if (method && validMethods.includes(method)) {
          (report.paymentBreakdown as Record<string, number>)[method] += amount;
        } else {
          report.paymentBreakdown.unspecified += amount;
        }
        report.paymentBreakdown.total += amount;
      }
    }

    // Aggregate items
    const itemMap = new Map<
      string,
      {
        name: string;
        category: string;
        mainCategory: string;
        quantity: number;
        price: number;
        costPerUnit: number;
      }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const itemId = item.menuItemId.toString();

        if (itemMap.has(itemId)) {
          const existing = itemMap.get(itemId)!;
          existing.quantity += item.quantity;
        } else {
          // Fetch menu item to get category
          const menuItem = await MenuItemModel.findById(item.menuItemId).lean();

          if (!menuItem) continue;

          const inventory = await InventoryModel.findOne({
            menuItemId: item.menuItemId,
          }).lean();

          itemMap.set(itemId, {
            name: item.name,
            category: menuItem.category,
            mainCategory: menuItem.mainCategory,
            quantity: item.quantity,
            price: item.price,
            costPerUnit: inventory?.costPerUnit || 0,
          });
        }
      }
    }

    // Process items (same logic as daily report)
    for (const [_, item] of itemMap) {
      const total = item.price * item.quantity;
      const costTotal = item.costPerUnit * item.quantity;

      const revenueItem = {
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total,
      };

      const costItem = {
        name: item.name,
        quantity: item.quantity,
        costPerUnit: item.costPerUnit,
        total: costTotal,
      };

      if (item.mainCategory === 'drinks') {
        report.revenue.drink.items.push(revenueItem);
        report.revenue.drink.totalRevenue += total;
        report.costs.drink.items.push(costItem);
        report.costs.drink.totalCost += costTotal;
      } else {
        report.revenue.food.items.push(revenueItem);
        report.revenue.food.totalRevenue += total;
        report.costs.food.items.push(costItem);
        report.costs.food.totalCost += costTotal;
      }
    }

    const rangeItemRevenue =
      report.revenue.food.totalRevenue + report.revenue.drink.totalRevenue;
    report.revenue.totalRevenue =
      report.paymentBreakdown.total || rangeItemRevenue;
    report.costs.totalDirectCosts =
      report.costs.food.totalCost + report.costs.drink.totalCost;

    report.grossProfit.food =
      report.revenue.food.totalRevenue - report.costs.food.totalCost;
    report.grossProfit.drink =
      report.revenue.drink.totalRevenue - report.costs.drink.totalCost;
    report.grossProfit.total =
      report.grossProfit.food + report.grossProfit.drink;

    // Fetch expenses
    const expenses = await ExpenseModel.find({
      date: { $gte: start, $lte: end },
    }).lean();

    for (const expense of expenses) {
      const expenseItem = {
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
      };

      if (expense.expenseType === 'direct-cost') {
        report.operatingExpenses.directCosts.push(expenseItem);
        report.operatingExpenses.totalDirectCosts += expense.amount;
      } else {
        report.operatingExpenses.operatingCosts.push(expenseItem);
        report.operatingExpenses.totalOperatingExpenses += expense.amount;
      }
    }

    report.operatingExpenses.totalExpenses =
      report.operatingExpenses.totalDirectCosts +
      report.operatingExpenses.totalOperatingExpenses;

    report.netProfit =
      report.grossProfit.total -
      report.operatingExpenses.totalOperatingExpenses;

    if (rangeItemRevenue > 0) {
      report.metrics.grossProfitMargin =
        (report.grossProfit.total / rangeItemRevenue) * 100;
      report.metrics.netProfitMargin =
        (report.netProfit / rangeItemRevenue) * 100;
    }

    return report;
  }
}
