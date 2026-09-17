'use client';

/**
 * @requirement REQ-106 — "Current Cash Position" section for the Daily
 * Report. Mirrors `WrittenOffSection`'s always-render pattern: never
 * hidden, always has a defined state (including "not yet seeded"), so an
 * absent opening balance is never ambiguous with "not implemented".
 */
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface CashPositionSummary {
  seeded: boolean;
  openingPosition: number;
  cashIn: number;
  cashOutExpenses: number;
  cashOutDeposits: number;
  adjustments: number;
  closingPosition: number;
}

type Props = {
  cashPosition: CashPositionSummary | undefined | null;
  isSuperAdmin: boolean;
  onAdjust: () => void;
  formatCurrency: (n: number) => string;
};

export function CashPositionSection({
  cashPosition,
  isSuperAdmin,
  onAdjust,
  formatCurrency,
}: Props) {
  return (
    <div className="space-y-3" data-testid="cash-position-section">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Wallet className="h-5 w-5 text-muted-foreground" />
        Current Cash Position
      </h3>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {cashPosition?.seeded
              ? 'Live till balance, as of now'
              : 'Not yet tracked'}
          </CardTitle>
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAdjust}
              data-testid="cash-position-adjust-button"
            >
              {cashPosition?.seeded ? 'Adjust Position' : 'Set Opening Balance'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!cashPosition?.seeded ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="cash-position-not-seeded"
            >
              Opening balance not yet set — Current Cash Position is not tracked
              before an opening balance is entered.
              {isSuperAdmin
                ? ' Use "Set Opening Balance" to start tracking.'
                : ' Ask a super-admin to set the opening balance.'}
            </p>
          ) : (
            <div className="space-y-1.5" data-testid="cash-position-summary">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opening Position</span>
                <span data-testid="cash-position-opening">
                  {formatCurrency(cashPosition.openingPosition)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">+ Cash In (Sales)</span>
                <span
                  className="text-green-700"
                  data-testid="cash-position-cash-in"
                >
                  {formatCurrency(cashPosition.cashIn)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  − Cash Out (Expenses)
                </span>
                <span
                  className="text-destructive"
                  data-testid="cash-position-cash-out-expenses"
                >
                  {formatCurrency(cashPosition.cashOutExpenses)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  − Cash Out (Deposits)
                </span>
                <span
                  className="text-destructive"
                  data-testid="cash-position-cash-out-deposits"
                >
                  {formatCurrency(cashPosition.cashOutDeposits)}
                </span>
              </div>
              {cashPosition.adjustments !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {cashPosition.adjustments > 0
                      ? '+ Adjustments'
                      : '− Adjustments'}
                  </span>
                  <span
                    className={
                      cashPosition.adjustments > 0
                        ? 'text-green-700'
                        : 'text-destructive'
                    }
                    data-testid="cash-position-adjustments"
                  >
                    {formatCurrency(Math.abs(cashPosition.adjustments))}
                  </span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t pt-2 text-lg font-semibold">
                <span>Current Position</span>
                <span data-testid="cash-position-closing">
                  {formatCurrency(cashPosition.closingPosition)}
                </span>
              </div>
              <div className="pt-1 text-right">
                <Link
                  href="/dashboard/finance/cash-position"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  data-testid="cash-position-view-details-link"
                >
                  View full breakdown →
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
