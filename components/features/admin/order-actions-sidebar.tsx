'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useOrderSocket } from '@/hooks/use-order-socket';
import { updateOrderStatusAction } from '@/app/actions/admin/order-management-actions';
import { AddOrderNoteDialog } from './add-order-note-dialog';
import { CancelOrderDialog } from './cancel-order-dialog';
import { AdminPayOrderDialog } from './orders/admin-pay-order-dialog';
import {
  Settings,
  Loader2,
  CheckCircle,
  Printer,
  RefreshCw,
  Mail,
  Phone,
  MessageSquare,
  XCircle,
  CreditCard,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OrderActionsSidebarProps {
  order: any;
}

/**
 * Order actions sidebar component
 * Displays action buttons for order management
 */
export function OrderActionsSidebar({ order: initialOrder }: OrderActionsSidebarProps) {
  const [order, setOrder] = useState(initialOrder);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Real-time updates
  useOrderSocket(order._id);

  // Sync with prop changes
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  const canTransitionTo = (currentStatus: string, newStatus: string) => {
    const transitions: Record<string, string[]> = {
      pending: ['preparing', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    return transitions[currentStatus]?.includes(newStatus);
  };

  // Check if order is part of a settling tab
  const isPartOfSettlingTab = order.tabId && order.tab?.status === 'settling';

  async function handleStatusUpdate(newStatus: string) {
    setIsUpdating(true);
    try {
      const result = await updateOrderStatusAction(order._id, newStatus);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
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
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleRefresh() {
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Process Payment Button - Only for unpaid orders */}
          {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
            <Button
              className="w-full"
              onClick={() => setShowPaymentDialog(true)}
              disabled={isUpdating}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Process Payment
            </Button>
          )}

          {/* Status Transition Buttons */}
          {canTransitionTo(order.status, 'preparing') && (
            <Button
              className="w-full"
              onClick={() => handleStatusUpdate('preparing')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Loader2 className="mr-2 h-4 w-4" />
              )}
              Start Preparing
            </Button>
          )}

          {canTransitionTo(order.status, 'ready') && (
            <Button
              className="w-full"
              onClick={() => handleStatusUpdate('ready')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Mark as Ready
            </Button>
          )}

          {canTransitionTo(order.status, 'completed') && (
            <Button
              className="w-full"
              onClick={() => handleStatusUpdate('completed')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Complete Order
            </Button>
          )}

          {/* Add Note */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNoteDialog(true)}
            disabled={order.status === 'completed' || order.status === 'cancelled'}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Add Note
          </Button>

          {/* Cancel Order - Only for unpaid orders not in settling tabs */}
          {canTransitionTo(order.status, 'cancelled') && order.paymentStatus !== 'paid' && (
            <div className="space-y-2">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowCancelDialog(true)}
                disabled={isUpdating || isPartOfSettlingTab}
                title={isPartOfSettlingTab ? 'Cannot cancel orders from settling tabs' : ''}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Order
              </Button>
              {isPartOfSettlingTab && (
                <p className="text-xs text-muted-foreground text-center">
                  Cannot cancel orders from tabs in settling status
                </p>
              )}
            </div>
          )}

          {/* Utility Actions */}
          <div className="pt-3 border-t space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handlePrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            {/* Contact Customer */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Phone className="mr-2 h-4 w-4" />
                  Contact Customer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {order.customer?.email && (
                  <DropdownMenuItem asChild>
                    <a href={`mailto:${order.customer.email}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email Customer
                    </a>
                  </DropdownMenuItem>
                )}
                {order.customer?.phone && (
                  <DropdownMenuItem asChild>
                    <a href={`tel:${order.customer.phone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call Customer
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddOrderNoteDialog
        orderId={order._id}
        open={showNoteDialog}
        onOpenChange={setShowNoteDialog}
      />

      <CancelOrderDialog
        orderId={order._id}
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
      />

      <AdminPayOrderDialog
        orderId={order._id}
        orderNumber={order.orderNumber}
        totalAmount={order.total}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
