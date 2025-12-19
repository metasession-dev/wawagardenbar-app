'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { updateMenuItemPriceAction } from '@/app/actions/admin/price-management-actions';
import { PriceChangeReason } from '@/interfaces';

interface PriceUpdateFormProps {
  menuItemId: string;
  currentPrice: number;
  currentCostPerUnit: number;
  menuItemName: string;
  onPriceUpdated?: () => void;
}

const PRICE_CHANGE_REASONS: { value: PriceChangeReason; label: string }[] = [
  { value: 'supplier_increase', label: 'Supplier Price Increase' },
  { value: 'supplier_decrease', label: 'Supplier Price Decrease' },
  { value: 'promotion', label: 'Promotional Pricing' },
  { value: 'seasonal', label: 'Seasonal Adjustment' },
  { value: 'market_adjustment', label: 'Market Adjustment' },
  { value: 'cost_optimization', label: 'Cost Optimization' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
];

export function PriceUpdateForm({
  menuItemId,
  currentPrice,
  currentCostPerUnit,
  menuItemName,
  onPriceUpdated,
}: PriceUpdateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    price: currentPrice.toString(),
    costPerUnit: currentCostPerUnit.toString(),
    reason: '' as PriceChangeReason,
  });

  const newPrice = parseFloat(formData.price) || 0;
  const newCost = parseFloat(formData.costPerUnit) || 0;
  const newMargin = newPrice > 0 ? ((newPrice - newCost) / newPrice) * 100 : 0;
  const currentMargin =
    currentPrice > 0 ? ((currentPrice - currentCostPerUnit) / currentPrice) * 100 : 0;

  const priceChanged = newPrice !== currentPrice;
  const costChanged = newCost !== currentCostPerUnit;
  const hasChanges = priceChanged || costChanged;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.reason) {
      setError('Please select a reason for the price change');
      return;
    }

    if (!hasChanges) {
      setError('No changes detected. Please update price or cost.');
      return;
    }

    if (newPrice <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    if (newCost < 0) {
      setError('Cost per unit cannot be negative');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateMenuItemPriceAction({
        menuItemId,
        price: newPrice,
        costPerUnit: newCost,
        reason: formData.reason,
      });

      if (result.success) {
        setSuccess(true);
        // Call the callback to refresh price history
        if (onPriceUpdated) {
          onPriceUpdated();
        }
        setTimeout(() => {
          router.refresh();
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || 'Failed to update price');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Price Management
        </CardTitle>
        <CardDescription>
          Update pricing and cost information for {menuItemName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Values Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold">₦{currentPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Cost</p>
              <p className="text-2xl font-bold">₦{currentCostPerUnit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Margin</p>
              <p className="text-2xl font-bold">{currentMargin.toFixed(1)}%</p>
            </div>
          </div>

          {/* New Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">New Price (₦)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Enter new price"
              required
            />
          </div>

          {/* New Cost Input */}
          <div className="space-y-2">
            <Label htmlFor="costPerUnit">New Cost Per Unit (₦)</Label>
            <Input
              id="costPerUnit"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPerUnit}
              onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
              placeholder="Enter new cost per unit"
              required
            />
          </div>

          {/* Reason Selector */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) =>
                setFormData({ ...formData, reason: value as PriceChangeReason })
              }
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_CHANGE_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Margin Preview */}
          {hasChanges && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  New Profit Margin Preview
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 dark:text-blue-300">New Price</p>
                  <p className="font-bold text-blue-900 dark:text-blue-100">
                    ₦{newPrice.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700 dark:text-blue-300">New Cost</p>
                  <p className="font-bold text-blue-900 dark:text-blue-100">
                    ₦{newCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700 dark:text-blue-300">New Margin</p>
                  <p className="font-bold text-blue-900 dark:text-blue-100">
                    {newMargin.toFixed(1)}%
                  </p>
                  <p
                    className={`text-xs ${
                      newMargin > currentMargin ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {newMargin > currentMargin ? '↑' : '↓'}{' '}
                    {Math.abs(newMargin - currentMargin).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>Price updated successfully!</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={isSubmitting || !hasChanges} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Price...
              </>
            ) : (
              'Update Price & Cost'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
