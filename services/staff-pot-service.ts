/**
 * @requirement REQ-015 - Staff Pot bonus calculation service
 */
import { connectDB } from '@/lib/mongodb';
import { FinancialReportService } from './financial-report-service';
import StaffPotSnapshotModel, {
  IStaffPotDailyEntry,
  IStaffPotSnapshot,
} from '@/models/staff-pot-snapshot-model';
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
        const revenue = report.paymentBreakdown?.total || 0;
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

    const kitchenPayout =
      Math.round(totalPot * (config.kitchenSplitRatio / 100) * 100) / 100;
    const barPayout =
      Math.round(totalPot * (config.barSplitRatio / 100) * 100) / 100;

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
    };
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
