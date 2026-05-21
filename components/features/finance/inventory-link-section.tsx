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
import { shouldShowAddToInventoryDropdown } from '@/lib/expense-inventory-link';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  if (!shouldShowAddToInventoryDropdown(expenseType)) {
    return null;
  }

  const linkedInventoryPath = `items.${index}.linkedInventoryId` as const;
  const unitPath = `items.${index}.unit` as const;

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
              const picked = sellableInventory.find(
                (opt) => opt.id === f.value
              );
              const lockedUnit = picked?.expenseUnitOverride;
              return (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">
                    Sellable item to restock
                  </FormLabel>
                  <Select
                    value={f.value ?? '__none__'}
                    onValueChange={(v) => {
                      const newId = v === '__none__' ? undefined : v;
                      f.onChange(newId);
                      if (newId) {
                        const opt = sellableInventory.find(
                          (x) => x.id === newId
                        );
                        if (opt?.expenseUnitOverride) {
                          form.setValue(unitPath, opt.expenseUnitOverride);
                        }
                      }
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
