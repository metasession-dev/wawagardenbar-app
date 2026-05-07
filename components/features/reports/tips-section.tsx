'use client';

/**
 * @requirement REQ-035 — Tips received card grid for the Daily Financial Report.
 *
 * Renders beneath "Revenue by Payment Method". Mirrors the structure of
 * the inline cards in `daily-report-client.tsx` (only render cards
 * where amount > 0; show per-method amount + percentage of total tips).
 *
 * Tips are tracked separately from the revenue breakdown — the headline
 * is "of total tips", not "of total revenue".
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Banknote,
  CreditCard,
  Building2,
  Phone,
  Smartphone,
  HandCoins,
  DollarSign,
} from 'lucide-react';

export type TipsBreakdown = {
  cash: number;
  card: number;
  transfer: number;
  ussd: number;
  phone: number;
  unspecified: number;
  total: number;
};

type Props = {
  breakdown: TipsBreakdown | undefined | null;
  formatCurrency: (n: number) => string;
};

export function TipsSection({ breakdown, formatCurrency }: Props) {
  // Hide the section entirely when nothing was tipped — keeps the
  // report clean for low-tip days.
  if (!breakdown || breakdown.total <= 0) return null;

  const total = breakdown.total || 1;
  const pct = (n: number) => ((n / total) * 100).toFixed(1);

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <HandCoins className="h-5 w-5 text-amber-600" />
        Tips Received
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {formatCurrency(breakdown.total)} total
        </span>
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {breakdown.cash > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash tips</CardTitle>
              <Banknote className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(breakdown.cash)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pct(breakdown.cash)}% of total tips
              </p>
            </CardContent>
          </Card>
        )}
        {breakdown.card > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                POS / Card tips
              </CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(breakdown.card)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pct(breakdown.card)}% of total tips
              </p>
            </CardContent>
          </Card>
        )}
        {breakdown.transfer > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Transfer tips
              </CardTitle>
              <Building2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(breakdown.transfer)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pct(breakdown.transfer)}% of total tips
              </p>
            </CardContent>
          </Card>
        )}
        {breakdown.ussd > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">USSD tips</CardTitle>
              <Phone className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(breakdown.ussd)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pct(breakdown.ussd)}% of total tips
              </p>
            </CardContent>
          </Card>
        )}
        {breakdown.phone > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phone tips</CardTitle>
              <Smartphone className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(breakdown.phone)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pct(breakdown.phone)}% of total tips
              </p>
            </CardContent>
          </Card>
        )}
        {breakdown.unspecified > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unspecified tips
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(breakdown.unspecified)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pct(breakdown.unspecified)}% of total tips
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
