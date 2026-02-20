'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { NotificationSettingsForm } from './notification-settings-form';
import { InventoryLocationsForm } from './inventory-locations-form';
import { IInventoryLocationsSettings } from '@/interfaces';

/**
 * Settings form schema
 */
const settingsSchema = z.object({
  // Fee Configuration
  serviceFeePercentage: z.number().min(0).max(1),
  deliveryFeeBase: z.number().min(0),
  deliveryFeeReduced: z.number().min(0),
  freeDeliveryThreshold: z.number().min(0),
  minimumOrderAmount: z.number().min(0),
  
  // Tax Configuration
  taxPercentage: z.number().min(0).max(1),
  taxEnabled: z.boolean(),
  
  // Order Configuration
  estimatedPreparationTime: z.number().min(5).max(180),
  maxOrdersPerHour: z.number().min(1),
  allowGuestCheckout: z.boolean(),
  
  // Delivery Configuration
  deliveryRadius: z.number().min(1).max(100),
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  dineInEnabled: z.boolean(),
  
  // Business Hours
  businessHours: z.object({
    monday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    }),
    tuesday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    }),
    wednesday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    }),
    thursday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    }),
    friday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    }),
    saturday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    }),
    sunday: z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    }),
  }),
  
  // Contact Information
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  address: z.string(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  initialSettings: SettingsFormValues;
  notificationSettings: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    channels: {
      auth: 'email' | 'sms' | 'both';
      orders: 'email' | 'sms' | 'both';
    };
  };
  inventoryLocationsSettings: IInventoryLocationsSettings;
}

/**
 * Settings form component
 * Allows super-admin to update application settings
 */
export function SettingsForm({ initialSettings, notificationSettings, inventoryLocationsSettings }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialSettings,
  });

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update settings');
      }

      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });

      router.refresh();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  return (
    <Tabs defaultValue="fees" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="fees">Fees & Pricing</TabsTrigger>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="hours">Business Hours</TabsTrigger>
        <TabsTrigger value="contact">Contact Info</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="locations">Locations</TabsTrigger>
      </TabsList>

      <TabsContent value="notifications" className="space-y-6">
        <NotificationSettingsForm initialSettings={notificationSettings} />
      </TabsContent>

      <TabsContent value="locations" className="space-y-6">
        <InventoryLocationsForm initialConfig={inventoryLocationsSettings} />
      </TabsContent>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Fees & Pricing Tab */}
          <TabsContent value="fees" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Fee</h3>
              <FormField
                control={form.control}
                name="serviceFeePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Fee Percentage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        {...field}
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter as decimal (e.g., 0.02 for 2%). Current: {((field.value || 0) * 100).toFixed(2)}%
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Delivery Fees</h3>
              <FormField
                control={form.control}
                name="deliveryFeeBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Delivery Fee (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Delivery fee for orders below the free delivery threshold
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryFeeReduced"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reduced Delivery Fee (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Delivery fee for orders above the free delivery threshold
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="freeDeliveryThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free Delivery Threshold (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum order amount to qualify for reduced delivery fee
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tax Configuration</h3>
              <FormField
                control={form.control}
                name="taxEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Tax</FormLabel>
                      <FormDescription>
                        Apply tax to all orders
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
                name="taxPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Percentage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        {...field}
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter as decimal (e.g., 0.075 for 7.5%). Current: {((field.value || 0) * 100).toFixed(2)}%
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Minimums</h3>
              <FormField
                control={form.control}
                name="minimumOrderAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Order Amount (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum order value required for checkout
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Configuration</h3>
              
              <FormField
                control={form.control}
                name="estimatedPreparationTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Preparation Time (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="5"
                        max="180"
                        {...field}
                        value={field.value || 30}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 30 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Default preparation time for orders
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxOrdersPerHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Orders Per Hour</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        value={field.value || 20}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 20 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of orders that can be accepted per hour
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowGuestCheckout"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Allow Guest Checkout</FormLabel>
                      <FormDescription>
                        Allow customers to checkout without creating an account
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
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Types</h3>
              
              <FormField
                control={form.control}
                name="dineInEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Dine-In</FormLabel>
                      <FormDescription>
                        Allow customers to place dine-in orders
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
                name="pickupEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Pickup</FormLabel>
                      <FormDescription>
                        Allow customers to place pickup orders
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
                name="deliveryEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Delivery</FormLabel>
                      <FormDescription>
                        Allow customers to place delivery orders
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
                name="deliveryRadius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Radius (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        {...field}
                        value={field.value || 10}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 10 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum delivery distance from restaurant
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Business Hours Tab */}
          <TabsContent value="hours" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Business Hours</h3>
              {days.map((day) => (
                <div key={day} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium capitalize">{day}</h4>
                    <FormField
                      control={form.control}
                      name={`businessHours.${day}.closed`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2">
                          <FormLabel className="text-sm">Closed</FormLabel>
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
                  
                  {!form.watch(`businessHours.${day}.closed`) && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`businessHours.${day}.open`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Open</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`businessHours.${day}.close`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Close</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Contact Info Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormDescription>
                      Public contact email for customer inquiries
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormDescription>
                      Public contact phone number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Restaurant physical address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Submit Button */}
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
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}
