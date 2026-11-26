/**
 * @requirement REQ-PAY-011 — refund history on the staff order page (REQ-128)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { connectDB } from '@/lib/mongodb';
import RefundModel from '@/models/refund-model';
import type { IRefund } from '@/interfaces/refund.interface';

export async function OrderRefundsCard({ orderId }: { orderId: string }) {
  await connectDB();
  const refunds = await RefundModel.find({ orderId })
    .sort({ createdAt: -1 })
    .lean<IRefund[]>();
  if (refunds.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Refunds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {refunds.map((r) => (
          <div
            key={String(r._id)}
            className="space-y-1 border-b pb-2 last:border-0"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                ₦{(r.amountKobo / 100).toLocaleString()} · {r.type}
              </span>
              <Badge
                variant={
                  r.status === 'failed'
                    ? 'destructive'
                    : r.status === 'processed'
                      ? 'default'
                      : 'secondary'
                }
              >
                {r.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {r.reason} · {new Date(r.createdAt).toLocaleString()}
            </div>
            {r.failureReason && (
              <div className="text-xs text-destructive">{r.failureReason}</div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
