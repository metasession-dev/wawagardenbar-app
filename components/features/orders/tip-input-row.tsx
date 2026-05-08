'use client';

/**
 * @requirement REQ-035 — Tip input control for staff payment surfaces.
 *
 * Used by:
 *  - Express create-order modal (`paymentMethod` is the bill's method;
 *    `tipPaymentMethod` defaults to it but is independently selectable).
 *  - Close-tab full-payment dialog (same pattern: closing payment is the
 *    bill, tip method defaults to it).
 *  - Close-tab partial-payment dialog (tip method = the row's
 *    `paymentType`; we render the input only — no separate dropdown).
 *
 * The component is controlled — the parent owns both `tipAmount` and
 * `tipPaymentMethod` state and updates them via callbacks.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Banknote } from 'lucide-react';

export type TipPaymentMethod = 'cash' | 'transfer' | 'card';

export type TipInputRowProps = {
  tipAmount: number;
  onTipAmountChange: (value: number) => void;
  /**
   * When provided, render a payment-method dropdown. Pass `undefined`
   * (or omit) when the tip method is locked to the bill row's
   * paymentType — typical of close-tab partial-payment rows.
   */
  tipPaymentMethod?: TipPaymentMethod;
  onTipPaymentMethodChange?: (value: TipPaymentMethod) => void;
  /** Disable inputs while a parent submit is in flight. */
  disabled?: boolean;
  /** Optional label override; defaults to "Tip (optional)". */
  label?: string;
  /** Optional id for the amount input (a11y / form-association). */
  id?: string;
};

export function TipInputRow({
  tipAmount,
  onTipAmountChange,
  tipPaymentMethod,
  onTipPaymentMethodChange,
  disabled,
  label = 'Tip (optional)',
  id = 'tip-amount',
}: TipInputRowProps) {
  const showMethodSelect = Boolean(
    tipPaymentMethod && onTipPaymentMethodChange
  );
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Banknote className="h-4 w-4 text-muted-foreground" />
        {label}
      </Label>
      <div
        className={
          showMethodSelect
            ? 'grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]'
            : ''
        }
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            ₦
          </span>
          <Input
            id={id}
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="0.00"
            className="pl-7"
            value={Number.isFinite(tipAmount) && tipAmount > 0 ? tipAmount : ''}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = raw === '' ? 0 : parseFloat(raw);
              onTipAmountChange(Number.isFinite(parsed) ? parsed : 0);
            }}
            disabled={disabled}
          />
        </div>
        {showMethodSelect && (
          <Select
            value={tipPaymentMethod}
            onValueChange={(v) =>
              onTipPaymentMethodChange?.(v as TipPaymentMethod)
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tip method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card / POS</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      {showMethodSelect && tipAmount > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip recorded as {tipPaymentMethod} regardless of bill payment method.
        </p>
      )}
    </div>
  );
}
