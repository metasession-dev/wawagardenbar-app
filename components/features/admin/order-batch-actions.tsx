'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { batchUpdateOrdersAction } from '@/app/actions/admin/order-management-actions';
import { useOrderStore } from '@/stores/order-store';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  MoreHorizontal,
  Printer,
  Download,
} from 'lucide-react';

interface OrderBatchActionsProps {
  selectedOrderIds: string[];
}

/**
 * Batch actions toolbar for selected orders
 * Shows when orders are selected
 */
export function OrderBatchActions({
  selectedOrderIds,
}: OrderBatchActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { toast } = useToast();
  const { clearSelection } = useOrderStore();
  const router = useRouter();

  async function handleBatchUpdate(
    action: 'updateStatus' | 'cancel',
    data?: any
  ) {
    setIsProcessing(true);
    try {
      const result = await batchUpdateOrdersAction(
        selectedOrderIds,
        action,
        data
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        clearSelection();
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process batch operation',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBatchCancel() {
    if (!cancelReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a cancellation reason',
        variant: 'destructive',
      });
      return;
    }

    await handleBatchUpdate('cancel', { reason: cancelReason });
    setShowCancelDialog(false);
    setCancelReason('');
  }

  function handlePrintSelected() {
    // Open print dialog with selected orders
    window.print();
  }

  function handleExportSelected() {
    toast({
      title: 'Info',
      description: 'Use the Export button to download selected orders',
    });
  }

  if (selectedOrderIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-4">
          <span className="font-semibold">
            {selectedOrderIds.length}{' '}
            {selectedOrderIds.length === 1 ? 'order' : 'orders'} selected
          </span>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleBatchUpdate('updateStatus', { status: 'preparing' })
              }
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Start Preparing
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleBatchUpdate('updateStatus', { status: 'ready' })
              }
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Ready
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                handleBatchUpdate('updateStatus', { status: 'completed' })
              }
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </>
              )}
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePrintSelected}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSelected}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowCancelDialog(true)}
                  className="text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Selection */}
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Orders</DialogTitle>
            <DialogDescription>
              You are about to cancel {selectedOrderIds.length}{' '}
              {selectedOrderIds.length === 1 ? 'order' : 'orders'}. Please
              provide a reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Customer requested, Out of stock, etc."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchCancel}
              disabled={isProcessing || !cancelReason.trim()}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancel Orders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
