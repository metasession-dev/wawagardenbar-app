'use client';

/**
 * @requirement REQ-098 AC6 — "Written off (bad debt)" section for the
 * Daily/Period Financial Report.
 *
 * Unlike `TipsSection` (which hides on zero), this section always
 * renders — including a zero state — so a write-off-driven revenue
 * reduction (or its absence) is never ambiguous with "not implemented".
 */
import { FileX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type WrittenOffSummary = {
  count: number;
  totalAmount: number;
  /**
   * @requirement wgb#644 — ingredient/COGS cost of these orders' line
   * items. The kitchen already fulfilled them (inventory deducted in
   * full) before the tab was written off, so this cost was genuinely
   * incurred — it's netted against Net Profit as a real expense, distinct
   * from both `totalAmount` (bad-debt revenue, already excluded above)
   * and regular Direct Costs/Purchases (paid-order COGS).
   */
  totalCost: number;
};

type Props = {
  writtenOff: WrittenOffSummary | undefined | null;
  formatCurrency: (n: number) => string;
};

export function WrittenOffSection({ writtenOff, formatCurrency }: Props) {
  const count = writtenOff?.count ?? 0;
  const totalAmount = writtenOff?.totalAmount ?? 0;
  const totalCost = writtenOff?.totalCost ?? 0;

  return (
    <div className="space-y-3" data-testid="written-off-section">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <FileX className="h-5 w-5 text-muted-foreground" />
        Written Off (Bad Debt)
      </h3>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Orders written off this period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold"
            data-testid="written-off-total-amount"
          >
            {formatCurrency(totalAmount)}
          </div>
          <p
            className="text-xs text-muted-foreground"
            data-testid="written-off-count"
          >
            {count} order{count === 1 ? '' : 's'} reclassified as uncollectible
            bad debt — already excluded from revenue above.
          </p>
          <div className="mt-3 border-t pt-3">
            <div
              className="text-lg font-semibold text-destructive"
              data-testid="written-off-total-cost"
            >
              {formatCurrency(totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Written-off cost of goods — ingredient cost already consumed by
              the kitchen on these orders, netted against Net Profit below as a
              controllable loss (not double-counted in Direct Costs).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
