'use client';

/**
 * @requirement REQ-089 — Portion size picker dialog for admin order management.
 * Lets staff select Full/Half/Quarter portion when adding items to an order.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PortionOptions {
  halfPortionEnabled?: boolean;
  halfPortionSurcharge?: number;
  quarterPortionEnabled?: boolean;
  quarterPortionSurcharge?: number;
}

interface PortionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  basePrice: number;
  portionOptions?: PortionOptions;
  onConfirm: (portionSize: 'full' | 'half' | 'quarter') => void;
}

export function PortionPickerDialog({
  open,
  onOpenChange,
  itemName,
  basePrice,
  portionOptions,
  onConfirm,
}: PortionPickerDialogProps) {
  const halfEnabled = portionOptions?.halfPortionEnabled ?? false;
  const quarterEnabled = portionOptions?.quarterPortionEnabled ?? false;
  const halfPrice = basePrice + (portionOptions?.halfPortionSurcharge ?? 0);
  const quarterPrice =
    basePrice + (portionOptions?.quarterPortionSurcharge ?? 0);

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Portion Size</DialogTitle>
          <DialogDescription>
            Choose a portion size for {itemName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2">
          <Button
            variant="outline"
            className="h-16 flex items-center justify-between px-4"
            onClick={() => onConfirm('full')}
          >
            <span className="font-medium">Full Portion</span>
            <span className="font-bold">{formatPrice(basePrice)}</span>
          </Button>
          {halfEnabled && (
            <Button
              variant="outline"
              className="h-16 flex items-center justify-between px-4"
              onClick={() => onConfirm('half')}
            >
              <span className="font-medium">Half Portion (1/2)</span>
              <span className="font-bold">{formatPrice(halfPrice)}</span>
            </Button>
          )}
          {quarterEnabled && (
            <Button
              variant="outline"
              className="h-16 flex items-center justify-between px-4"
              onClick={() => onConfirm('quarter')}
            >
              <span className="font-medium">Quarter Portion (1/4)</span>
              <span className="font-bold">{formatPrice(quarterPrice)}</span>
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
