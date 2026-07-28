'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { deleteTabAction } from '@/app/actions/tabs/tab-actions';

interface DeleteTabDialogProps {
  tabId: string;
  tabNumber: string;
  status: 'open' | 'settling' | 'closed';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderCount: number;
  nonCancelledOrderCount: number;
  /** REQ-096 — whether any linked order is currently paid. */
  hasPaidOrders?: boolean;
  /**
   * REQ-096 — whether the tab has recorded partial/split payments.
   * When true, the "Reverse payment" choice is disabled — that ledger
   * has no reversal concept and must be reconciled manually.
   */
  hasPartialPayments?: boolean;
  /**
   * When true, the dialog renders a super-admin override flow: the
   * closed+paid and non-cancelled-order guards are bypassed and the
   * user picks independently whether to restock inventory and/or
   * reverse payment. The action layer re-enforces the role gate.
   */
  isSuperAdmin?: boolean;
}

export function DeleteTabDialog({
  tabId,
  tabNumber,
  status,
  paymentStatus,
  orderCount,
  nonCancelledOrderCount,
  hasPaidOrders = false,
  hasPartialPayments = false,
  isSuperAdmin = false,
}: DeleteTabDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [revertItems, setRevertItems] = useState(true);
  const [revertPayment, setRevertPayment] = useState(
    hasPaidOrders && !hasPartialPayments
  );
  const router = useRouter();

  const closedPaid = status === 'closed' && paymentStatus === 'paid';
  const hasNonCancelledOrders = nonCancelledOrderCount > 0;

  // For super-admin, both guards are overridable. For everyone else,
  // closed+paid disables the button entirely and non-cancelled orders
  // disable the confirm.
  const buttonDisabled = !isSuperAdmin && closedPaid;
  const confirmDisabled =
    isDeleting || (!isSuperAdmin && hasNonCancelledOrders);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const overrideRequired =
        isSuperAdmin && (closedPaid || hasNonCancelledOrders);
      const result = await deleteTabAction(
        tabId,
        overrideRequired
          ? {
              superAdminOverride: true,
              revertItems,
              revertPayment: revertPayment && !hasPartialPayments,
            }
          : undefined
      );

      if (result.success) {
        toast({
          title: 'Tab deleted',
          description: 'The tab has been deleted successfully.',
        });
        setOpen(false);
        router.push('/dashboard/orders/tabs');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete tab',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (buttonDisabled) {
    return (
      <Button variant="destructive" disabled>
        <Trash2 className="mr-2 h-4 w-4" />
        Cannot Delete (Closed/Paid)
      </Button>
    );
  }

  const showRevertChoices =
    isSuperAdmin && (hasNonCancelledOrders || hasPaidOrders);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          disabled={!isSuperAdmin && hasNonCancelledOrders}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Tab
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Tab {tabNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the tab.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isSuperAdmin && (closedPaid || hasNonCancelledOrders) ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Super-admin override.</strong>
              <br />
              {closedPaid ? 'This tab is closed and paid. ' : ''}
              {hasNonCancelledOrders
                ? `This tab has ${nonCancelledOrderCount} non-cancelled order(s). `
                : ''}
              Deletion is irreversible.
            </AlertDescription>
          </Alert>
        ) : hasNonCancelledOrders ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cannot delete this tab.</strong>
              <br />
              Please cancel all {nonCancelledOrderCount} order(s) on this tab
              first before deleting.
            </AlertDescription>
          </Alert>
        ) : orderCount > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This tab has {orderCount} cancelled order(s). These orders will
              remain in the system after the tab is deleted.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              This tab has no orders and can be safely deleted.
            </AlertDescription>
          </Alert>
        )}

        {showRevertChoices && (
          <div className="space-y-2">
            {hasNonCancelledOrders && (
              <Label
                htmlFor="revert-items"
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors font-normal ${
                  revertItems
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  id="revert-items"
                  checked={revertItems}
                  onCheckedChange={(checked) =>
                    setRevertItems(checked === true)
                  }
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">Restock inventory</span>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      Recommended
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Restock inventory for each order on this tab and cancel
                    those orders. Use this for accidental opens, voided sales,
                    or any delete where the items did not actually leave the
                    bar.
                  </span>
                </span>
              </Label>
            )}
            {hasPaidOrders && (
              <Label
                htmlFor="revert-payment"
                className={`flex items-start gap-3 rounded-md border p-3 font-normal ${
                  hasPartialPayments
                    ? 'cursor-not-allowed border-border opacity-60'
                    : 'cursor-pointer transition-colors'
                } ${
                  revertPayment && !hasPartialPayments
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  id="revert-payment"
                  checked={revertPayment && !hasPartialPayments}
                  onCheckedChange={(checked) =>
                    setRevertPayment(checked === true)
                  }
                  disabled={hasPartialPayments}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="font-semibold">Reverse payment</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {hasPartialPayments
                      ? 'Disabled — this tab has partial/split payments, which must be reconciled manually. The tab can still be deleted.'
                      : "Mark this tab's paid orders refunded so reports exclude them. The actual refund is processed manually — this only corrects reporting."}
                  </span>
                </span>
              </Label>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={confirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Tab
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
