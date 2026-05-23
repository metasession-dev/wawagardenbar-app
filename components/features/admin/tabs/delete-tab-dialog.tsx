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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  /**
   * When true, the dialog renders a super-admin override flow: the
   * closed+paid and non-cancelled-order guards are bypassed and the
   * user picks between restocking inventory (Revert items) or leaving
   * orders as-is. The action layer re-enforces the role gate.
   */
  isSuperAdmin?: boolean;
}

type RevertChoice = 'revert' | 'keep';

export function DeleteTabDialog({
  tabId,
  tabNumber,
  status,
  paymentStatus,
  orderCount,
  nonCancelledOrderCount,
  isSuperAdmin = false,
}: DeleteTabDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [revertChoice, setRevertChoice] = useState<RevertChoice>('revert');
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
              revertItems: revertChoice === 'revert',
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

  const showRevertChoice = isSuperAdmin && hasNonCancelledOrders;

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

        {showRevertChoice && (
          <RadioGroup
            value={revertChoice}
            onValueChange={(v) => setRevertChoice(v as RevertChoice)}
            className="gap-3"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem
                value="revert"
                id="revert-items"
                className="mt-1"
              />
              <Label htmlFor="revert-items" className="font-normal">
                <span className="font-medium">Revert items</span>
                <br />
                <span className="text-xs text-muted-foreground">
                  Restock inventory for each order on this tab and cancel those
                  orders.
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="keep" id="keep-items" className="mt-1" />
              <Label htmlFor="keep-items" className="font-normal">
                <span className="font-medium">Leave as-is</span>
                <br />
                <span className="text-xs text-muted-foreground">
                  Orders keep their current status and data. Inventory is not
                  adjusted.
                </span>
              </Label>
            </div>
          </RadioGroup>
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
