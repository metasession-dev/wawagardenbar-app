/**
 * @requirement REQ-106 - Current Cash Position tracking
 *
 * On-demand computation, no persisted running counter — mirrors the
 * existing convention in `financial-report-service.ts` (paymentBreakdown /
 * tipsBreakdown / operatingExpenses are all recomputed fresh per request).
 * Cash tips are deliberately excluded from "cash in" — only
 * `paymentBreakdown.cash` (sale revenue) counts, per the operator's
 * explicit decision during requirements gathering.
 */
import { connectDB } from '@/lib/mongodb';
import { CashPositionAdjustmentModel } from '@/models/cash-position-adjustment-model';
import { PendingExpenseGroupModel } from '@/models/pending-expense-group-model';
import { CashDepositModel } from '@/models/cash-deposit-model';
import { FinancialReportService } from './financial-report-service';
import { SystemSettingsService } from './system-settings-service';
import {
  businessDateQueryRange,
  watCalendarDateKey,
} from '@/lib/business-date';
import {
  ICashPositionAdjustment,
  CreateCashPositionAdjustmentDTO,
} from '@/interfaces/cash-position-adjustment.interface';
import { CashPositionSummary } from '@/interfaces/cash-position.interface';
import { ObjectId } from 'mongodb';

export class CashPositionService {
  /** Earliest recorded adjustment's effectiveDate, or null if none exist. */
  static async getEarliestSeedDate(): Promise<Date | null> {
    await connectDB();
    const earliest = await CashPositionAdjustmentModel.findOne()
      .sort({ effectiveDate: 1 })
      .lean();
    return earliest
      ? (earliest as ICashPositionAdjustment).effectiveDate
      : null;
  }

