/**
 * @requirement REQ-121 - One-page customer checkout
 * @srs REQ-CHECKOUT-006
 *
 * "Add a tip" checkbox that expands inline with 5/10/15% presets and a custom
 * amount. The tip is added to the charge; there is no tip payment method.
 */
'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  computeTipAmount,
  TIP_PRESET_PERCENTS,
  type TipSelection,
} from '@/lib/checkout/checkout-rules';

interface InlineTipProps {
  subtotal: number;
  onChange: (tipAmount: number) => void;
}

export function InlineTip({ subtotal, onChange }: InlineTipProps) {
  const [enabled, setEnabled] = useState(false);
  const [selection, setSelection] = useState<TipSelection>({ kind: 'none' });
  const [customText, setCustomText] = useState('');

  // The tip follows the cart: a percentage is recomputed when the subtotal changes.
  useEffect(() => {
    onChange(enabled ? computeTipAmount(subtotal, selection) : 0);
  }, [enabled, selection, subtotal, onChange]);

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center gap-3">
        <Checkbox
          id="add-tip"
          checked={enabled}
          onCheckedChange={(checked) => {
            const on = checked === true;
            setEnabled(on);
            if (!on) {
              setSelection({ kind: 'none' });
              setCustomText('');
            }
          }}
          className="h-5 w-5"
        />
        <Label htmlFor="add-tip" className="cursor-pointer">
          Add a tip
        </Label>
      </div>

      {enabled && (
        <div className="space-y-3" data-testid="tip-options">
          <div className="flex flex-wrap gap-2">
            {TIP_PRESET_PERCENTS.map((percent) => {
              const active =
                selection.kind === 'preset' && selection.percent === percent;
              return (
                <Button
                  key={percent}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={active}
                  onClick={() => {
                    setCustomText('');
                    setSelection({ kind: 'preset', percent });
                  }}
                >
                  {percent}%
                </Button>
              );
            })}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tip-custom" className="text-sm">
              Custom amount (₦)
            </Label>
            <Input
              id="tip-custom"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="0"
              value={customText}
              onChange={(event) => {
                const text = event.target.value;
                setCustomText(text);
                const amount = Number(text);
                setSelection(
                  text !== '' && Number.isFinite(amount) && amount > 0
                    ? { kind: 'custom', amount }
                    : { kind: 'none' }
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
