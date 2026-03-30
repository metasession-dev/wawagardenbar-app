/**
 * @requirement REQ-015 - Staff Pot bonus calculation service
 * @requirement REQ-017 - Uses revenue.totalRevenue (money received) for pot calculation
 */
import { connectDB } from '@/lib/mongodb';
import { FinancialReportService } from './financial-report-service';
import StaffPotSnapshotModel, {
  IStaffPotDailyEntry,
  IStaffPotSnapshot,
} from '@/models/staff-pot-snapshot-model';
import { InventorySnapshotModel } from '@/models/inventory-snapshot-model';
import InventoryModel from '@/models/inventory-model';
import { SystemSettingsService } from './system-settings-service';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDaysInMonth,
  isBefore,
  startOfDay,
} from 'date-fns';

export interface StaffPotConfig {
  dailyTarget: number;
  bonusPercentage: number;
  kitchenSplitRatio: number;
  barSplitRatio: number;
  kitchenStaffCount: number;
  barStaffCount: number;
  startDate?: string;
  inventoryLossEnabled: boolean;
  foodLossThreshold: number;
  drinkLossThreshold: number;
}

export interface InventoryLossData {
  foodLossPercent: number;
  drinkLossPercent: number;
  foodInventoryValue: number;
  drinkInventoryValue: number;
  foodDeduction: number;
  drinkDeduction: number;
}

export interface StaffPotMonthData {
  month: number;
  year: number;
  totalPot: number;
  qualifyingDays: number;
  totalDaysInMonth: number;
  daysPassed: number;
  daysRemaining: number;
  projectedMonthEndPot: number;
  kitchenPayout: number;
  barPayout: number;
  kitchenPerPerson: number;
  barPerPerson: number;
  dailyEntries: IStaffPotDailyEntry[];
  config: StaffPotConfig;
  inventoryLoss?: InventoryLossData;
  kitchenDeduction: number;
  barDeduction: number;
}

