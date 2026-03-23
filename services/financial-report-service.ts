import { startOfDay, endOfDay } from 'date-fns';
import { connectDB } from '@/lib/mongodb';
import OrderModel from '@/models/order-model';
import { ExpenseModel } from '@/models/expense-model';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';

export interface DailySummaryReport {
  date: Date;
  revenue: {
    food: {
      items: Array<{ name: string; quantity: number; price: number; total: number }>;
      totalRevenue: number;
    };
    drink: {
      items: Array<{ name: string; quantity: number; price: number; total: number }>;
      totalRevenue: number;
    };
    totalRevenue: number;
  };
  costs: {
    food: {
      items: Array<{ name: string; quantity: number; costPerUnit: number; total: number }>;
      totalCost: number;
    };
    drink: {
      items: Array<{ name: string; quantity: number; costPerUnit: number; total: number }>;
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
    directCosts: Array<{ category: string; description: string; amount: number }>;
    operatingCosts: Array<{ category: string; description: string; amount: number }>;
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
   * Generate daily summary report for a specific date
   */
  static async generateDailySummary(date: Date): Promise<DailySummaryReport> {
    await connectDB();

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    console.log('📊 Generating report for date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Debug: Check all paid orders in database
    const allPaidOrders = await OrderModel.find({ paymentStatus: 'paid' })
      .select('_id total paidAt createdAt paymentStatus')
      .lean();
    console.log(`📊 Total paid orders in database: ${allPaidOrders.length}`);
    if (allPaidOrders.length > 0) {
      console.log('Sample paid orders:', allPaidOrders.slice(0, 3).map(o => ({
        id: o._id,
        total: o.total,
        paidAt: o.paidAt,
        createdAt: o.createdAt,
      })));
    }

    // Fetch all paid orders for the date (based on payment date, not creation date)
    const orders = await OrderModel.find({
      paymentStatus: 'paid',
      paidAt: { $gte: startDate, $lte: endDate },
    }).lean();

    console.log(`📊 Found ${orders.length} paid orders for this date range`);
    if (orders.length > 0) {
      console.log('First order sample:', {
        id: orders[0]._id,
        total: orders[0].total,
        paidAt: orders[0].paidAt,
        paymentStatus: orders[0].paymentStatus,
      });
    }

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

    // Aggregate payment breakdown
    const validMethods = ['cash', 'card', 'transfer', 'ussd', 'phone'];
    for (const order of orders) {
      const amount = order.total || 0;
      const method = order.paymentMethod as string | undefined;
      if (method && validMethods.includes(method)) {
        (report.paymentBreakdown as Record<string, number>)[method] += amount;
      } else {
        report.paymentBreakdown.unspecified += amount;
      }
      report.paymentBreakdown.total += amount;
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
    report.revenue.totalRevenue =
      report.revenue.food.totalRevenue + report.revenue.drink.totalRevenue;
    report.costs.totalDirectCosts =
      report.costs.food.totalCost + report.costs.drink.totalCost;

    // Calculate gross profit
    report.grossProfit.food =
      report.revenue.food.totalRevenue - report.costs.food.totalCost;
    report.grossProfit.drink =
      report.revenue.drink.totalRevenue - report.costs.drink.totalCost;
    report.grossProfit.total = report.grossProfit.food + report.grossProfit.drink;

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
    report.netProfit = report.grossProfit.total - report.operatingExpenses.totalOperatingExpenses;

    // Calculate metrics
    if (report.revenue.totalRevenue > 0) {
      report.metrics.grossProfitMargin =
        (report.grossProfit.total / report.revenue.totalRevenue) * 100;
      report.metrics.netProfitMargin =
        (report.netProfit / report.revenue.totalRevenue) * 100;
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

    // Aggregate payment breakdown
    const validMethods = ['cash', 'card', 'transfer', 'ussd', 'phone'];
    for (const order of orders) {
      const amount = order.total || 0;
      const method = order.paymentMethod as string | undefined;
      if (method && validMethods.includes(method)) {
        (report.paymentBreakdown as Record<string, number>)[method] += amount;
      } else {
        report.paymentBreakdown.unspecified += amount;
      }
      report.paymentBreakdown.total += amount;
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

    report.revenue.totalRevenue =
      report.revenue.food.totalRevenue + report.revenue.drink.totalRevenue;
    report.costs.totalDirectCosts =
      report.costs.food.totalCost + report.costs.drink.totalCost;

    report.grossProfit.food =
      report.revenue.food.totalRevenue - report.costs.food.totalCost;
    report.grossProfit.drink =
      report.revenue.drink.totalRevenue - report.costs.drink.totalCost;
    report.grossProfit.total = report.grossProfit.food + report.grossProfit.drink;

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

    report.netProfit = report.grossProfit.total - report.operatingExpenses.totalOperatingExpenses;

    if (report.revenue.totalRevenue > 0) {
      report.metrics.grossProfitMargin =
        (report.grossProfit.total / report.revenue.totalRevenue) * 100;
      report.metrics.netProfitMargin =
        (report.netProfit / report.revenue.totalRevenue) * 100;
    }

    return report;
  }
}
