'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, AlertTriangle } from 'lucide-react';

const priceOverrideSchema = z.object({
  newPrice: z.number().min(0, 'Price cannot be negative'),
  reason: z.string().min(1, 'Reason is required').min(10, 'Reason must be at least 10 characters'),
});

type PriceOverrideFormData = z.infer<typeof priceOverrideSchema>;

interface PriceOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  originalPrice: number;
  currentPrice: number;
  onConfirm: (newPrice: number, reason?: string) => void;
}

export function PriceOverrideDialog({
  open,
  onOpenChange,
  itemName,
  originalPrice,
  currentPrice,
  onConfirm,
}: PriceOverrideDialogProps) {
  const [showWarning, setShowWarning] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<PriceOverrideFormData>({
    resolver: zodResolver(priceOverrideSchema),
    defaultValues: {
      newPrice: currentPrice,
      reason: '',
    },
  });

  const newPrice = watch('newPrice');
  const priceDifference = newPrice - originalPrice;
  const percentageChange = originalPrice > 0 ? ((priceDifference / originalPrice) * 100).toFixed(1) : '0';
  const isSignificantChange = Math.abs(parseFloat(percentageChange)) > 50;

  const onSubmit = (data: PriceOverrideFormData) => {
    if (isSignificantChange && !showWarning) {
      setShowWarning(true);
      return;
    }

    onConfirm(data.newPrice, data.reason);
    reset();
    setShowWarning(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    reset();
    setShowWarning(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Override Price</DialogTitle>
          <DialogDescription>
            Set a custom price for <strong>{itemName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Original Price Display */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Original Price:</span>
              <span className="font-semibold">₦{originalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* New Price Input */}
          <div className="space-y-2">
            <Label htmlFor="newPrice">New Price (₦)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPrice"
                type="number"
                step="0.01"
                className="pl-9"
                {...register('newPrice', { valueAsNumber: true })}
              />
            </div>
            {errors.newPrice && (
              <p className="text-sm text-destructive">{errors.newPrice.message}</p>
            )}
          </div>

          {/* Price Difference Display */}
          {newPrice !== originalPrice && !isNaN(newPrice) && (
            <div className={`p-3 rounded-lg ${
              priceDifference > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {priceDifference > 0 ? 'Markup' : 'Discount'}:
                </span>
                <span className={`font-semibold ${
                  priceDifference > 0 ? 'text-orange-700' : 'text-green-700'
                }`}>
                  {priceDifference > 0 ? '+' : ''}₦{Math.abs(priceDifference).toLocaleString()} ({percentageChange}%)
                </span>
              </div>
            </div>
          )}

          {/* Warning for significant changes */}
          {isSignificantChange && showWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a significant price change ({percentageChange}%). Please confirm this is intentional.
              </AlertDescription>
            </Alert>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              placeholder="e.g., Special discount for loyal customer, damaged item, promotion..."
              rows={3}
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Minimum 10 characters required</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {showWarning ? 'Confirm Override' : 'Apply Override'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
