'use client';

import { useState, useEffect } from 'react';
import { Clock, Wifi, WifiOff } from 'lucide-react';
import { IOrder, OrderStatus } from '@/interfaces';
import { useOrderSocket } from '@/hooks/use-order-socket';
import { OrderStatusTracker } from './order-status-tracker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RealTimeOrderTrackerProps {
  order: IOrder;
  className?: string;
}

/**
 * Real-time order tracking component with WebSocket updates
 */
export function RealTimeOrderTracker({ order, className }: RealTimeOrderTrackerProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order.status);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(order.estimatedWaitTime);
  const [lastUpdateNote, setLastUpdateNote] = useState<string | undefined>();

  const { isConnected } = useOrderSocket({
    orderId: order._id.toString(),
    onStatusUpdate: (update) => {
      if (update.orderId === order._id.toString()) {
        setCurrentStatus(update.status);
        
        if (update.estimatedWaitTime !== undefined) {
          setEstimatedWaitTime(update.estimatedWaitTime);
        }
        
        if (update.note) {
          setLastUpdateNote(update.note);
        }
      }
    },
  });

  // Update status if order prop changes
  useEffect(() => {
    setCurrentStatus(order.status);
    setEstimatedWaitTime(order.estimatedWaitTime);
  }, [order.status, order.estimatedWaitTime]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Live updates active</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Connecting...</span>
            </>
          )}
        </div>
        
        {currentStatus !== 'cancelled' && currentStatus !== 'completed' && (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            <span>{estimatedWaitTime} min</span>
          </Badge>
        )}
      </div>

      {/* Order info */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between" data-testid="order-summary">
          <div>
            <h3 className="font-semibold" data-testid="order-number">
              Order #{order.orderNumber}
            </h3>
            <p className="text-sm text-muted-foreground">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">₦{order.total.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {order.orderType.replace('-', ' ')}
            </p>
          </div>
        </div>
        
        {lastUpdateNote && (
          <div className="mt-3 rounded-md bg-muted p-3">
            <p className="text-sm">{lastUpdateNote}</p>
          </div>
        )}
      </div>

      {/* Status tracker */}
      <OrderStatusTracker
        currentStatus={currentStatus}
        orderType={order.orderType}
      />

      {/* Order items summary */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="mb-3 font-semibold">Order Items</h4>
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-start justify-between text-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {item.quantity}x {item.name}
                  </p>
                  {item.portionSize === 'half' && (
                    <Badge variant="secondary" className="text-xs">Half</Badge>
                  )}
                  {item.portionSize === 'quarter' && (
                    <Badge variant="secondary" className="text-xs">Quarter</Badge>
                  )}
                </div>
                {item.specialInstructions && (
                  <p className="text-xs text-muted-foreground">
                    Note: {item.specialInstructions}
                  </p>
                )}
              </div>
              <p className="font-medium">₦{item.subtotal.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery/Pickup details */}
      {order.orderType === 'delivery' && order.deliveryDetails && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-2 font-semibold">Delivery Address</h4>
          <p className="text-sm text-muted-foreground">
            {order.deliveryDetails.address.street}, {order.deliveryDetails.address.city}
          </p>
          {order.deliveryDetails.deliveryInstructions && (
            <p className="mt-2 text-sm">
              <span className="font-medium">Instructions:</span>{' '}
              {order.deliveryDetails.deliveryInstructions}
            </p>
          )}
        </div>
      )}

      {order.orderType === 'pickup' && order.pickupDetails && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-2 font-semibold">Pickup Time</h4>
          <p className="text-sm text-muted-foreground">
            {new Date(order.pickupDetails.preferredPickupTime).toLocaleString()}
          </p>
        </div>
      )}

      {order.orderType === 'dine-in' && order.dineInDetails && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-2 font-semibold">Table Number</h4>
          <p className="text-2xl font-bold">{order.dineInDetails.tableNumber}</p>
        </div>
      )}
    </div>
  );
}
