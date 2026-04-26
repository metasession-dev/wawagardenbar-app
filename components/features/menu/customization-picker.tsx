'use client';

/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Shared customization picker. Renders each customization group as either a
 * RadioGroup (group.required) or a Checkbox group (optional). All state logic
 * lives in lib/customization-picker-state.ts; this component is a thin shell.
 *
 * Used by:
 *   - components/features/menu/menu-item-detail-modal.tsx (customer)
 *   - components/features/admin/edit-order-dialog.tsx (admin edit-order)
 *   - app/dashboard/orders/express/create-order/page.tsx (staff express)
 */

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { ICustomization } from '@/interfaces/menu-item.interface';
import type { SelectedCustomization } from '@/lib/customization-validation';
import {
  derivePickerState,
  toggleOption,
} from '@/lib/customization-picker-state';

export type CustomizationPickerProps = {
  groups: ICustomization[];
  value: SelectedCustomization[];
  onChange: (value: SelectedCustomization[]) => void;
  disabled?: boolean;
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function CustomizationPicker({
  groups,
  value,
  onChange,
  disabled,
}: CustomizationPickerProps) {
  if (!groups || groups.length === 0) return null;

  const state = derivePickerState({ groups, selected: value });

  return (
    <div className="space-y-4" data-testid="customization-picker">
      {groups.map((group) => {
        const isMissing = state.missingRequiredGroups.includes(group.name);
        const selectedOption = value.find((s) => s.name === group.name);

        return (
          <div key={group.name}>
            <Label className="mb-2 block font-semibold">
              {group.name}
              {group.required && (
                <span className="ml-1 text-destructive" aria-label="required">
                  *
                </span>
              )}
              {isMissing && (
                <span className="ml-2 text-xs font-normal text-destructive">
                  (please choose one)
                </span>
              )}
            </Label>

            {group.required ? (
              <RadioGroup
                value={selectedOption?.option ?? ''}
                onValueChange={(optName) => {
                  const opt = group.options.find((o) => o.name === optName);
                  if (!opt) return;
                  onChange(
                    toggleOption(value, group.name, opt.name, opt.price, true)
                  );
                }}
                disabled={disabled}
              >
                {group.options.map((opt) => {
                  const inputId = `cust-${group.name}-${opt.name}`;
                  return (
                    <div
                      key={opt.name}
                      className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent"
                    >
                      <RadioGroupItem value={opt.name} id={inputId} />
                      <Label
                        htmlFor={inputId}
                        className="flex flex-1 cursor-pointer items-center justify-between font-normal"
                      >
                        <span>{opt.name}</span>
                        {opt.price > 0 && (
                          <span className="font-semibold">
                            +{formatPrice(opt.price)}
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                {group.options.map((opt) => {
                  const inputId = `cust-${group.name}-${opt.name}`;
                  const checked = value.some(
                    (s) => s.name === group.name && s.option === opt.name
                  );
                  return (
                    <div
                      key={opt.name}
                      className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent"
                    >
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() =>
                          onChange(
                            toggleOption(
                              value,
                              group.name,
                              opt.name,
                              opt.price,
                              false
                            )
                          )
                        }
                      />
                      <Label
                        htmlFor={inputId}
                        className="flex flex-1 cursor-pointer items-center justify-between font-normal"
                      >
                        <span>{opt.name}</span>
                        {opt.price > 0 && (
                          <span className="font-semibold">
                            +{formatPrice(opt.price)}
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
