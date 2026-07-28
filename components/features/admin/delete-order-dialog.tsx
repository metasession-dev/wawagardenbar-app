'use client';

/**
 * @requirement REQ-096 — Delete-order dialog for admin order management.
 * Mirrors `DeleteTabDialog`'s shell, but offers two independent
 * checkboxes (restock inventory / reverse payment) instead of a single
 * radio choice, since the two are independently selectable (ADR-002).
 */

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
import { deleteOrderAction } from '@/app/actions/admin/order-management-actions';

interface DeleteOrderDialogProps {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  inventoryDeducted: boolean;
  /**
   * When true, the dialog renders a super-admin override flow: the
   * "must be cancelled + unpaid" guard is bypassed and the user picks
   * independently whether to restock inventory and/or reverse payment.
   * The action layer re-enforces the role gate.
   */
  isSuperAdmin?: boolean;
}

export function DeleteOrderDialog({
  orderId,
  orderNumber,
  status,
  paymentStatus,
  inventoryDeducted,
  isSuperAdmin = false,
}: DeleteOrderDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [revertInventory, setRevertInventory] = useState(true);
  const [revertPayment, setRevertPayment] = useState(true);
  const router = useRouter();

  const isLive = status !== 'cancelled' || paymentStatus === 'paid';

  // For super-admin, the live-order guard is overridable. For everyone
  // else, a live order disables the confirm entirely.
  const buttonDisabled = !isSuperAdmin && isLive;
  const confirmDisabled = isDeleting || (!isSuperAdmin && isLive);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const overrideRequired = isSuperAdmin && isLive;
      const result = await deleteOrderAction(
        orderId,
        overrideRequired
          ? {
              superAdminOverride: true,
              revertInventory,
              revertPayment,
            }
          : undefined
      );

      if (result.success) {
        toast({
          title: 'Order deleted',
          description: 'The order has been deleted successfully.',
        });
        setOpen(false);
        router.push('/dashboard/orders');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete order',
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
      <Button variant="destructive" className="w-full" disabled>
        <Trash2 className="mr-2 h-4 w-4" />
        Cannot Delete (Live Order)
      </Button>
    );
  }

  const showOverrideChoices = isSuperAdmin && isLive;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="w-full"
          disabled={!isSuperAdmin && isLive}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Order
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Order {orderNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The order will be hidden from active
            views.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isSuperAdmin && isLive ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Super-admin override.</strong>
              <br />
              {status !== 'cancelled' ? 'This order is not cancelled. ' : ''}
              {paymentStatus === 'paid' ? 'This order is paid. ' : ''}
              Deletion is irreversible.
            </AlertDescription>
          </Alert>
        ) : isLive ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cannot delete this order.</strong>
              <br />
              Only a cancelled, unpaid order can be deleted. Cancel it first.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              This order is cancelled and unpaid, and can be safely deleted.
            </AlertDescription>
          </Alert>
        )}

        {showOverrideChoices && (
          <div className="space-y-2">
            <Label
              htmlFor="revert-inventory"
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors font-normal ${
                revertInventory
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <Checkbox
                id="revert-inventory"
                checked={revertInventory}
                onCheckedChange={(checked) =>
                  setRevertInventory(checked === true)
                }
                disabled={!inventoryDeducted}
                className="mt-0.5"
              />
              <span className="flex-1">
                <span className="font-semibold">Restock inventory</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {inventoryDeducted
                    ? 'Restore stock for this order and mark it cancelled.'
                    : 'No inventory was deducted for this order.'}
                </span>
              </span>
            </Label>
            <Label
              htmlFor="revert-payment"
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors font-normal ${
                revertPayment
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <Checkbox
                id="revert-payment"
                checked={revertPayment}
                onCheckedChange={(checked) =>
                  setRevertPayment(checked === true)
                }
                disabled={paymentStatus !== 'paid'}
                className="mt-0.5"
              />
              <span className="flex-1">
                <span className="font-semibold">Reverse payment</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {paymentStatus === 'paid'
                    ? 'Mark the order refunded so reports exclude it. The actual refund is processed manually — this only corrects reporting.'
                    : 'This order is not paid.'}
                </span>
              </span>
            </Label>
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
            Delete Order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
