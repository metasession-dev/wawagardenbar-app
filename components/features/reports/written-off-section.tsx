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
};

type Props = {
  writtenOff: WrittenOffSummary | undefined | null;
  formatCurrency: (n: number) => string;
};

export function WrittenOffSection({ writtenOff, formatCurrency }: Props) {
  const count = writtenOff?.count ?? 0;
  const totalAmount = writtenOff?.totalAmount ?? 0;

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
        </CardContent>
      </Card>
    </div>
  );
}
