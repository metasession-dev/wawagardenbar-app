'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { retryInventoryDeductionAction } from '@/app/actions/admin/incidents-actions';

/**
 * @requirement REQ-066 AC10 — per-row "Retry now" affordance on
 * /dashboard/incidents. Fires `retryInventoryDeductionAction(orderId)`
 * and surfaces the same toast pattern as AC9's `updateOrderStatusAction`
 * (green Success, destructive Warning, destructive Error).
 *
 * Idempotency: the underlying chokepoint guards on `inventoryDeducted`,
 * so multiple clicks are safe. The button disables while in flight.
 */
export function IncidentRetryButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  function onClick() {
    startTransition(async () => {
      const result = await retryInventoryDeductionAction(orderId);

      if (result.success) {
        if (result.warning) {
          toast({
            title: 'Still failing — inventory not deducted',
            description: `${result.warning} Move stock to the sale point before clicking Retry again.`,
            variant: 'destructive',
            duration: 12000,
          });
        } else {
          toast({
            title: 'Inventory deducted',
            description: result.message,
          });
          setDone(true);
        }
        router.refresh();
      } else {
        toast({
          title: 'Retry failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  }

  if (done) {
    return <span className="text-xs text-muted-foreground">✓ Deducted</span>;
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={isPending}
      aria-label={`Retry inventory deduction for order ${orderId}`}
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Retry now'}
    </Button>
  );
}
