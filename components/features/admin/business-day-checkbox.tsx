'use client';

/**
 * @requirement REQ-025 - Business day attribution checkbox for admin staff.
 *
 * Shown (pre-checked) when the current time is before the configured cutoff.
 * Allows admin to explicitly attribute an order/tab to the previous business day.
 */
import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getBusinessDayCutoffAction } from '@/app/dashboard/settings/actions';
import {
  deriveBusinessDate,
  shouldShowPreviousDayCheckbox,
  previousBusinessDayLabel,
} from '@/lib/business-date';

interface BusinessDayCheckboxProps {
  /** Called whenever the selected business date changes */
  onBusinessDateChange: (date: Date | undefined) => void;
}

/**
 * @requirement REQ-025 - Renders a prominent pre-checked checkbox when the current
 * time is before the configured cutoff, prompting admin to attribute the transaction
 * to the previous business day.
 */
export function BusinessDayCheckbox({
  onBusinessDateChange,
}: BusinessDayCheckboxProps) {
  const [showCheckbox, setShowCheckbox] = useState(false);
  const [checked, setChecked] = useState(true);
  const [label, setLabel] = useState('');
  const [cutoff, setCutoff] = useState('15:00');

  useEffect(() => {
    async function init() {
      const result = await getBusinessDayCutoffAction();
      const resolvedCutoff = result.cutoff ?? '15:00';
      setCutoff(resolvedCutoff);

      const now = new Date();
      const show = shouldShowPreviousDayCheckbox(now, resolvedCutoff);
      setShowCheckbox(show);

      if (show) {
        setLabel(previousBusinessDayLabel(now, resolvedCutoff));
        onBusinessDateChange(deriveBusinessDate(now, resolvedCutoff));
      } else {
        onBusinessDateChange(undefined);
      }
    }
    init();
  }, []);

  function handleCheckedChange(value: boolean) {
    setChecked(value);
    const now = new Date();
    if (value) {
      onBusinessDateChange(deriveBusinessDate(now, cutoff));
    } else {
      onBusinessDateChange(undefined);
    }
  }

  if (!showCheckbox) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4">
      <Checkbox
        id="previous-business-day"
        checked={checked}
        onCheckedChange={handleCheckedChange}
        className="mt-0.5 h-5 w-5 border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
      />
      <div className="space-y-0.5">
        <Label
          htmlFor="previous-business-day"
          className="text-base font-bold cursor-pointer leading-tight"
        >
          Attribute to previous business day ({label})
        </Label>
        <p className="text-sm text-muted-foreground">
          It is currently before {cutoff} WAT. Tick this to count this payment
          in <strong>{label}</strong>&apos;s report instead of today.
        </p>
      </div>
    </div>
  );
}
