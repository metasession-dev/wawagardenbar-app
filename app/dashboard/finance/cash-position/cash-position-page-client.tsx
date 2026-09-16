'use client';

/**
 * @requirement REQ-106 (amended — AC10) - Cash Position page client: live
 * balance + itemized, reverse-chronological ledger of every transferred
 * cash-method expense, transferred cash deposit, and manual adjustment.
 * Cash sales are shown as a single rolled-up total, not itemized — see
 * `compliance/plans/REQ-106/implementation-plan.md` § "Requirements gap
 * accepted (amended post-UAT, iteration 2)".
 */
import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCashPositionLedgerAction } from '@/app/actions/finance/cash-position-actions';
import { CashPositionAdjustmentDialog } from '@/components/features/finance/cash-position-adjustment-dialog';
import type { CashPositionLedger } from '@/interfaces/cash-position.interface';

interface CashPositionPageClientProps {
  userRole: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

const TYPE_LABELS: Record<string, string> = {
  seed: 'Opening balance',
  correction: 'Manual correction',
  'cash-out-expense': 'Expense transfer',
  'cash-out-deposit': 'Cash deposit',
};

export function CashPositionPageClient({
  userRole,
}: CashPositionPageClientProps) {
  const isSuperAdmin = userRole === 'super-admin';
  const [ledger, setLedger] = useState<CashPositionLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await getCashPositionLedgerAction();
      if (result.success && result.ledger) {
        setLedger(result.ledger);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cash Position</h1>
        <p className="text-muted-foreground">
          Live till balance and every expense, deposit, and manual adjustment
          composing it.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            {ledger?.seeded
              ? 'Live till balance, as of now'
              : 'Not yet tracked'}
          </CardTitle>
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdjustmentDialogOpen(true)}
              data-testid="cash-position-page-adjust-button"
            >
              {ledger?.seeded ? 'Adjust Position' : 'Set Opening Balance'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !ledger?.seeded ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="cash-position-page-not-seeded"
            >
              Opening balance not yet set — Current Cash Position is not tracked
              before an opening balance is entered.
              {isSuperAdmin
                ? ' Use "Set Opening Balance" to start tracking.'
                : ' Ask a super-admin to set the opening balance.'}
            </p>
          ) : (
            <div className="space-y-3">
              <div
                className="text-3xl font-bold"
                data-testid="cash-position-page-current"
              >
                {formatCurrency(ledger.current)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total cash sales in since opening:{' '}
                <span
                  className="font-medium text-green-700"
                  data-testid="cash-position-page-total-cash-in"
                >
                  {formatCurrency(ledger.totalCashIn)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {ledger?.seeded && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Expenses, deposits &amp; adjustments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ledger.entries.length === 0 ? (
              <p
                className="text-sm text-muted-foreground"
                data-testid="cash-position-page-ledger-empty"
              >
                No expenses, deposits, or adjustments yet — the balance above is
                entirely the opening balance plus cash sales.
              </p>
            ) : (
              <div className="divide-y" data-testid="cash-position-page-ledger">
                {ledger.entries.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <p>{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[entry.type] ?? entry.type} ·{' '}
                        {new Date(entry.date).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={
                        entry.amount > 0 ? 'text-green-700' : 'text-destructive'
                      }
                    >
                      {entry.amount > 0 ? '+' : '−'}
                      {formatCurrency(Math.abs(entry.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <CashPositionAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        onSuccess={load}
        seeded={ledger?.seeded ?? false}
        currentPosition={ledger?.current ?? 0}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
