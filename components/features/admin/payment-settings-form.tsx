'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, CreditCard, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { updatePaymentSettingsAction } from '@/app/dashboard/settings/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const paymentSettingsSchema = z.object({
  activeProvider: z.enum(['monnify', 'paystack']),
  paystack: z.object({
    enabled: z.boolean(),
    mode: z.enum(['test', 'live']),
    publicKey: z.string().min(1, 'Public key is required'),
    secretKey: z.string().min(1, 'Secret key is required'),
  }),
});

type PaymentSettingsFormValues = z.infer<typeof paymentSettingsSchema>;

interface PaymentSettingsFormProps {
  initialSettings: {
    activeProvider: 'monnify' | 'paystack';
    paystack: {
      enabled: boolean;
      mode: 'test' | 'live';
      publicKey?: string;
      secretKey?: string;
    };
    monnify: {
      enabled: boolean;
    };
  };
}

export function PaymentSettingsForm({
  initialSettings,
}: PaymentSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<PaymentSettingsFormValues>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      activeProvider: initialSettings.activeProvider,
      paystack: {
        enabled: initialSettings.paystack.enabled,
        mode: initialSettings.paystack.mode,
        publicKey: initialSettings.paystack.publicKey || '',
        secretKey: initialSettings.paystack.secretKey || '',
      },
    },
  });

  const activeProvider = form.watch('activeProvider');

  async function onSubmit(data: PaymentSettingsFormValues) {
    setIsSubmitting(true);
    try {
      await updatePaymentSettingsAction(data);

      toast({
        title: 'Success',
        description: 'Payment settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment settings',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Gateway Configuration
        </CardTitle>
        <CardDescription>
          Configure payment providers and active gateway
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="activeProvider"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Active Payment Provider</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="monnify" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Monnify (Default)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="paystack" />
                        </FormControl>
                        <FormLabel className="font-normal">Paystack</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {activeProvider === 'paystack' && (
              <div className="rounded-lg border p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Paystack Configuration
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {form.watch('paystack.mode') === 'live'
                        ? 'Live Mode'
                        : 'Test Mode'}
                    </span>
                    <Switch
                      checked={form.watch('paystack.enabled')}
                      onCheckedChange={(checked) =>
                        form.setValue('paystack.enabled', checked)
                      }
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="paystack.mode"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Environment</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="test" />
                            </FormControl>
                            <FormLabel className="font-normal">Test</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="live" />
                            </FormControl>
                            <FormLabel className="font-normal">Live</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="paystack.publicKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Key</FormLabel>
                        <FormControl>
                          <Input placeholder="pk_test_..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paystack.secretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret Key</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="sk_test_..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          For security, the existing secret key is masked.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Webhook URL</AlertTitle>
                  <AlertDescription className="break-all">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/api/webhooks/paystack`
                      : '/api/webhooks/paystack'}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Payment Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
