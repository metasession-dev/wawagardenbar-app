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
import { getStaffPotDataAction } from '@/app/actions/admin/staff-pot-actions';

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
      const result = await getStaffPotDataAction(selectedMonth, selectedYear);
      if (result.success && result.data) {
        setData(result.data as unknown as StaffPotData);
      } else {
        setError(result.error || 'Failed to load data');
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

      {/* Inventory Loss Breakdown — super-admin only */}
      {isSuperAdmin &&
        data.inventoryLoss &&
        data.config.inventoryLossEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Inventory Loss Deductions
              </CardTitle>
              <CardDescription>
                Losses above acceptable thresholds are deducted from team pots
              </CardDescription>
            </CardHeader>
            <CardContent>
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
    </div>
  );
}
