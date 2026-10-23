'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const conversionRateSchema = z.object({
  rate: z
    .number()
    .min(1, 'Rate must be at least 1')
    .max(1000, 'Rate must not exceed 1000'),
  reason: z.string().optional(),
});

type ConversionRateFormData = z.infer<typeof conversionRateSchema>;

interface ImpactData {
  currentRate: number;
  newRate: number;
  affectedMenuItems: number;
  exampleChanges: Array<{
    itemName: string;
    price: number;
    currentPoints: number;
    newPoints: number;
  }>;
  customerImpact: string;
}

/**
 * Points conversion rate settings component
 */
export function PointsConversionSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [currentRate, setCurrentRate] = useState(100);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [pendingRate, setPendingRate] = useState<number>(0);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ConversionRateFormData>({
    resolver: zodResolver(conversionRateSchema),
    defaultValues: {
      rate: 100,
      reason: '',
    },
  });

  const rate = watch('rate');

  // Fetch current conversion rate
  useEffect(() => {
    async function fetchRate() {
      try {
        const response = await fetch('/api/settings/points-conversion-rate');
        const data = await response.json();
        setCurrentRate(data.rate || 100);
        setValue('rate', data.rate || 100);
        setLastUpdated(
          data.updatedAt ? new Date(data.updatedAt).toLocaleString() : ''
        );
      } catch (error) {
        console.error('Failed to fetch conversion rate:', error);
        toast({
          title: 'Error',
          description: 'Failed to load conversion rate',
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    }
    fetchRate();
  }, [setValue, toast]);

  // Fetch impact analysis when rate changes
  useEffect(() => {
    if (rate && rate !== currentRate && rate >= 1 && rate <= 1000) {
      const timer = setTimeout(async () => {
        try {
          const response = await fetch(
            `/api/admin/settings/points-conversion-rate/impact?newRate=${rate}`
          );
          const data = await response.json();
          setImpactData(data);
        } catch (error) {
          console.error('Failed to fetch impact analysis:', error);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setImpactData(null);
      return;
    }
  }, [rate, currentRate]);

  async function onSubmit(data: ConversionRateFormData) {
    if (data.rate === currentRate) {
      toast({
        title: 'No Changes',
        description: 'The rate is already set to this value',
      });
      return;
    }

    // Show confirmation dialog
    setPendingRate(data.rate);
    setShowConfirmDialog(true);
  }

  async function confirmUpdate() {
    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      const response = await fetch(
        '/api/admin/settings/points-conversion-rate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rate: pendingRate,
            reason: watch('reason') || 'Rate updated',
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setCurrentRate(result.rate);
        setValue('rate', result.rate);
        setLastUpdated(new Date().toLocaleString());
        toast({
          title: 'Success',
          description: `Conversion rate updated to ${result.rate} points = ₦1`,
        });
        reset({ rate: result.rate, reason: '' });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update conversion rate',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating conversion rate:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setValue('rate', 100);
    setValue('reason', 'Reset to default');
  }

  if (isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Points Conversion Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Points Conversion Settings</CardTitle>
          <CardDescription>
            Configure how many loyalty points equal ₦1 when customers redeem
            points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Rate Display */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Rate</p>
                  <p className="text-2xl font-bold">
                    {currentRate} points = ₦1
                  </p>
                </div>
                {lastUpdated && (
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Last updated</p>
                    <p>{lastUpdated}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Rate Input */}
            <div className="space-y-2">
              <Label htmlFor="rate">Points to Naira Conversion Rate *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="rate"
                  type="number"
                  {...register('rate', { valueAsNumber: true })}
                  placeholder="100"
                  disabled={isLoading}
                  className="max-w-xs"
                />
                <span className="text-sm text-muted-foreground">
                  points = ₦1
                </span>
              </div>
              {errors.rate && (
                <p className="text-sm text-destructive">
                  {errors.rate.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This rate determines how many loyalty points equal ₦1 when
                customers redeem points for items.
              </p>
            </div>

            {/* Examples */}
            {rate && rate > 0 && (
              <div className="space-y-2">
                <Label>Examples with current rate:</Label>
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <p>• {(rate * 10).toLocaleString()} points = ₦10</p>
                  <p>• {(rate * 100).toLocaleString()} points = ₦100</p>
                  <p>• {(rate * 1000).toLocaleString()} points = ₦1,000</p>
                </div>
              </div>
            )}

            {/* Impact Analysis */}
            {impactData && impactData.newRate !== impactData.currentRate && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="font-medium text-sm">Impact Analysis</p>
                    <div className="text-sm space-y-1">
                      <p>
                        • {impactData.affectedMenuItems} menu items have points
                        redemption enabled
                      </p>
                      <p className="font-medium">
                        • {impactData.customerImpact}
                      </p>
                      {impactData.newRate < impactData.currentRate && (
                        <p className="text-green-700 dark:text-green-400">
                          Items will cost FEWER points to redeem
                        </p>
                      )}
                      {impactData.newRate > impactData.currentRate && (
                        <p className="text-red-700 dark:text-red-400">
                          Items will cost MORE points to redeem
                        </p>
                      )}
                    </div>
                    {impactData.exampleChanges.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium">Example changes:</p>
                        {impactData.exampleChanges.map((change, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-white dark:bg-gray-900 rounded p-2"
                          >
                            <p className="font-medium">
                              {change.itemName} (₦
                              {change.price.toLocaleString()})
                            </p>
                            <p>
                              {change.currentPoints.toLocaleString()} points →{' '}
                              {change.newPoints.toLocaleString()} points
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Change (Optional)</Label>
              <Input
                id="reason"
                {...register('reason')}
                placeholder="e.g., Adjusted for better customer value"
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isLoading || rate === currentRate}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Default (100)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ⚠️ Confirm Conversion Rate Change
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are changing the conversion rate from:</p>
                <p className="font-medium text-foreground">
                  {currentRate} points = ₦1 → {pendingRate} points = ₦1
                </p>
                {impactData && (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-foreground">Impact:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        {impactData.affectedMenuItems} menu items have points
                        redemption enabled
                      </li>
                      <li>{impactData.customerImpact}</li>
                      {pendingRate < currentRate ? (
                        <li className="text-green-600 dark:text-green-400">
                          Items will cost FEWER points to redeem
                        </li>
                      ) : (
                        <li className="text-red-600 dark:text-red-400">
                          Items will cost MORE points to redeem
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                <p className="text-muted-foreground">
                  This change will affect all future redemptions. Existing
                  points balances remain unchanged.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdate}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
