'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SelectField, SubmitButton } from '@/components/shared/forms';
import { Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const pickupSchema = z.object({
  pickupTime: z.string().min(1, 'Please select a pickup time'),
});

type PickupFormData = z.infer<typeof pickupSchema>;

function generateTimeSlots(): Array<{ value: string; label: string }> {
  const slots: Array<{ value: string; label: string }> = [];
  const now = new Date();
  const currentMinute = now.getMinutes();

  // Generate slots for next 12 hours, every 15 minutes
  for (let i = 0; i < 48; i++) {
    const slotTime = new Date(now);
    slotTime.setMinutes(currentMinute + (i + 1) * 15);
    slotTime.setSeconds(0);

    const hours = slotTime.getHours();
    const minutes = slotTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    const label = `${displayHours}:${displayMinutes} ${ampm}`;
    const value = slotTime.toISOString();

    slots.push({ value, label });
  }

  return slots;
}

export function PickupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const timeSlots = generateTimeSlots();

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<PickupFormData>({
    resolver: zodResolver(pickupSchema),
  });

  const pickupTime = watch('pickupTime');

  async function onSubmit(data: PickupFormData) {
    try {
      // TODO: Create Server Action to save order type and pickup time to session
      const selectedTime = new Date(data.pickupTime);
      const displayTime = selectedTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      toast({
        title: 'Pickup Time Set!',
        description: `Your order will be ready for pickup at ${displayTime}`,
      });

      // Redirect to menu with order type in URL
      router.push(
        `/menu?type=pickup&time=${encodeURIComponent(data.pickupTime)}`
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set pickup time. Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <CardTitle>Select Pickup Time</CardTitle>
          </div>
          <CardDescription>
            Choose when you'd like to pick up your order. We'll have it ready
            for you!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <SelectField
              label="Pickup Time"
              options={timeSlots}
              placeholder="Select a time"
              error={errors.pickupTime?.message}
              required
              value={pickupTime}
              onValueChange={(value) => setValue('pickupTime', value)}
            />

            <SubmitButton isLoading={isSubmitting} className="w-full" size="lg">
              Continue to Menu
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted p-4 space-y-2">
        <p className="text-sm font-medium">Pickup Location:</p>
        <p className="text-sm text-muted-foreground">
          Wawa Garden Bar
          <br />
          123 Main Street
          <br />
          Lagos, Nigeria
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          <strong>Note:</strong> Please arrive within 15 minutes of your
          selected time to ensure your order is fresh.
        </p>
      </div>
    </div>
  );
}