export class StaffPotService {
  /**
   * Get staff pot data for a given month/year.
   * For the current month, computes live from daily reports.
   * For past months, returns the snapshot if available.
   */
  static async getMonthData(
    month: number,
    year: number
  ): Promise<StaffPotMonthData> {
    await connectDB();

    const config = await SystemSettingsService.getStaffPotConfig();
    const now = new Date();
    const isCurrentMonth =
      now.getMonth() === month && now.getFullYear() === year;

    // For past months, check for a finalized snapshot
    if (!isCurrentMonth) {
      const snapshot = await StaffPotSnapshotModel.findOne({
        month,
        year,
      }).lean();
      if (snapshot) {
        return StaffPotService.snapshotToMonthData(snapshot, config);
      }
    }

    // Compute from daily reports
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(monthStart);
    const today = startOfDay(now);
    const lastDay = isCurrentMonth ? today : monthEnd;

    // Respect start date — only compute from the configured start date onward
    let effectiveStart = monthStart;
    if (config.startDate) {
      const configStart = startOfDay(new Date(config.startDate));
      if (
        isBefore(monthStart, configStart) &&
        !isBefore(lastDay, configStart)
      ) {
        effectiveStart = configStart;
      } else if (isBefore(lastDay, configStart)) {
        // Entire month is before start date — return empty data
        const totalDaysInMonth = getDaysInMonth(monthStart);
        return {
          month,
          year,
          totalPot: 0,
          qualifyingDays: 0,
          totalDaysInMonth,
          daysPassed: 0,
          daysRemaining: totalDaysInMonth,
          projectedMonthEndPot: 0,
          kitchenPayout: 0,
          barPayout: 0,
          kitchenPerPerson: 0,
          barPerPerson: 0,
          dailyEntries: [],
          config,
          kitchenDeduction: 0,
          barDeduction: 0,
        };
      }
    }

    const days = eachDayOfInterval({ start: effectiveStart, end: lastDay });
    const dailyEntries: IStaffPotDailyEntry[] = [];
    let totalPot = 0;
    let qualifyingDays = 0;

    for (const day of days) {
      // Skip future days
      if (isBefore(today, day) && !isCurrentMonth) continue;

      try {
        const report = await FinancialReportService.generateDailySummary(day);
        const revenue = report.revenue.totalRevenue || 0;
        const surplus = Math.max(0, revenue - config.dailyTarget);
        const contribution =
          Math.round(surplus * (config.bonusPercentage / 100) * 100) / 100;

        if (surplus > 0) qualifyingDays++;
        totalPot += contribution;

        dailyEntries.push({
          date: day,
          revenue,
          target: config.dailyTarget,
          surplus,
          contribution,
        });
      } catch {
        // If report generation fails for a day, skip it
        dailyEntries.push({
          date: day,
          revenue: 0,
          target: config.dailyTarget,
          surplus: 0,
          contribution: 0,
        });
      }
    }

    const totalDaysInMonth = getDaysInMonth(monthStart);
    const daysPassed = days.length;
    const daysRemaining = totalDaysInMonth - daysPassed;

    // Project month-end pot based on average daily contribution
    const avgDailyContribution = daysPassed > 0 ? totalPot / daysPassed : 0;
    const projectedMonthEndPot = isCurrentMonth
      ? totalPot + avgDailyContribution * daysRemaining
      : totalPot;

    let kitchenPayout =
      Math.round(totalPot * (config.kitchenSplitRatio / 100) * 100) / 100;
    let barPayout =
      Math.round(totalPot * (config.barSplitRatio / 100) * 100) / 100;

    // Calculate inventory loss deductions
    let inventoryLoss: InventoryLossData | undefined;
    let kitchenDeduction = 0;
    let barDeduction = 0;

    if (config.inventoryLossEnabled) {
      inventoryLoss = await StaffPotService.calculateInventoryLoss(
        effectiveStart,
        lastDay,
        config
      );
      kitchenDeduction = Math.min(inventoryLoss.foodDeduction, kitchenPayout);
      barDeduction = Math.min(inventoryLoss.drinkDeduction, barPayout);
      kitchenPayout =
        Math.round((kitchenPayout - kitchenDeduction) * 100) / 100;
      barPayout = Math.round((barPayout - barDeduction) * 100) / 100;
    }

    return {
      month,
      year,
      totalPot: Math.round(totalPot * 100) / 100,
      qualifyingDays,
      totalDaysInMonth,
      daysPassed,
      daysRemaining,
      projectedMonthEndPot: Math.round(projectedMonthEndPot * 100) / 100,
      kitchenPayout,
      barPayout,
      kitchenPerPerson:
        config.kitchenStaffCount > 0
          ? Math.round((kitchenPayout / config.kitchenStaffCount) * 100) / 100
          : 0,
      barPerPerson:
        config.barStaffCount > 0
          ? Math.round((barPayout / config.barStaffCount) * 100) / 100
          : 0,
      dailyEntries,
      config,
      inventoryLoss,
      kitchenDeduction: Math.round(kitchenDeduction * 100) / 100,
      barDeduction: Math.round(barDeduction * 100) / 100,
    };
  }

  /**
   * Convert a snapshot document to StaffPotMonthData
   */
  private static snapshotToMonthData(
    snapshot: IStaffPotSnapshot,
    config: StaffPotConfig
  ): StaffPotMonthData {
    const totalDaysInMonth = getDaysInMonth(
      new Date(snapshot.year, snapshot.month, 1)
    );

    return {
      month: snapshot.month,
      year: snapshot.year,
      totalPot: snapshot.totalPot,
      qualifyingDays: snapshot.qualifyingDays,
      totalDaysInMonth,
      daysPassed: totalDaysInMonth,
      daysRemaining: 0,
      projectedMonthEndPot: snapshot.totalPot,
      kitchenPayout: snapshot.kitchenPayout,
      barPayout: snapshot.barPayout,
      kitchenPerPerson:
        config.kitchenStaffCount > 0
          ? Math.round(
              (snapshot.kitchenPayout / config.kitchenStaffCount) * 100
            ) / 100
          : 0,
      barPerPerson:
        config.barStaffCount > 0
          ? Math.round((snapshot.barPayout / config.barStaffCount) * 100) / 100
          : 0,
      dailyEntries: snapshot.dailyEntries,
      config,
      kitchenDeduction: 0,
      barDeduction: 0,
    };
  }

