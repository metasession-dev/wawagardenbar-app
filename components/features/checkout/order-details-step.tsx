'use client';

import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UtensilsCrossed, Package, Truck, MapPin, Clock, Zap } from 'lucide-react';

import { ITab } from '@/interfaces';

interface OrderDetailsStepProps {
  form: UseFormReturn<any>;
  hasExistingTab?: boolean; // Deprecated, use isTableLocked instead
  isTableLocked?: boolean;
  existingTab?: ITab | null;
  isTabOccupied?: boolean;
}

export function OrderDetailsStep({ form, hasExistingTab, isTableLocked, existingTab, isTabOccupied }: OrderDetailsStepProps) {
  const orderType = form.watch('orderType');
  const tableNumber = form.watch('tableNumber');
  
  // Backwards compatibility or default
  const locked = isTableLocked ?? hasExistingTab ?? false;
  const tabFound = !!existingTab;

  return (
    <div className="space-y-6">
      {/* Order Type Selection */}
      <FormField
        control={form.control}
        name="orderType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Order Type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid gap-4 sm:grid-cols-2 md:grid-cols-4"
              >
                <Label
                  htmlFor="dine-in"
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    field.value === 'dine-in'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="dine-in" id="dine-in" className="sr-only" />
                  <UtensilsCrossed className="h-6 w-6" />
                  <span className="font-medium">Dine In</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Eat at the restaurant
                  </span>
                </Label>

                <Label
                  htmlFor="pickup"
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    field.value === 'pickup'
                      ? 'border-primary bg-primary/5'
                      : tabFound || locked
                        ? 'border-muted opacity-50 cursor-not-allowed bg-muted/10'
                        : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="pickup" id="pickup" className="sr-only" disabled={tabFound || locked} />
                  <Package className="h-6 w-6" />
                  <span className="font-medium">Pickup</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {(tabFound || locked) ? 'Close tab first' : 'Collect your order'}
                  </span>
                </Label>

                <Label
                  htmlFor="delivery"
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    field.value === 'delivery'
                      ? 'border-primary bg-primary/5'
                      : tabFound || locked
                        ? 'border-muted opacity-50 cursor-not-allowed bg-muted/10'
                        : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="delivery" id="delivery" className="sr-only" disabled={tabFound || locked} />
                  <Truck className="h-6 w-6" />
                  <span className="font-medium">Delivery</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {(tabFound || locked) ? 'Close tab first' : 'Delivered to you'}
                  </span>
                </Label>

                <Label
                  htmlFor="pay-now"
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    field.value === 'pay-now'
                      ? 'border-primary bg-primary/5'
                      : tabFound || locked
                        ? 'border-muted opacity-50 cursor-not-allowed bg-muted/10'
                        : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="pay-now" id="pay-now" className="sr-only" disabled={tabFound || locked} />
                  <Zap className="h-6 w-6" />
                  <span className="font-medium">Pay Now</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {(tabFound || locked) ? 'Close tab first' : 'Quick order & pay'}
                  </span>
                </Label>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Dine-in: Table Number */}
      {orderType === 'dine-in' && (
        <FormField
          control={form.control}
          name="tableNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Table Number</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., T12" 
                  {...field} 
                  disabled={locked}
                  className={`${locked ? 'bg-muted cursor-not-allowed' : ''} ${isTabOccupied ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
              </FormControl>
              <FormDescription>
                {locked 
                  ? 'Table number is set from your existing tab and cannot be changed'
                  : 'Enter your table number or scan the QR code'
                }
              </FormDescription>
              
              {/* Message about existing tab if not locked but found */}
              {!locked && existingTab && (
                 <div className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                   <span>Note: An open tab exists for this table. This order will be added to it.</span>
                 </div>
              )}

              {/* Message about occupied tab */}
              {isTabOccupied && (
                 <div className="text-sm font-medium text-destructive flex items-center mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                   <span>Table {tableNumber} is currently occupied. Please select another table.</span>
                 </div>
              )}
              
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Pickup: Preferred Time */}
      {orderType === 'pickup' && (
        <FormField
          control={form.control}
          name="pickupTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Pickup Time <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="datetime-local" className="pl-10" {...field} required />
                </div>
              </FormControl>
              <FormDescription>
                When would you like to pick up your order?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Delivery: Address Details */}
      {orderType === 'delivery' && (
        <>
          <FormField
            control={form.control}
            name="deliveryStreet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g., 123 Main Street"
                      className="pl-10"
                      {...field}
                      required
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  House number and street name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deliveryStreet2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address 2 (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Apt 4B, Suite 200, Floor 3"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Apartment, suite, unit, building, floor, etc.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="deliveryCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Lagos" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Lagos" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="deliveryPostalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 100001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Nigeria" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="deliveryLandmark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Landmark (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Near City Mall" {...field} />
                </FormControl>
                <FormDescription>
                  Help us find you easier
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deliveryInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Instructions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Call when you arrive, Ring the doorbell"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="saveAddress"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 touch-manipulation">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-1 h-5 w-5"
                  />
                </FormControl>
                <div className="space-y-1 leading-none flex-1">
                  <FormLabel className="cursor-pointer">
                    Save this address for future orders
                  </FormLabel>
                  <FormDescription>
                    We'll pre-fill this address next time you order delivery
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </>
      )}

      {/* Special Instructions (All Types) */}
      <FormField
        control={form.control}
        name="specialInstructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Special Instructions (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any special requests for your order?"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Dietary requirements, allergies, or other requests
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
