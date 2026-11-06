'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  CheckCircle,
  Loader2,
  Package,
  XCircle,
  MessageSquare,
} from 'lucide-react';

interface OrderTimelineProps {
  order: any;
}

/**
 * Order timeline component
 * Displays order status history in a vertical timeline
 */
export function OrderTimeline({ order }: OrderTimelineProps) {
  const getStatusIcon = (status: string, isCurrent: boolean) => {
    const iconClass = isCurrent ? 'text-primary' : 'text-muted-foreground';

    switch (status) {
      case 'pending':
        return <Clock className={`h-5 w-5 ${iconClass}`} />;
      case 'confirmed':
        return <CheckCircle className={`h-5 w-5 ${iconClass}`} />;
      case 'preparing':
        return <Loader2 className={`h-5 w-5 ${iconClass}`} />;
      case 'ready':
        return <Package className={`h-5 w-5 ${iconClass}`} />;
      case 'completed':
        return <CheckCircle className={`h-5 w-5 ${iconClass}`} />;
      case 'cancelled':
        return <XCircle className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Clock className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const statusHistory = order.statusHistory || [];
  const currentStatus = order.status;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Vertical Line */}
          <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border" />

          {/* Timeline Items */}
          {statusHistory.map((entry: any, index: number) => {
            const isCurrent = entry.status === currentStatus;
            const isLast = index === statusHistory.length - 1;

            return (
              <div key={index} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                    isCurrent
                      ? 'border-primary bg-background'
                      : 'border-border bg-muted'
                  }`}
                >
                  {getStatusIcon(entry.status, isCurrent)}
                </div>

                {/* Content */}
                <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p
                        className={`font-medium capitalize ${
                          isCurrent
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {entry.status}
                      </p>
                      {entry.note && (
                        <div className="mt-2 flex items-start gap-2 bg-muted/50 p-3 rounded-md border border-border">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-foreground whitespace-pre-line">
                            {entry.note}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
