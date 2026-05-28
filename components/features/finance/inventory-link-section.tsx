'use client';

/**
 * Shared inventory-linking UI for expense line items.
 *
 * Used by both the Add Expense form (expense-form.tsx) and the
 * Edit Pending Expense Group dialog (edit-pending-group-dialog.tsx).
 *
 * Renders two mutually-exclusive ways to link an expense line to an
 * inventory adjustment:
 *
 *   1. Kitchen-ingredient flow (REQ-034) — always-visible dropdown
 *      defaulting to "No inventory link". Picking a kitchen ingredient
 *      sets `linkedInventoryId` to that inventory row's id.
 *
 *   2. Sellable-item flow (REQ-038) — checkbox that reveals a sellable-
 *      only dropdown. Picking a sellable item sets `linkedInventoryId`
 *      to that inventory row's id. If the paired MenuItem has an
 *      `expenseUnitOverride`, the line's Unit field is forced to that
 *      unit and a tip explains why.
 *
 * Both flows write to the same `items.${index}.linkedInventoryId` field;
 * the service routes based on the linked inventory's `kind`.
 */
import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  computeLockedUnit,
  shouldShowAddToInventoryDropdown,
} from '@/lib/expense-inventory-link';

export interface KitchenInventoryOption {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export interface SellableInventoryOption {
  id: string;
  name: string;
  category: string;
  unit: string;
  expenseUnitOverride?: string;
}

interface InventoryLinkSectionProps {
  // react-hook-form instance. Typed as `any` because the section is
  // reused by two forms with different overall schemas; the only fields
  // it touches are `items.${index}.linkedInventoryId` and
  // `items.${index}.unit`, which both forms guarantee.
  form: UseFormReturn<any>;
  index: number;
  expenseType: string;
  kitchenInventory: KitchenInventoryOption[];
  sellableInventory: SellableInventoryOption[];
  sellableLinkEnabled: boolean;
  setSellableLinkEnabled: (enabled: boolean) => void;
}

export function InventoryLinkSection({
  form,
  index,
  expenseType,
  kitchenInventory,
  sellableInventory,
  sellableLinkEnabled,
  setSellableLinkEnabled,
}: InventoryLinkSectionProps) {
  const linkedInventoryPath = `items.${index}.linkedInventoryId` as const;
  const unitPath = `items.${index}.unit` as const;

  // Watch the linked id so the locked-unit computation reacts to picks.
  // Hooks must be called unconditionally — early-return below guards render
  // output but not hook order.
  const watchedLinkedId = form.watch(linkedInventoryPath);
  const lockedUnit = computeLockedUnit(
    sellableLinkEnabled,
    typeof watchedLinkedId === 'string' ? watchedLinkedId : undefined,
    sellableInventory
  );

  // Keep the line's Unit field in sync with the locked unit. The inline
  // setValue inside the sellable Select's onValueChange wasn't reliably
  // updating the displayed value (RHF Controller + Radix Select timing).
  // A useEffect that fires on lockedUnit changes is the more robust
  // approach. shouldDirty/shouldValidate ensure subscribers re-render.
  useEffect(() => {
    if (lockedUnit) {
      form.setValue(unitPath, lockedUnit, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
    }
    // form is stable from useForm; unitPath is derived from props that
    // don't change for a given row's lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedUnit]);

  if (!shouldShowAddToInventoryDropdown(expenseType)) {
    return null;
  }

  return (
    <>
      <FormField
        control={form.control}
        name={linkedInventoryPath}
        render={({ field: f }) => {
          const isSellableMode = sellableLinkEnabled === true;
          return (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">
                Add to kitchen inventory (optional)
              </FormLabel>
              <Select
                value={isSellableMode ? '__none__' : (f.value ?? '__none__')}
                onValueChange={(v) => {
                  f.onChange(v === '__none__' ? undefined : v);
                  if (v !== '__none__') {
                    setSellableLinkEnabled(false);
                  }
                }}
                disabled={isSellableMode}
              >
                <FormControl>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="No inventory link" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">No inventory link</SelectItem>
                  {kitchenInventory.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      No kitchen ingredients available
                    </SelectItem>
                  ) : (
                    kitchenInventory.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                        {opt.category ? ` — ${opt.category}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={sellableLinkEnabled === true}
            onCheckedChange={(checked) => {
              const enabled = checked === true;
              setSellableLinkEnabled(enabled);
              form.setValue(linkedInventoryPath, undefined);
            }}
          />
          Update inventory count (sellable item)
        </label>
        {sellableLinkEnabled === true && (
          <FormField
            control={form.control}
            name={linkedInventoryPath}
            render={({ field: f }) => {
              return (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">
                    Sellable item to restock
                  </FormLabel>
                  <Select
                    value={typeof f.value === 'string' ? f.value : '__none__'}
                    onValueChange={(v) => {
                      const newId = v === '__none__' ? undefined : v;
                      f.onChange(newId);
                      // Unit sync is handled by the useEffect at component
                      // level — see lockedUnit / form.setValue above.
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="No sellable link" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No sellable link</SelectItem>
                      {sellableInventory.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          No sellable items available
                        </SelectItem>
                      ) : (
                        sellableInventory.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                            {opt.category ? ` — ${opt.category}` : ''}
                            {opt.expenseUnitOverride
                              ? ` · locked to ${opt.expenseUnitOverride}`
                              : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {lockedUnit && (
                    <p className="text-xs text-amber-700">
                      Unit locked to <strong>{lockedUnit}</strong> by this menu
                      item&apos;s Purchase unit setting.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        )}
      </div>
    </>
  );
}
