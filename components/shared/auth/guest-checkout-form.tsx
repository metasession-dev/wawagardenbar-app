'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { guestCheckoutAction } from '@/app/actions/auth';

const guestSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .optional()
    .or(z.literal('')),
});

type GuestFormData = z.infer<typeof guestSchema>;

interface GuestCheckoutFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function GuestCheckoutForm({
  redirectTo = '/menu',
  onSuccess,
}: GuestCheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      email: '',
      name: '',
    },
  });

  async function handleSubmit(data: GuestFormData) {
    setIsLoading(true);
    try {
      // Convert empty strings to undefined
      const email = data.email || undefined;
      const name = data.name || undefined;

      const result = await guestCheckoutAction(email, name);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Guest session created. You can now place your order.',
        });

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(redirectTo);
          router.refresh();
        }
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="guest-email">Email Address (Optional)</Label>
        <Input
          id="guest-email"
          type="email"
          placeholder="Optional - for order updates"
          {...form.register('email')}
          disabled={isLoading}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-500">
            {form.formState.errors.email.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          We'll use this to send your order confirmation
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-name">Name (Optional)</Label>
        <Input
          id="guest-name"
          type="text"
          placeholder="Your name"
          {...form.register('name')}
          disabled={isLoading}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Continue as Guest
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Guest checkout doesn't save your order history or earn rewards
      </p>
    </form>
  );
}
