'use client';

import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, UtensilsCrossed, ShoppingBag, Truck } from 'lucide-react';

interface OrderDetailsHeaderProps {
  order: any;
}

/**
 * Order details header component
 * Displays order number, status, type, and timing information
 * @requirement REQ-085 - Labeled badges distinguish kitchen status from payment status
 */
export function OrderDetailsHeader({ order }: OrderDetailsHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'confirmed':
        return 'bg-emerald-500';
      case 'preparing':
        return 'bg-blue-500';
      case 'ready':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'confirmed':
        return 'default';
      case 'preparing':
        return 'default';
      case 'ready':
        return 'default';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'dine-in':
        return <UtensilsCrossed className="h-5 w-5" />;
      case 'pickup':
        return <ShoppingBag className="h-5 w-5" />;
      case 'delivery':
        return <Truck className="h-5 w-5" />;
      default:
        return <ShoppingBag className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Side - Order Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${getStatusColor(order.status)}`}
              />
              <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {/* Order Type */}
              <div className="flex items-center gap-2">
                {getOrderTypeIcon(order.orderType)}
                <span className="capitalize">{order.orderType}</span>
              </div>

              {/* Table Number for Dine-in */}
              {order.orderType === 'dine-in' && order.tableNumber && (
                <>
                  <span>•</span>
                  <span>Table {order.tableNumber}</span>
                </>
              )}

              {/* Time Elapsed */}
              <span>•</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(order.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {/* Estimated Completion */}
              {order.estimatedCompletionTime && (
                <>
                  <span>•</span>
                  <span>Est. {order.estimatedCompletionTime} mins</span>
                </>
              )}
            </div>
          </div>

          {/* Right Side - Kitchen + Payment Status Badges */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Kitchen:
              </span>
              <Badge
                variant={getStatusBadgeVariant(order.status)}
                className="text-lg px-4 py-2 capitalize"
                data-testid="order-kitchen-status-badge"
              >
                {order.status}
              </Badge>
            </div>
            {order.paymentStatus && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Payment:
                </span>
                <Badge
                  variant={
                    order.paymentStatus === 'paid' ? 'default' : 'secondary'
                  }
                  className="capitalize"
                  data-testid="order-payment-status-badge"
                >
                  {order.paymentStatus}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