  /**
   * @requirement REQ-018 - Calculate inventory loss from approved snapshots
   */
  static async calculateInventoryLoss(
    startDate: Date,
    endDate: Date,
    config: StaffPotConfig
  ): Promise<InventoryLossData> {
    const result: InventoryLossData = {
      foodLossPercent: 0,
      drinkLossPercent: 0,
      foodInventoryValue: 0,
      drinkInventoryValue: 0,
      foodDeduction: 0,
      drinkDeduction: 0,
    };

    // Query approved inventory snapshots in the date range
    const snapshots = await InventorySnapshotModel.find({
      status: 'approved',
      snapshotDate: { $gte: startDate, $lte: endDate },
    }).lean();

    if (snapshots.length === 0) return result;

    // Aggregate loss by category and calculate inventory values per item
    let foodSystemTotal = 0;
    let foodLossUnits = 0;
    let drinkSystemTotal = 0;
    let drinkLossUnits = 0;

    // Collect all inventory IDs upfront for a single batch cost lookup
    const inventoryIds = new Set<string>();
    for (const snapshot of snapshots) {
      for (const item of snapshot.items || []) {
        if (item.inventoryId) {
          inventoryIds.add(item.inventoryId.toString());
        }
      }
    }

    // Batch lookup costs: inventoryId → costPerUnit
    const costMap = new Map<string, number>();
    if (inventoryIds.size > 0) {
      const inventories = await InventoryModel.find({
        _id: { $in: Array.from(inventoryIds) },
      })
        .select('_id costPerUnit menuItemId')
        .populate('menuItemId', 'price')
        .lean();

      for (const inv of inventories) {
        const cost = inv.costPerUnit || (inv.menuItemId as any)?.price || 0;
        costMap.set(inv._id.toString(), cost);
      }
    }

    // Iterate snapshot items: aggregate units and calculate per-item inventory value
    for (const snapshot of snapshots) {
      for (const item of snapshot.items || []) {
        const systemCount = item.systemInventoryCount || 0;
        const costPerUnit = item.inventoryId
          ? costMap.get(item.inventoryId.toString()) || 0
          : 0;
        const itemValue = costPerUnit * systemCount;

        if (item.mainCategory === 'food') {
          foodSystemTotal += systemCount;
          result.foodInventoryValue += itemValue;
          if (item.discrepancy < 0) {
            foodLossUnits += Math.abs(item.discrepancy);
          }
        } else if (item.mainCategory === 'drinks') {
          drinkSystemTotal += systemCount;
          result.drinkInventoryValue += itemValue;
          if (item.discrepancy < 0) {
            drinkLossUnits += Math.abs(item.discrepancy);
          }
        }
      }
    }

    // Calculate loss percentages
    if (foodSystemTotal > 0) {
      result.foodLossPercent =
        Math.round((foodLossUnits / foodSystemTotal) * 10000) / 100;
    }
    if (drinkSystemTotal > 0) {
      result.drinkLossPercent =
        Math.round((drinkLossUnits / drinkSystemTotal) * 10000) / 100;
    }

    // Calculate deductions: excess loss % * inventory value
    const foodExcess = Math.max(
      0,
      result.foodLossPercent - config.foodLossThreshold
    );
    const drinkExcess = Math.max(
      0,
      result.drinkLossPercent - config.drinkLossThreshold
    );

    result.foodDeduction =
      Math.round((foodExcess / 100) * result.foodInventoryValue * 100) / 100;
    result.drinkDeduction =
      Math.round((drinkExcess / 100) * result.drinkInventoryValue * 100) / 100;

    return result;
  }

  /**
   * Finalize a month — creates a snapshot for historical reference
   */
  static async finalizeMonth(
    month: number,
    year: number
  ): Promise<IStaffPotSnapshot> {
    await connectDB();

    const data = await StaffPotService.getMonthData(month, year);

    const snapshot = await StaffPotSnapshotModel.findOneAndUpdate(
      { month, year },
      {
        $set: {
          totalPot: data.totalPot,
          qualifyingDays: data.qualifyingDays,
          totalDays: data.totalDaysInMonth,
          dailyEntries: data.dailyEntries,
          kitchenPayout: data.kitchenPayout,
          barPayout: data.barPayout,
          config: data.config,
          finalized: true,
        },
      },
      { upsert: true, new: true }
    );

    return snapshot;
  }
}
