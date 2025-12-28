'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Truck,
  UtensilsCrossed,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { verifyPayment } from '@/app/actions/payment/payment-actions';
import { useToast } from '@/hooks/use-toast';

interface OrderStatusProps {
  order: any;
}

export function OrderStatus({ order }: OrderStatusProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const currentOrder = order;

  async function handleVerifyPayment() {
    if (!currentOrder.paymentReference) return;

    setIsVerifying(true);
    const result = await verifyPayment(currentOrder.paymentReference);

    if (result.success && result.data) {
      toast({
        title: 'Payment Verified',
        description: `Payment status: ${result.data.paymentStatus}`,
      });

      // Refresh page to get updated order
      router.refresh();
    } else {
      toast({
        title: 'Verification Failed',
        description: result.message || 'Could not verify payment',
        variant: 'destructive',
      });
    }

    setIsVerifying(false);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'paid':
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'ready':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  }

  function getOrderTypeIcon(type: string) {
    switch (type) {
      case 'dine-in':
        return <UtensilsCrossed className="h-5 w-5" />;
      case 'pickup':
        return <Package className="h-5 w-5" />;
      case 'delivery':
        return <Truck className="h-5 w-5" />;
      default:
        return null;
    }
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  }

  const isPaid = currentOrder.paymentStatus === 'paid';
  const isPending = currentOrder.paymentStatus === 'pending';
  const isFailed = currentOrder.paymentStatus === 'failed' || currentOrder.paymentStatus === 'cancelled';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/menu')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Menu
        </Button>
        {isPending && (
          <Button
            variant="outline"
            onClick={handleVerifyPayment}
            disabled={isVerifying}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
            Verify Payment
          </Button>
        )}
      </div>

      {/* Order Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order #{currentOrder.orderNumber || currentOrder.id?.slice(-8)}</CardTitle>
            <Badge className={getStatusColor(currentOrder.paymentStatus)}>
              {getStatusIcon(currentOrder.paymentStatus)}
              <span className="ml-2 capitalize">{currentOrder.paymentStatus}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Status Message */}
          {isPaid && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Payment Successful!
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Your order has been confirmed and is being prepared.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPending && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
              <div className="flex gap-3">
                <Clock className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Payment Pending
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Please complete your payment to confirm your order.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
              <div className="flex gap-3">
                <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">
                    Payment Failed
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Your payment could not be processed. Please try again.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Order Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Order Details</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Order Type</p>
                <div className="flex items-center gap-2 mt-1">
                  {getOrderTypeIcon(currentOrder.orderType)}
                  <span className="font-medium capitalize">{currentOrder.orderType}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Order Status</p>
                <Badge className={`mt-1 ${getStatusColor(currentOrder.status)}`}>
                  {currentOrder.status}
                </Badge>
              </div>

              {currentOrder.guestName && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium mt-1">{currentOrder.guestName}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium mt-1">{currentOrder.guestEmail}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-4">
            <h3 className="font-semibold">Items</h3>
            <div className="space-y-3">
              {currentOrder.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      {item.portionSize === 'half' && (
                        <Badge variant="secondary" className="text-xs">Half</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x {formatPrice(item.price)}
                    </p>
                    {item.specialInstructions && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  <span className="font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(currentOrder.subtotal)}</span>
            </div>

            {currentOrder.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>{formatPrice(currentOrder.deliveryFee)}</span>
              </div>
            )}

            {currentOrder.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(currentOrder.tax)}</span>
              </div>
            )}

            {currentOrder.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatPrice(currentOrder.discount)}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(currentOrder.total)}</span>
            </div>
          </div>

          {/* Actions */}
          {isFailed && (
            <Button className="w-full" onClick={() => router.push('/checkout')}>
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
