'use client';

/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Modal wrapper around <CustomizationPicker> for surfaces that need to gather
 * customization selections inline (admin Express Order, admin Edit Order).
 * The customer-facing flow renders the picker inline inside the menu detail
 * modal instead.
 *
 * Returns the selected customizations via onConfirm. Confirm is disabled while
 * the picker has missing required groups (D2, AC1).
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomizationPicker } from '@/components/features/menu/customization-picker';
import { derivePickerState } from '@/lib/customization-picker-state';
import type { ICustomization } from '@/interfaces/menu-item.interface';
import type { SelectedCustomization } from '@/lib/customization-validation';

export type CustomizationPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  groups: ICustomization[];
  initialValue?: SelectedCustomization[];
  onConfirm: (selected: SelectedCustomization[]) => void;
  confirmLabel?: string;
};

export function CustomizationPickerDialog({
  open,
  onOpenChange,
  itemName,
  groups,
  initialValue,
  onConfirm,
  confirmLabel,
}: CustomizationPickerDialogProps) {
  const [value, setValue] = useState<SelectedCustomization[]>(
    initialValue ?? []
  );

  // Reset selection when the dialog opens for a new item.
  useEffect(() => {
    if (open) setValue(initialValue ?? []);
  }, [open, initialValue]);

  const state = derivePickerState({ groups, selected: value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize {itemName}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <CustomizationPicker
            groups={groups}
            value={value}
            onChange={setValue}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!state.isValid}
            onClick={() => {
              onConfirm(value);
              onOpenChange(false);
            }}
          >
            {confirmLabel ?? 'Add to Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
