'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import { Loader2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import {
  updateNotificationSettingsAction,
  sendTestSMSAction,
} from '@/app/actions/admin/settings-actions';

// Schema for notification settings
const settingsSchema = z.object({
  smsEnabled: z.boolean().default(false),
  emailEnabled: z.boolean().default(true),
  channels: z.object({
    auth: z.enum(['email', 'sms', 'both']),
    orders: z.enum(['email', 'sms', 'both']),
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface NotificationSettingsFormProps {
  initialSettings: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    channels: {
      auth: 'email' | 'sms' | 'both';
      orders: 'email' | 'sms' | 'both';
    };
  };
}

export function NotificationSettingsForm({
  initialSettings,
}: NotificationSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTestPending, startTestTransition] = useTransition();
  const [testPhone, setTestPhone] = useState('');

  const form = useForm<
    z.input<typeof settingsSchema>,
    unknown,
    SettingsFormValues
  >({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      smsEnabled: initialSettings.smsEnabled,
      emailEnabled: initialSettings.emailEnabled,
      channels: {
        auth: initialSettings.channels.auth,
        orders: initialSettings.channels.orders,
      },
    },
  });

  const smsEnabled = form.watch('smsEnabled');

  function onSubmit(data: SettingsFormValues) {
    startTransition(async () => {
      try {
        const result = await updateNotificationSettingsAction(data);

        if (result.success) {
          toast.success('Settings updated successfully');
        } else {
          toast.error(result.error || 'Failed to update settings');
        }
      } catch (error) {
        toast.error('An unexpected error occurred');
      }
    });
  }

  function handleTestSMS() {
    if (!testPhone) {
      toast.error('Please enter a phone number for testing');
      return;
    }

    startTestTransition(async () => {
      try {
        const result = await sendTestSMSAction(testPhone);

        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.error || 'Failed to send test SMS');
        }
      } catch (error) {
        toast.error('An unexpected error occurred');
      }
    });
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Global Notification Settings</CardTitle>
              <CardDescription>
                Enable or disable notification channels system-wide.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="emailEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Email Notifications
                      </FormLabel>
                      <FormDescription>
                        Send notifications via email (SMTP).
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        SMS Notifications
                      </FormLabel>
                      <FormDescription>
                        Send notifications via SMS (Africa's Talking).
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Channel Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Channel Preferences</CardTitle>
              <CardDescription>
                Configure which channels to use for specific event types.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="channels.auth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication (PINs)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!smsEnabled && field.value === 'email'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="sms" disabled={!smsEnabled}>
                            SMS Only
                          </SelectItem>
                          <SelectItem value="both" disabled={!smsEnabled}>
                            Both (Email & SMS)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How verification PINs should be delivered.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="channels.orders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Updates</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!smsEnabled && field.value === 'email'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="sms" disabled={!smsEnabled}>
                            SMS Only
                          </SelectItem>
                          <SelectItem value="both" disabled={!smsEnabled}>
                            Both (Email & SMS)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How order confirmations and status updates are sent.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </Button>
          </div>
        </form>
      </Form>

      <Separator className="my-8" />

      {/* Test SMS Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test SMS Configuration</CardTitle>
          <CardDescription>
            Send a test message to verify your SMS integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-sm items-end space-x-2">
            <div className="grid gap-1.5 flex-1">
              <label
                htmlFor="phone"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Phone Number
              </label>
              <Input
                id="phone"
                placeholder="+234..."
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <Button
              onClick={handleTestSMS}
              disabled={!smsEnabled || isTestPending || !testPhone}
              variant="secondary"
            >
              {isTestPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test SMS
            </Button>
          </div>
          {!smsEnabled && (
            <p className="mt-2 text-sm text-muted-foreground text-yellow-600">
              Enable SMS notifications above to use this feature.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