  /** Sum of all seed+correction deltas with effectiveDate <= asOfDate. */
  static async getSeedAndAdjustmentTotal(asOfDate: Date): Promise<number> {
    await connectDB();
    const result = await CashPositionAdjustmentModel.aggregate([
      { $match: { effectiveDate: { $lte: asOfDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * Cash sale revenue in [start,end] — reuses `paymentBreakdown.cash` from
   * FinancialReportService rather than re-deriving the order/tab
   * aggregation, so the two "cash in" figures can never diverge. Tips are
   * excluded (paymentBreakdown covers sale revenue only, not tips).
   */
  static async getCashInForRange(start: Date, end: Date): Promise<number> {
    const report = await FinancialReportService.generateDateRangeReport(
      start,
      end
    );
    return report.paymentBreakdown?.cash ?? 0;
  }

  /** Sum of transferred cash-method pending-expense-group totals in [start,end]. */
  static async getCashOutExpensesForRange(
    start: Date,
    end: Date
  ): Promise<number> {
    await connectDB();
    const result = await PendingExpenseGroupModel.aggregate([
      {
        $match: {
          status: 'transferred',
          paymentMethod: 'cash',
          transferredAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /** Sum of transferred cash-deposit amounts in [start,end]. */
  static async getCashOutDepositsForRange(
    start: Date,
    end: Date
  ): Promise<number> {
    await connectDB();
    const result = await CashDepositModel.aggregate([
      {
        $match: {
          status: 'transferred',
          transferredAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * Composite position for a single business date: opening (as of the end
   * of the previous business day) + today's cash in − today's cash-out
   * (expenses + deposits) = closing.
   */
  static async getCashPositionForDate(
    date: Date
  ): Promise<CashPositionSummary> {
    const earliestSeed = await this.getEarliestSeedDate();
    const cutoff = await SystemSettingsService.getBusinessDayCutoff();
    // Derive the business-date label the same way
    // FinancialReportService.generateDateRangeReport does (WAT calendar
    // conversion of the anchor instant), then resolve the label's exact
    // cutoff-to-cutoff bounds via businessDateQueryRange — NOT
    // businessDayRange(date, cutoff), which re-applies cutoff rollover
    // directly to the anchor and can land on the WRONG business day when
    // the anchor (e.g. a synthetic "noon" placeholder from a resolved
    // label upstream) happens to fall before a late cutoff time (e.g.
    // 15:00 WAT) even though "today" has already rolled over by the time
    // this is actually queried.
    const label = watCalendarDateKey(date);
    const { legacyStart: dayStart, legacyEnd: dayEnd } = businessDateQueryRange(
      label,
      label,
      cutoff
    );

    // Compare against the END of the business day, not the start — a seed
    // recorded partway through today's business day (e.g. 2pm) must still
    // count as "seeded" for a query on today's date, even though today's
    // day-start (e.g. 3am) is earlier than the seed's precise instant.
    if (!earliestSeed || dayEnd < earliestSeed) {
      return {
        seeded: false,
        openingPosition: 0,
        cashIn: 0,
        cashOutExpenses: 0,
        cashOutDeposits: 0,
        closingPosition: 0,
      };
    }

    const openingAsOf = new Date(dayStart.getTime() - 1);
    const openingPosition = await this.computePositionAsOf(
      earliestSeed,
      openingAsOf
    );

    const cashIn = await this.getCashInForRange(dayStart, dayEnd);
    const cashOutExpenses = await this.getCashOutExpensesForRange(
      dayStart,
      dayEnd
    );
    const cashOutDeposits = await this.getCashOutDepositsForRange(
      dayStart,
      dayEnd
    );

    return {
      seeded: true,
      openingPosition,
      cashIn,
      cashOutExpenses,
      cashOutDeposits,
      closingPosition:
        openingPosition + cashIn - cashOutExpenses - cashOutDeposits,
    };
  }

  /**
   * Range variant — opening-of-range → closing-of-range only (no per-day
   * waterfall table; out of scope for this REQ).
   */
  static async getCashPositionForRange(
    start: Date,
    end: Date
  ): Promise<CashPositionSummary> {
    const earliestSeed = await this.getEarliestSeedDate();
    const cutoff = await SystemSettingsService.getBusinessDayCutoff();
    const startLabel = watCalendarDateKey(start);
    const endLabel = watCalendarDateKey(end);
    const { legacyStart: rangeStart, legacyEnd: rangeEnd } =
      businessDateQueryRange(startLabel, endLabel, cutoff);

    // See getCashPositionForDate — compare against the END of the range's
    // last business day, not its start, for the same same-day-seed reason.
    if (!earliestSeed || rangeEnd < earliestSeed) {
      return {
        seeded: false,
        openingPosition: 0,
        cashIn: 0,
        cashOutExpenses: 0,
        cashOutDeposits: 0,
        closingPosition: 0,
      };
    }

    const openingAsOf = new Date(rangeStart.getTime() - 1);
    const openingPosition = await this.computePositionAsOf(
      earliestSeed,
      openingAsOf
    );

    const cashIn = await this.getCashInForRange(rangeStart, rangeEnd);
    const cashOutExpenses = await this.getCashOutExpensesForRange(
      rangeStart,
      rangeEnd
    );
    const cashOutDeposits = await this.getCashOutDepositsForRange(
      rangeStart,
      rangeEnd
    );

    return {
      seeded: true,
      openingPosition,
      cashIn,
      cashOutExpenses,
      cashOutDeposits,
      closingPosition:
        openingPosition + cashIn - cashOutExpenses - cashOutDeposits,
    };
  }

  /** Internal: position as of an arbitrary instant, given the seed date. */
  private static async computePositionAsOf(
    earliestSeed: Date,
    asOf: Date
  ): Promise<number> {
    if (asOf < earliestSeed) return 0;
    const seedTotal = await this.getSeedAndAdjustmentTotal(asOf);
    const cashIn = await this.getCashInForRange(earliestSeed, asOf);
    const cashOutExpenses = await this.getCashOutExpensesForRange(
      earliestSeed,
      asOf
    );
    const cashOutDeposits = await this.getCashOutDepositsForRange(
      earliestSeed,
      asOf
    );
    return seedTotal + cashIn - cashOutExpenses - cashOutDeposits;
  }

  /** Super-admin only — enforced at the action layer. */
  static async recordAdjustment(
    dto: CreateCashPositionAdjustmentDTO
  ): Promise<ICashPositionAdjustment> {
    await connectDB();
    if (dto.amount === 0) {
      throw new Error('Adjustment amount cannot be zero');
    }
    const adjustment = await CashPositionAdjustmentModel.create({
      type: dto.type,
      amount: dto.amount,
      effectiveDate: dto.effectiveDate,
      note: dto.note,
      createdBy: new ObjectId(dto.createdBy),
    });
    return adjustment.toObject();
  }

  static async listAdjustments(): Promise<ICashPositionAdjustment[]> {
    await connectDB();
    return CashPositionAdjustmentModel.find({})
      .sort({ effectiveDate: -1, createdAt: -1 })
      .lean() as Promise<ICashPositionAdjustment[]>;
  }
}
