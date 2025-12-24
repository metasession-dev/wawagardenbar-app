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
import { toast } from '@/hooks/use-toast';
import { deleteTabAction } from '@/app/actions/tabs/tab-actions';

interface DeleteTabDialogProps {
  tabId: string;
  tabNumber: string;
  status: 'open' | 'settling' | 'closed';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderCount: number;
  nonCancelledOrderCount: number;
}

export function DeleteTabDialog({
  tabId,
  tabNumber,
  status,
  paymentStatus,
  orderCount,
  nonCancelledOrderCount,
}: DeleteTabDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const canDelete = status !== 'closed' || paymentStatus !== 'paid';
  const hasNonCancelledOrders = nonCancelledOrderCount > 0;

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteTabAction(tabId);

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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (!canDelete) {
    return (
      <Button variant="destructive" disabled>
        <Trash2 className="mr-2 h-4 w-4" />
        Cannot Delete (Closed/Paid)
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={hasNonCancelledOrders}>
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

        {hasNonCancelledOrders ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cannot delete this tab.</strong>
              <br />
              Please cancel all {nonCancelledOrderCount} order(s) on this tab first before
              deleting.
            </AlertDescription>
          </Alert>
        ) : orderCount > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This tab has {orderCount} cancelled order(s). These orders will remain in the
              system after the tab is deleted.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              This tab has no orders and can be safely deleted.
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting || hasNonCancelledOrders}
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
