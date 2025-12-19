'use client';

import { CheckCircle2, Clock, ChefHat, Package, Truck } from 'lucide-react';
import { OrderStatus } from '@/interfaces';
import { cn } from '@/lib/utils';

interface OrderStatusTrackerProps {
  currentStatus: OrderStatus;
  orderType: 'dine-in' | 'pickup' | 'delivery' | 'pay-now';
  className?: string;
}

interface StatusStep {
  status: OrderStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const STATUS_STEPS_DINE_IN: StatusStep[] = [
  {
    status: 'confirmed',
    label: 'Received',
    icon: CheckCircle2,
    description: 'Order confirmed',
  },
  {
    status: 'preparing',
    label: 'Preparing',
    icon: ChefHat,
    description: 'Kitchen is preparing your order',
  },
  {
    status: 'ready',
    label: 'Ready',
    icon: Package,
    description: 'Order ready for service',
  },
  {
    status: 'delivered',
    label: 'Delivered',
    icon: CheckCircle2,
    description: 'Delivered to your table',
  },
];

const STATUS_STEPS_PICKUP: StatusStep[] = [
  {
    status: 'confirmed',
    label: 'Received',
    icon: CheckCircle2,
    description: 'Order confirmed',
  },
  {
    status: 'preparing',
    label: 'Preparing',
    icon: ChefHat,
    description: 'Kitchen is preparing your order',
  },
  {
    status: 'ready',
    label: 'Ready',
    icon: Package,
    description: 'Ready for pickup',
  },
  {
    status: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    description: 'Order picked up',
  },
];

const STATUS_STEPS_DELIVERY: StatusStep[] = [
  {
    status: 'confirmed',
    label: 'Received',
    icon: CheckCircle2,
    description: 'Order confirmed',
  },
  {
    status: 'preparing',
    label: 'Preparing',
    icon: ChefHat,
    description: 'Kitchen is preparing your order',
  },
  {
    status: 'ready',
    label: 'Ready',
    icon: Package,
    description: 'Order ready for delivery',
  },
  {
    status: 'out-for-delivery',
    label: 'On the Way',
    icon: Truck,
    description: 'Driver is on the way',
  },
  {
    status: 'delivered',
    label: 'Delivered',
    icon: CheckCircle2,
    description: 'Order delivered',
  },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  'out-for-delivery': 4,
  delivered: 5,
  completed: 6,
  cancelled: -1,
};

/**
 * Order status tracking component with visual progress indicator
 */
export function OrderStatusTracker({
  currentStatus,
  orderType,
  className,
}: OrderStatusTrackerProps) {
  const steps =
    orderType === 'dine-in'
      ? STATUS_STEPS_DINE_IN
      : orderType === 'pickup' || orderType === 'pay-now'
        ? STATUS_STEPS_PICKUP
        : STATUS_STEPS_DELIVERY;

  const currentStatusOrder = STATUS_ORDER[currentStatus];

  const getStepState = (step: StatusStep): 'completed' | 'current' | 'upcoming' => {
    const stepOrder = STATUS_ORDER[step.status];
    
    if (currentStatus === 'cancelled') {
      return 'upcoming';
    }
    
    if (stepOrder < currentStatusOrder) {
      return 'completed';
    }
    
    if (stepOrder === currentStatusOrder) {
      return 'current';
    }
    
    return 'upcoming';
  };

  if (currentStatus === 'cancelled') {
    return (
      <div className={cn('rounded-lg border border-destructive bg-destructive/10 p-6', className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
            <Clock className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-destructive">Order Cancelled</h3>
            <p className="text-sm text-muted-foreground">
              This order has been cancelled
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-6 top-6 h-full w-0.5 bg-muted" />
        
        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step) => {
            const state = getStepState(step);
            const Icon = step.icon;
            
            return (
              <div key={step.status} className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors',
                    state === 'completed' &&
                      'border-primary bg-primary text-primary-foreground',
                    state === 'current' &&
                      'border-primary bg-background text-primary animate-pulse',
                    state === 'upcoming' &&
                      'border-muted bg-background text-muted-foreground'
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                
                {/* Content */}
                <div className="flex-1 pt-2">
                  <h3
                    className={cn(
                      'font-semibold transition-colors',
                      state === 'completed' && 'text-foreground',
                      state === 'current' && 'text-primary',
                      state === 'upcoming' && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </h3>
                  <p
                    className={cn(
                      'text-sm transition-colors',
                      state === 'completed' && 'text-muted-foreground',
                      state === 'current' && 'text-foreground',
                      state === 'upcoming' && 'text-muted-foreground'
                    )}
                  >
                    {step.description}
                  </p>
                  
                  {state === 'current' && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                      <Clock className="h-4 w-4 animate-pulse" />
                      <span>In progress...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
