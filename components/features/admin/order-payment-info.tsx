'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';

interface OrderPaymentInfoProps {
  order: any;
}

/**
 * Order payment information component
 * Displays payment method, status, and transaction details
 */
export function OrderPaymentInfo({ order }: OrderPaymentInfoProps) {
  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Status */}
        <div>
          <p className="text-sm font-medium mb-2">Status</p>
          <Badge
            variant={getPaymentStatusVariant(order.paymentStatus)}
            className="flex items-center gap-1 w-fit"
          >
            {getPaymentStatusIcon(order.paymentStatus)}
            <span className="capitalize">{order.paymentStatus}</span>
          </Badge>
        </div>

        {/* Payment Method */}
        <div>
          <p className="text-sm font-medium">Payment Method</p>
          <p className="text-sm text-muted-foreground capitalize">
            {order.paymentMethod || 'N/A'}
          </p>
        </div>

        {/* Payment Reference */}
        {order.paymentReference && (
          <div>
            <p className="text-sm font-medium">Reference</p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {order.paymentReference}
            </p>
          </div>
        )}

        {/* Transaction Time */}
        {order.paidAt && (
          <div>
            <p className="text-sm font-medium">Transaction Time</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.paidAt), 'PPp')}
            </p>
          </div>
        )}

        {/* Amount */}
        <div>
          <p className="text-sm font-medium">Amount</p>
          <p className="text-lg font-bold">₦{order.total.toLocaleString()}</p>
        </div>

        {/* REQ-035/REQ-036 — tip + method, when present. */}
        {order.tipAmount > 0 && (
          <div>
            <p className="text-sm font-medium">Tip</p>
            <p className="text-base font-semibold">
              ₦{order.tipAmount.toLocaleString()}
              {(order.tipPaymentMethod || order.paymentMethod) && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  via{' '}
                  <span className="capitalize">
                    {(order.tipPaymentMethod || order.paymentMethod) === 'card'
                      ? 'POS / Card'
                      : order.tipPaymentMethod || order.paymentMethod}
                  </span>
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
