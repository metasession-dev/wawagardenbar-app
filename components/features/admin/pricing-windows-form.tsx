'use client';

/**
 * REQ-102 (amended) — Show Price Window / Happy Hour Window, standalone.
 *
 * Originally a tab inside the Settings page; moved to its own page linked
 * from /dashboard/menu (next to "Edit All") per operator request. Submits
 * a partial PUT to /api/settings — SettingsService.updateSettings() merges
 * via Object.assign, so this form never touches any other settings field.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

const pricingWindowsSchema = z.object({
  showPriceWindow: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }),
  happyHourWindow: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }),
});

type PricingWindowsFormValues = z.infer<typeof pricingWindowsSchema>;

interface PricingWindowsFormProps {
  initialValues: PricingWindowsFormValues;
}

export function PricingWindowsForm({ initialValues }: PricingWindowsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<PricingWindowsFormValues>({
    resolver: zodResolver(pricingWindowsSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(data: PricingWindowsFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update pricing windows');
      }

      toast({
        title: 'Success',
        description: 'Pricing windows updated successfully',
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating pricing windows:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update pricing windows',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle data-testid="show-price-window-heading">
              Show Price Window
            </CardTitle>
            <CardDescription>
              While enabled and within this daily window, menu items use their
              Show Price instead of their default price.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Enabled</h4>
              <FormField
                control={form.control}
                name="showPriceWindow.enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {form.watch('showPriceWindow.enabled') && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="showPriceWindow.start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="showPriceWindow.end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle data-testid="happy-hour-window-heading">
              Happy Hour Window
            </CardTitle>
            <CardDescription>
              While enabled and within this daily window, menu items use their
              Happy Hour Price. Takes precedence over the Show Price Window if
              both are active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Enabled</h4>
              <FormField
                control={form.control}
                name="happyHourWindow.enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {form.watch('happyHourWindow.enabled') && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="happyHourWindow.start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="happyHourWindow.end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Pricing Windows
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
