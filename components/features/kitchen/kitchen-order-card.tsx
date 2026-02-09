'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateOrderStatusAction } from '@/app/actions/admin/order-management-actions';
import { Clock, User, Loader2, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { useRouter } from 'next/navigation';

interface KitchenOrderCardProps {
  order: any;
}

/**
 * Kitchen order card component
 * Large, readable display for kitchen staff
 */
export function KitchenOrderCard({ order }: KitchenOrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderAge, setOrderAge] = useState(0);
  const [pickupInfo, setPickupInfo] = useState<{ pickupLabel: string; countdownLabel: string; isOverdue: boolean } | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Update order age every minute
  useEffect(() => {
    function updateAge() {
      const age = differenceInMinutes(new Date(), new Date(order.createdAt));
      setOrderAge(age);
    }

    updateAge();
    const interval = setInterval(updateAge, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [order.createdAt]);

  useEffect(() => {
    if (order.orderType !== 'pickup' || !order.pickupTime) {
      setPickupInfo(null);
      return;
    }
    function updatePickupTiming() {
      const pickupDate = new Date(order.pickupTime);
      const diffMinutes = differenceInMinutes(pickupDate, new Date());
      const isOverdue = diffMinutes < 0;
      const absoluteMinutes = Math.abs(diffMinutes);
      const countdownLabel =
        absoluteMinutes < 1 ? 'due now' : isOverdue ? `${absoluteMinutes} min overdue` : `${absoluteMinutes} min left`;
      setPickupInfo({
        pickupLabel: format(pickupDate, 'h:mm a'),
        countdownLabel,
        isOverdue,
      });
    }
    updatePickupTiming();
    const interval = setInterval(updatePickupTiming, 60000);
    return () => clearInterval(interval);
  }, [order.orderType, order.pickupTime]);

  // Get color based on order age
  function getAgeColor() {
    if (orderAge < 15) return 'bg-green-900 border-green-700';
    if (orderAge < 30) return 'bg-yellow-900 border-yellow-700';
    return 'bg-red-900 border-red-700';
  }

  // Get priority badge
  function getPriorityBadge() {
    if (order.kitchenPriority === 'urgent' || orderAge >= 30) {
      return (
        <Badge variant="destructive" className="text-lg px-3 py-1">
          <AlertCircle className="h-5 w-5 mr-2" />
          URGENT
        </Badge>
      );
    }
    return null;
  }

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

  return (
    <Card className={`${getAgeColor()} border-2 transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">{order.orderNumber}</h2>
            <div className="flex items-center gap-3 text-gray-300">
              <span className="text-xl">
                {order.orderType === 'dine-in' && '🍽️ Dine-in'}
                {order.orderType === 'pickup' && '🛍️ Pickup'}
                {order.orderType === 'delivery' && '🚚 Delivery'}
              </span>
              {pickupInfo && (
                <div className="flex items-center gap-2 text-lg">
                  <span>{pickupInfo.pickupLabel}</span>
                  <span className={`font-semibold ${pickupInfo.isOverdue ? 'text-red-300' : 'text-emerald-300'}`}>
                    {pickupInfo.countdownLabel}
                  </span>
                </div>
              )}
              {order.tableNumber && (
                <span className="text-xl font-semibold">Table {order.tableNumber}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            {getPriorityBadge()}
            <div className="flex items-center gap-2 text-gray-300 mt-2">
              <Clock className="h-5 w-5" />
              <span className="text-xl font-semibold">{orderAge} min</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="flex items-center gap-2 text-gray-300">
          <User className="h-5 w-5" />
          <span className="text-xl">{order.customer.name}</span>
        </div>

        {/* Order Items */}
        <div className="space-y-2">
          {order.items.map((item: any, index: number) => {
            let quantityDisplay = `${item.quantity}x`;
            if (item.portionSize === 'half') {
              quantityDisplay = `${item.quantity} × 1/2x`;
            } else if (item.portionSize === 'quarter') {
              quantityDisplay = `${item.quantity} × 1/4x`;
            }
            
            return (
              <div
                key={index}
                className="flex items-start justify-between bg-gray-800 p-3 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">{quantityDisplay}</span>
                    <span className="text-xl text-white">{item.name}</span>
                  </div>
                  {item.customizations && item.customizations.length > 0 && (
                    <div className="mt-1 ml-12 text-gray-400">
                      {item.customizations.map((custom: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          • {custom.name}: {custom.value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Special Instructions */}
        {order.specialInstructions && (
          <div className="bg-yellow-900 border border-yellow-700 p-3 rounded-lg">
            <p className="text-lg font-semibold text-yellow-200 mb-1">Special Instructions:</p>
            <p className="text-lg text-yellow-100">{order.specialInstructions}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <Button
              size="lg"
              onClick={() => handleStatusUpdate('preparing')}
              disabled={isUpdating}
              className="flex-1 text-xl py-6 bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                'Start Preparing'
              )}
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button
              size="lg"
              onClick={() => handleStatusUpdate('ready')}
              disabled={isUpdating}
              className="flex-1 text-xl py-6 bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                'Mark Ready'
              )}
            </Button>
          )}
          {order.status === 'ready' && (
            <Button
              size="lg"
              onClick={() => handleStatusUpdate('completed')}
              disabled={isUpdating}
              className="flex-1 text-xl py-6 bg-gray-600 hover:bg-gray-700"
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                'Complete Order'
              )}
            </Button>
          )}
        </div>

        {/* Order Time */}
        <div className="text-center text-gray-400 text-sm pt-2">
          Ordered {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  );
}
