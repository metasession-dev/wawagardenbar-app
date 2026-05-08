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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign } from 'lucide-react';

interface TipInputStepProps {
  form: UseFormReturn<any>;
  subtotal: number;
}

const TIP_PRESETS = [
  { label: '5%', value: 0.05 },
  { label: '10%', value: 0.1 },
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.2 },
];

export function TipInputStep({ form, subtotal }: TipInputStepProps) {
  const tipAmount = form.watch('tipAmount') || 0;

  function handlePresetClick(percentage: number) {
    const calculatedTip = Math.round(subtotal * percentage);
    form.setValue('tipAmount', calculatedTip);
  }

  function handleCustomTip(value: string) {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      form.setValue('tipAmount', numValue);
    } else if (value === '') {
      form.setValue('tipAmount', 0);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Add a Tip (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Show your appreciation for great service
        </p>
      </div>

      {/* Preset Tip Buttons */}
      <div className="grid grid-cols-4 gap-3">
        {TIP_PRESETS.map((preset) => {
          const presetAmount = Math.round(subtotal * preset.value);
          const isSelected = tipAmount === presetAmount;

          return (
            <Button
              key={preset.label}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => handlePresetClick(preset.value)}
              className="flex flex-col h-auto py-3"
            >
              <span className="text-sm font-semibold">{preset.label}</span>
              <span className="text-xs mt-1">
                ₦{presetAmount.toLocaleString()}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Custom Tip Input */}
      <FormField
        control={form.control}
        name="tipAmount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Custom Tip Amount</FormLabel>
            <FormControl>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter custom amount"
                  className="pl-10"
                  value={field.value || ''}
                  onChange={(e) => handleCustomTip(e.target.value)}
                  min="0"
                />
              </div>
            </FormControl>
            <FormDescription>
              Enter a custom tip amount in Naira (₦)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* REQ-036 — tip payment method (Cash / POS / Transfer). Required
          when tipAmount > 0; the customer-checkout submit blocks if
          this is missing. Independent of the bill payment method that's
          chosen on the next step of the wizard. */}
      {tipAmount > 0 && (
        <FormField
          control={form.control}
          name="tipPaymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tip Payment Method</FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How will the tip be paid?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card / POS</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                The tip's payment method is recorded independently of the bill —
                useful when the customer pays the bill on card and tips in cash.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Tip Summary */}
      {tipAmount > 0 && (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Tip Amount:</span>
            <span className="text-lg font-semibold">
              ₦{tipAmount.toLocaleString()}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              form.setValue('tipAmount', 0);
              form.setValue('tipPaymentMethod', undefined);
            }}
            className="mt-2 w-full"
          >
            Remove Tip
          </Button>
        </div>
      )}

      {tipAmount === 0 && (
        <div className="text-center text-sm text-muted-foreground">
          No tip added
        </div>
      )}
    </div>
  );
}
