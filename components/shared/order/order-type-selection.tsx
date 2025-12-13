'use client';

import { useQueryState } from 'nuqs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Clock, Truck } from 'lucide-react';
import { DineInForm } from './dine-in-form';
import { PickupForm } from './pickup-form';
import { DeliveryForm } from './delivery-form';

type OrderType = 'dine-in' | 'pickup' | 'delivery' | null;

const orderTypes = [
  {
    type: 'dine-in' as const,
    icon: UtensilsCrossed,
    title: 'Dine In',
    description: 'Scan QR code at your table',
    color: 'text-primary',
  },
  {
    type: 'pickup' as const,
    icon: Clock,
    title: 'Pickup',
    description: 'Order ahead and pick up',
    color: 'text-accent',
  },
  {
    type: 'delivery' as const,
    icon: Truck,
    title: 'Delivery',
    description: 'Get it delivered to your door',
    color: 'text-primary',
  },
];

export function OrderTypeSelection() {
  const [orderType, setOrderType] = useQueryState('type');

  function handleSelectType(type: OrderType) {
    setOrderType(type);
  }

  function handleBack() {
    setOrderType(null);
  }

  if (!orderType) {
    return (
      <div className="container mx-auto min-h-screen px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">How would you like to order?</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose your preferred ordering method
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {orderTypes.map(({ type, icon: Icon, title, description, color }) => (
              <Card
                key={type}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
                data-testid={`order-type-${type}`}
                onClick={() => handleSelectType(type)}
              >
                <CardHeader>
                  <div className="mb-4 flex justify-center">
                    <Icon className={`h-16 w-16 ${color}`} />
                  </div>
                  <CardTitle className="text-center text-2xl">{title}</CardTitle>
                  <CardDescription className="text-center text-base">
                    {description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button className="w-full" size="lg">
                    Select {title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {orderTypes.find((t) => t.type === orderType)?.title} Order
          </h1>
          <Button variant="outline" onClick={handleBack}>
            Change Type
          </Button>
        </div>

        {orderType === 'dine-in' && <DineInForm />}
        {orderType === 'pickup' && <PickupForm />}
        {orderType === 'delivery' && <DeliveryForm />}
      </div>
    </div>
  );
}
