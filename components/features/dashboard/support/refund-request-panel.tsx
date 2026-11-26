'use client';

/**
 * @requirement REQ-PAY-013 — Approve or reject a customer's refund request (REQ-128, AC3)
 * Shown only to manager, admin and super-admin; the server actions check again.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  approveRefundRequestAction,
  rejectRefundRequestAction,
} from '@/app/actions/admin/refund-actions';
import { Loader2 } from 'lucide-react';

interface RefundRequestPanelProps {
  ticketId: string;
  orderTotalNaira: number;
}

export function RefundRequestPanel({
  ticketId,
  orderTotalNaira,
}: RefundRequestPanelProps) {
  const [partial, setPartial] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'full' | 'partial' | 'reject' | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  async function run(
    kind: 'full' | 'partial' | 'reject',
    fn: () => Promise<{ success: boolean; message?: string; error?: string }>
  ) {
    setBusy(kind);
    try {
      const result = await fn();
      toast({
        title: result.success ? 'Done' : 'Could not complete',
        description: result.message ?? result.error,
        variant: result.success ? 'default' : 'destructive',
      });
      if (result.success) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="font-semibold">Refund request</h3>
      <p className="text-sm text-muted-foreground">
        The customer asked to cancel after preparation began. Order total: ₦
        {orderTotalNaira.toLocaleString()}. No money moves until you approve.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Button
          disabled={busy !== null}
          onClick={() =>
            run('full', () =>
              approveRefundRequestAction({ ticketId, mode: 'full' })
            )
          }
        >
          {busy === 'full' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Approve full refund
        </Button>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="partial-amount">Partial amount (₦)</Label>
            <Input
              id="partial-amount"
              type="number"
              min="1"
              max={orderTotalNaira}
              value={partial}
              onChange={(e) => setPartial(e.target.value)}
              className="w-32"
            />
          </div>
          <Button
            variant="outline"
            disabled={busy !== null || !(Number(partial) > 0)}
            onClick={() =>
              run('partial', () =>
                approveRefundRequestAction({
                  ticketId,
                  mode: 'partial',
                  amountNaira: Number(partial),
                })
              )
            }
          >
            {busy === 'partial' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Approve partial
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reject-reason">
          Reason to reject (sent to the customer)
        </Label>
        <Textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button
          variant="destructive"
          disabled={busy !== null || !reason.trim()}
          onClick={() =>
            run('reject', () => rejectRefundRequestAction({ ticketId, reason }))
          }
        >
          {busy === 'reject' && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Reject request
        </Button>
      </div>
    </div>
  );
}
