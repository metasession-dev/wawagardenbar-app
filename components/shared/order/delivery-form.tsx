'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  TextField,
  TextareaField,
  SubmitButton,
} from '@/components/shared/forms';
import { MapPin, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const deliverySchema = z.object({
  address: z.string().min(10, 'Please enter a complete address'),
  landmark: z.string().optional(),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  deliveryInstructions: z.string().optional(),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

// TODO: Implement actual geolocation and radius validation
function validateDeliveryRadius(_address: string): {
  valid: boolean;
  distance?: number;
} {
  // Placeholder validation - always returns valid for now
  // In production, this would use Google Maps API or similar
  return { valid: true, distance: 5 };
}

export function DeliveryForm() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
  });

  async function onSubmit(data: DeliveryFormData) {
    try {
      // Validate delivery radius
      const validation = validateDeliveryRadius(data.address);

      if (!validation.valid) {
        toast({
          title: 'Outside Delivery Area',
          description:
            "Sorry, we don't deliver to this location yet. Please try pickup instead.",
          variant: 'destructive',
        });
        return;
      }

      // TODO: Create Server Action to save order type and delivery details to session
      toast({
        title: 'Delivery Address Set!',
        description: `We'll deliver to: ${data.address}`,
      });

      // Redirect to menu with order type in URL
      const params = new URLSearchParams({
        type: 'delivery',
        address: data.address,
        phone: data.phone,
      });
      router.push(`/menu?${params.toString()}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set delivery address. Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <CardTitle>Delivery Address</CardTitle>
          </div>
          <CardDescription>
            Enter your delivery address. We'll verify it's within our delivery
            area.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <TextField
              label="Street Address"
              type="text"
              placeholder="123 Main Street, Apartment 4B"
              error={errors.address?.message}
              required
              {...register('address')}
            />

            <TextField
              label="Nearby Landmark"
              type="text"
              placeholder="e.g., Near City Mall"
              description="Help our delivery driver find you easily"
              error={errors.landmark?.message}
              {...register('landmark')}
            />

            <TextField
              label="Phone Number"
              type="tel"
              inputMode="tel"
              placeholder="+234 800 000 0000"
              error={errors.phone?.message}
              required
              {...register('phone')}
            />

            <TextareaField
              label="Delivery Instructions"
              placeholder="Any special instructions for the delivery driver..."
              description="Optional: Gate code, parking instructions, etc."
              rows={3}
              error={errors.deliveryInstructions?.message}
              {...register('deliveryInstructions')}
            />

            <SubmitButton isLoading={isSubmitting} className="w-full" size="lg">
              Continue to Menu
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Delivery Information
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Delivery radius: 10km from restaurant</li>
              <li>• Estimated delivery time: 30-45 minutes</li>
              <li>• Minimum order: ₦2,000</li>
              <li>• Delivery fee: ₦500-₦1,500 (based on distance)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> We'll call you if we have trouble finding your
          address. Please keep your phone nearby.
        </p>
      </div>
    </div>
  );
}
