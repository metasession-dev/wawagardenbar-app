/**
 * @requirement REQ-121 - One-page customer checkout
 * @srs REQ-CHECKOUT-014, REQ-CHECKOUT-016, REQ-CHECKOUT-017
 *
 * The order-type selector and only the fields that type needs: dine-in asks
 * for the table; pickup defaults to as soon as possible with an optional
 * schedule; delivery preselects the saved address or asks for one address line
 * plus a landmark. Everything else (city, state, postal code, country) is
 * filled in by `buildDeliveryInfo`.
 */
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UtensilsCrossed, Package, Truck, MapPin, Clock } from 'lucide-react';
import {
  CHECKOUT_ORDER_TYPES,
  fieldsForOrderType,
  type CheckoutOrderType,
  type SavedAddressLike,
} from '@/lib/checkout/checkout-rules';

export interface PickupSlotOption {
  value: string;
  label: string;
  date: string;
}

interface OrderTypeFieldsProps {
  form: UseFormReturn<any>;
  /** Types enabled in Settings; null while loading (all are shown). */
  enabledTypes: readonly CheckoutOrderType[] | null;
  pickupSlots: PickupSlotOption[];
  /** The customer's default saved address, if any. */
  savedAddress: SavedAddressLike | null;
  /** True while the saved address is the one in use. */
  useSavedAddress: boolean;
  onUseSavedAddressChange: (value: boolean) => void;
}

const TYPE_CARDS: Record<
  CheckoutOrderType,
  { label: string; hint: string; icon: typeof UtensilsCrossed }
> = {
  'dine-in': {
    label: 'Dine In',
    hint: 'Eat at the restaurant',
    icon: UtensilsCrossed,
  },
  pickup: { label: 'Pickup', hint: 'Collect your order', icon: Package },
  delivery: { label: 'Delivery', hint: 'Delivered to you', icon: Truck },
};

export function OrderTypeFields({
  form,
  enabledTypes,
  pickupSlots,
  savedAddress,
  useSavedAddress,
  onUseSavedAddressChange,
}: OrderTypeFieldsProps) {
  const orderType = form.watch('orderType') as CheckoutOrderType;
  const pickupMode = form.watch('pickupMode') as 'asap' | 'later';
  const groups = fieldsForOrderType(orderType);

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="orderType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Order type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid gap-3 sm:grid-cols-3"
              >
                {CHECKOUT_ORDER_TYPES.filter(
                  (type) => enabledTypes === null || enabledTypes.includes(type)
                ).map((type) => {
                  const card = TYPE_CARDS[type];
                  const Icon = card.icon;
                  return (
                    <Label
                      key={type}
                      htmlFor={`order-type-${type}`}
                      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                        field.value === type
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem
                        value={type}
                        id={`order-type-${type}`}
                        className="sr-only"
                      />
                      <Icon className="h-6 w-6" />
                      <span className="font-medium">{card.label}</span>
                      <span className="text-center text-xs text-muted-foreground">
                        {card.hint}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {groups.includes('tableNumber') && (
        <FormField
          control={form.control}
          name="tableNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Table number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., T12" inputMode="text" {...field} />
              </FormControl>
              <FormDescription>
                Filled in when you scan the QR code at your table
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {groups.includes('pickupSchedule') && (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="pickupMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>When</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="space-y-2"
                  >
                    <Label
                      htmlFor="pickup-asap"
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3"
                    >
                      <RadioGroupItem value="asap" id="pickup-asap" />
                      As soon as possible
                    </Label>
                    <Label
                      htmlFor="pickup-later"
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3"
                    >
                      <RadioGroupItem value="later" id="pickup-later" />
                      Schedule for later
                    </Label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {pickupMode === 'later' && (
            <FormField
              control={form.control}
              name="pickupTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup time</FormLabel>
                  <FormControl>
                    {pickupSlots.length > 0 ? (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                      >
                        <SelectTrigger>
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Select a pickup time" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickupSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}

      {groups.includes('deliveryAddress') && (
        <div className="space-y-4">
          {savedAddress && useSavedAddress ? (
            <div className="rounded-md border p-4" data-testid="saved-address">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Delivering to</p>
                  <p>{savedAddress.streetAddress}</p>
                  <p className="text-muted-foreground">
                    {savedAddress.city}, {savedAddress.state}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue('deliveryStreet', '');
                    onUseSavedAddressChange(false);
                  }}
                >
                  Use a different address
                </Button>
              </div>
            </div>
          ) : (
            <>
              <FormField
                control={form.control}
                name="deliveryStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="House number and street"
                          className="pl-10"
                          autoComplete="street-address"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {savedAddress && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.setValue('deliveryStreet', savedAddress.streetAddress);
                    onUseSavedAddressChange(true);
                  }}
                >
                  Use my saved address
                </Button>
              )}
            </>
          )}

          <FormField
            control={form.control}
            name="deliveryLandmark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Landmark (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Near City Mall"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deliveryInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions for the rider (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="e.g., Call when you arrive"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
