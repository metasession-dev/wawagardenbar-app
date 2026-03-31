/**
 * @requirement REQ-015 - Staff Pot tracker client component
 */
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PiggyBank,
  TrendingUp,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Target,
} from 'lucide-react';
import {
  getStaffPotDataAction,
  getStaffPotChecklistAction,
  finalizeStaffPotMonthAction,
  type StaffPotChecklist,
} from '@/app/actions/admin/staff-pot-actions';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface DailyEntry {
  date: string;
  revenue: number;
  target: number;
  surplus: number;
  contribution: number;
}

interface StaffPotData {
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
  dailyEntries: DailyEntry[];
  config: {
    dailyTarget: number;
    bonusPercentage: number;
    kitchenSplitRatio: number;
    barSplitRatio: number;
    kitchenStaffCount: number;
    barStaffCount: number;
    inventoryLossEnabled: boolean;
    foodLossThreshold: number;
    drinkLossThreshold: number;
  };
  inventoryLoss?: {
    foodLossPercent: number;
    drinkLossPercent: number;
    foodInventoryValue: number;
    drinkInventoryValue: number;
    foodDeduction: number;
    drinkDeduction: number;
  };
  kitchenDeduction: number;
  barDeduction: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface StaffPotClientProps {
  isSuperAdmin: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function StaffPotClient({ isSuperAdmin }: StaffPotClientProps) {
  const [data, setData] = useState<StaffPotData | null>(null);
  const [checklist, setChecklist] = useState<StaffPotChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const isCurrentMonth =
    selectedMonth === new Date().getMonth() &&
    selectedYear === new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [result, checklistResult] = await Promise.all([
        getStaffPotDataAction(selectedMonth, selectedYear),
        getStaffPotChecklistAction(selectedMonth, selectedYear),
      ]);
      if (result.success && result.data) {
        setData(result.data as unknown as StaffPotData);
      } else {
        setError(result.error || 'Failed to load data');
      }
      if (checklistResult.success && checklistResult.data) {
        setChecklist(checklistResult.data);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  function navigateMonth(direction: -1 | 1) {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    // Don't navigate to future months
    const now = new Date();
    if (
      newYear > now.getFullYear() ||
      (newYear === now.getFullYear() && newMonth > now.getMonth())
    ) {
      return;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Calculating staff pot...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={loadData} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const progressPercent =
    data.totalDaysInMonth > 0
      ? Math.round((data.daysPassed / data.totalDaysInMonth) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Month Navigation + Countdown */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <h3 className="text-2xl font-bold">
                {MONTH_NAMES[data.month]} {data.year}
              </h3>
              {isCurrentMonth ? (
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Day {data.daysPassed} of {data.totalDaysInMonth} —{' '}
                    <span className="font-medium text-foreground">
                      {data.daysRemaining} days remaining
                    </span>
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Completed</p>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth(1)}
              disabled={isCurrentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          {isCurrentMonth && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Month Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary rounded-full h-2.5 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pot</CardTitle>
            <PiggyBank className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.totalPot)}
            </div>
            {isCurrentMonth && data.projectedMonthEndPot > data.totalPot && (
              <p className="text-xs text-muted-foreground">
                Projected: {formatCurrency(data.projectedMonthEndPot)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Qualifying Days
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.qualifyingDays}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                / {data.daysPassed}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Days above {formatCurrency(data.config.dailyTarget)} target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kitchen Team</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.kitchenPerPerson)}
            </div>
            <p className="text-xs text-muted-foreground">
              per person ({data.config.kitchenStaffCount} staff) —{' '}
              {formatCurrency(data.kitchenPayout)} total
            </p>
            {data.kitchenDeduction > 0 && (
              <p className="text-xs text-red-600 mt-1">
                Inventory adjustment: -{formatCurrency(data.kitchenDeduction)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bar Team</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.barPerPerson)}
            </div>
            <p className="text-xs text-muted-foreground">
              per person ({data.config.barStaffCount} staff) —{' '}
              {formatCurrency(data.barPayout)} total
            </p>
            {data.barDeduction > 0 && (
              <p className="text-xs text-red-600 mt-1">
                Inventory adjustment: -{formatCurrency(data.barDeduction)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How It Works — simplified for admins, full details for super-admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSuperAdmin ? (
            <div className="grid gap-2 md:grid-cols-3 text-sm">
              <div>
                <span className="text-muted-foreground">Daily Target:</span>{' '}
                <span className="font-medium">
                  {formatCurrency(data.config.dailyTarget)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Bonus Rate:</span>{' '}
                <span className="font-medium">
                  {data.config.bonusPercentage}% of surplus
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Split:</span>{' '}
                <span className="font-medium">
                  {data.config.kitchenSplitRatio}% Kitchen /{' '}
                  {data.config.barSplitRatio}% Bar
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                When the business exceeds its daily target, a bonus goes into
                the Staff Pot. The pot is split between Kitchen and Bar teams at
                the end of the month. Hit more qualifying days to grow the pot!
              </p>
              {(data.kitchenDeduction > 0 || data.barDeduction > 0) && (
                <p className="text-sm text-muted-foreground">
                  💡 Keep waste low to protect your bonus.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Loss Breakdown */}
      {data.inventoryLoss && data.config.inventoryLossEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSuperAdmin ? 'Inventory Loss Deductions' : 'Inventory Care'}
            </CardTitle>
            <CardDescription>
              {isSuperAdmin
                ? 'Losses above acceptable thresholds are deducted from team pots'
                : 'Looking after stock helps protect your bonus'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuperAdmin ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">
                        Category
                      </th>
                      <th className="text-right py-2 px-3 font-medium">
                        Loss %
                      </th>
                      <th className="text-right py-2 px-3 font-medium">
                        Threshold
                      </th>
                      <th className="text-right py-2 px-3 font-medium">
                        Excess
                      </th>
                      <th className="text-right py-2 px-3 font-medium">
                        Inventory Value
                      </th>
                      <th className="text-right py-2 px-3 font-medium">
                        Deduction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3">Food → Kitchen</td>
                      <td className="text-right py-2 px-3">
                        {data.inventoryLoss.foodLossPercent.toFixed(1)}%
                      </td>
                      <td className="text-right py-2 px-3 text-muted-foreground">
                        {data.config.foodLossThreshold}%
                      </td>
                      <td className="text-right py-2 px-3">
                        {Math.max(
                          0,
                          data.inventoryLoss.foodLossPercent -
                            data.config.foodLossThreshold
                        ).toFixed(1)}
                        %
                      </td>
                      <td className="text-right py-2 px-3">
                        {formatCurrency(data.inventoryLoss.foodInventoryValue)}
                      </td>
                      <td className="text-right py-2 px-3 font-medium text-red-600">
                        {data.kitchenDeduction > 0
                          ? `-${formatCurrency(data.kitchenDeduction)}`
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Drinks → Bar</td>
                      <td className="text-right py-2 px-3">
                        {data.inventoryLoss.drinkLossPercent.toFixed(1)}%
                      </td>
                      <td className="text-right py-2 px-3 text-muted-foreground">
                        {data.config.drinkLossThreshold}%
                      </td>
                      <td className="text-right py-2 px-3">
                        {Math.max(
                          0,
                          data.inventoryLoss.drinkLossPercent -
                            data.config.drinkLossThreshold
                        ).toFixed(1)}
                        %
                      </td>
                      <td className="text-right py-2 px-3">
                        {formatCurrency(data.inventoryLoss.drinkInventoryValue)}
                      </td>
                      <td className="text-right py-2 px-3 font-medium text-red-600">
                        {data.barDeduction > 0
                          ? `-${formatCurrency(data.barDeduction)}`
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <p className="text-sm">
                    Every month, we check how much stock went missing. A little
                    bit of loss is normal — but if it goes over the allowed
                    limit, the extra amount gets taken off the team&apos;s
                    bonus.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Think of it like a bucket with a small hole. A few drops
                    leaking out is fine, but if the hole gets bigger, you lose
                    more water. The goal is to keep the hole as small as
                    possible so more bonus stays in the pot!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Food / Kitchen card */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Food (Kitchen)
                      </span>
                      {data.kitchenDeduction > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Over limit
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Looking good
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">
                        {data.inventoryLoss.foodLossPercent.toFixed(1)}%
                      </span>
                      <span className="text-sm text-muted-foreground mb-0.5">
                        lost this month
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          data.inventoryLoss.foodLossPercent >
                          data.config.foodLossThreshold
                            ? 'bg-red-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (data.inventoryLoss.foodLossPercent / Math.max(data.config.foodLossThreshold * 3, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Allowed: up to {data.config.foodLossThreshold}%
                      {data.kitchenDeduction > 0 && (
                        <span className="text-red-600 font-medium">
                          {' '}
                          — deduction: -{formatCurrency(data.kitchenDeduction)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Drinks / Bar card */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Drinks (Bar)</span>
                      {data.barDeduction > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Over limit
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Looking good
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">
                        {data.inventoryLoss.drinkLossPercent.toFixed(1)}%
                      </span>
                      <span className="text-sm text-muted-foreground mb-0.5">
                        lost this month
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          data.inventoryLoss.drinkLossPercent >
                          data.config.drinkLossThreshold
                            ? 'bg-red-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (data.inventoryLoss.drinkLossPercent / Math.max(data.config.drinkLossThreshold * 3, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Allowed: up to {data.config.drinkLossThreshold}%
                      {data.barDeduction > 0 && (
                        <span className="text-red-600 font-medium">
                          {' '}
                          — deduction: -{formatCurrency(data.barDeduction)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily view — admins see simple calendar, super-admins see full table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isSuperAdmin ? 'Daily Breakdown' : 'Qualifying Days'}
          </CardTitle>
          <CardDescription>
            {isSuperAdmin
              ? 'Revenue performance against daily target'
              : 'Days the business exceeded the daily target'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.dailyEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No data yet for this month
            </p>
          ) : isSuperAdmin ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-right py-2 px-3 font-medium">
                      Revenue
                    </th>
                    <th className="text-right py-2 px-3 font-medium">Target</th>
                    <th className="text-right py-2 px-3 font-medium">
                      Surplus / Deficit
                    </th>
                    <th className="text-right py-2 px-3 font-medium">
                      Pot Contribution
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyEntries.map((entry, i) => {
                    const isAbove = entry.surplus > 0;
                    return (
                      <tr
                        key={i}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2 px-3">
                          {new Date(entry.date).toLocaleDateString('en-NG', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="text-right py-2 px-3">
                          {formatCurrency(entry.revenue)}
                        </td>
                        <td className="text-right py-2 px-3 text-muted-foreground">
                          {formatCurrency(entry.target)}
                        </td>
                        <td className="text-right py-2 px-3">
                          <Badge
                            variant={isAbove ? 'default' : 'destructive'}
                            className="font-mono"
                          >
                            {isAbove ? '+' : ''}
                            {formatCurrency(entry.revenue - entry.target)}
                          </Badge>
                        </td>
                        <td className="text-right py-2 px-3 font-medium">
                          {entry.contribution > 0
                            ? formatCurrency(entry.contribution)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="py-2 px-3">Total</td>
                    <td className="text-right py-2 px-3">
                      {formatCurrency(
                        data.dailyEntries.reduce((sum, e) => sum + e.revenue, 0)
                      )}
                    </td>
                    <td className="text-right py-2 px-3"></td>
                    <td className="text-right py-2 px-3"></td>
                    <td className="text-right py-2 px-3 text-green-600">
                      {formatCurrency(data.totalPot)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            /* Admin view: simple grid of qualifying day indicators */
            <div className="grid grid-cols-7 gap-2">
              {data.dailyEntries.map((entry, i) => {
                const isAbove = entry.surplus > 0;
                const dayNum = new Date(entry.date).getDate();
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center rounded-lg p-2 text-xs ${
                      isAbove
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                    title={
                      isAbove
                        ? `Day ${dayNum}: Qualifying day — ${formatCurrency(entry.contribution)} added`
                        : `Day ${dayNum}: Below target`
                    }
                  >
                    <span className="font-semibold">{dayNum}</span>
                    <span>{isAbove ? '✓' : '✗'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Checklist */}
      {checklist && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {isCurrentMonth ? 'Monthly Checklist' : 'Month Status'}
            </CardTitle>
            <CardDescription>
              {isCurrentMonth
                ? 'Complete these before the month ends to ensure accurate payouts'
                : 'Status of data for this month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Recurring monthly tasks */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Every month
                </p>
                <ChecklistItem
                  done={checklist.foodSnapshotSubmitted}
                  label="Food inventory snapshot submitted"
                  hint={
                    checklist.foodSnapshotSubmitted
                      ? undefined
                      : 'Go to Inventory Summary and submit a food count'
                  }
                />
                <ChecklistItem
                  done={checklist.foodSnapshotApproved}
                  label="Food inventory snapshot approved"
                  hint={
                    checklist.foodSnapshotSubmitted &&
                    !checklist.foodSnapshotApproved
                      ? 'A super-admin needs to review and approve the food snapshot'
                      : undefined
                  }
                />
                <ChecklistItem
                  done={checklist.drinkSnapshotSubmitted}
                  label="Drinks inventory snapshot submitted"
                  hint={
                    checklist.drinkSnapshotSubmitted
                      ? undefined
                      : 'Go to Inventory Summary and submit a drinks count'
                  }
                />
                <ChecklistItem
                  done={checklist.drinkSnapshotApproved}
                  label="Drinks inventory snapshot approved"
                  hint={
                    checklist.drinkSnapshotSubmitted &&
                    !checklist.drinkSnapshotApproved
                      ? 'A super-admin needs to review and approve the drinks snapshot'
                      : undefined
                  }
                />
              </div>

              {/* Config / setup tasks */}
              {isSuperAdmin && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Setup (check once, update when things change)
                  </p>
                  <ChecklistItem
                    done={checklist.staffCountsSet}
                    label="Staff counts are set for Kitchen and Bar"
                    hint={
                      !checklist.staffCountsSet
                        ? 'Go to Settings and set the staff counts'
                        : undefined
                    }
                  />
                  <ChecklistItem
                    done={checklist.configReviewed}
                    label="Daily target and bonus percentage configured"
                  />
                  <ChecklistItem
                    done={checklist.inventoryLossEnabled}
                    label="Inventory loss deductions enabled"
                    hint={
                      !checklist.inventoryLossEnabled
                        ? 'Enable in Settings if you want stock losses to affect the pot'
                        : undefined
                    }
                  />
                </div>
              )}

              {/* Finalization — super-admin, past months only */}
              {isSuperAdmin && !isCurrentMonth && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Month-end
                  </p>
                  <ChecklistItem
                    done={checklist.monthFinalized}
                    label={
                      checklist.monthFinalized
                        ? 'Month finalized — data is locked'
                        : 'Month not finalized — data may change if config is updated'
                    }
                  />
                  {!checklist.monthFinalized && (
                    <FinalizeButton
                      month={selectedMonth}
                      year={selectedYear}
                      onFinalized={loadData}
                    />
                  )}
                </div>
              )}

              {/* Summary nudge */}
              {isCurrentMonth && (
                <div className="pt-2">
                  {checklist.foodSnapshotApproved &&
                  checklist.drinkSnapshotApproved &&
                  checklist.staffCountsSet ? (
                    <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>Everything looks good for this month.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Some items are incomplete — the final payout may not
                        reflect inventory losses until snapshots are submitted
                        and approved.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Finalized badge for past months */}
              {!isCurrentMonth && checklist.monthFinalized && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                    <Lock className="h-4 w-4 flex-shrink-0" />
                    <span>
                      This month has been finalized. The data shown is a locked
                      snapshot and won&apos;t change if settings are updated.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  hint,
}: {
  done: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
      ) : (
        <Circle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      )}
      <div>
        <span
          className={`text-sm ${done ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {label}
        </span>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function FinalizeButton({
  month,
  year,
  onFinalized,
}: {
  month: number;
  year: number;
  onFinalized: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleFinalize() {
    setLoading(true);
    const result = await finalizeStaffPotMonthAction(month, year);
    setLoading(false);
    setConfirming(false);
    if (result.success) {
      onFinalized();
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 ml-6">
        <p className="text-xs text-muted-foreground">
          This locks the month&apos;s data permanently. Continue?
        </p>
        <Button
          size="sm"
          variant="default"
          onClick={handleFinalize}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Lock className="h-3 w-3 mr-1" />
          )}
          Confirm
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="ml-6">
      <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
        <Lock className="h-3 w-3 mr-1" />
        Finalize Month
      </Button>
    </div>
  );
}
