'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface CartSummaryProps {
  orderType?: 'dine-in' | 'pickup' | 'delivery';
  showFees?: boolean;
}

/**
 * REQ-061 — Fee config fetched from /api/settings on mount. The endpoint
 * already exists and is unauthenticated; it exposes deliveryFeeBase,
 * deliveryFeeReduced, freeDeliveryThreshold, serviceFeePercentage,
 * taxPercentage, taxEnabled, and minimumOrderAmount. Falls back to the
 * hardcoded prior values on fetch failure so an outage doesn't break
 * the cart.
 */
interface FeeConfig {
  deliveryFeeBase: number;
  deliveryFeeReduced: number;
  freeDeliveryThreshold: number;
  serviceFeePercentage: number;
  taxPercentage: number;
  taxEnabled: boolean;
  minimumOrderAmount: number;
}

const FALLBACK_FEES: FeeConfig = {
  deliveryFeeBase: 1000,
  deliveryFeeReduced: 500,
  freeDeliveryThreshold: 2000,
  serviceFeePercentage: 0.02,
  taxPercentage: 0.075,
  taxEnabled: false,
  minimumOrderAmount: 1000,
};

export function CartSummary({
  orderType = 'dine-in',
  showFees = false,
}: CartSummaryProps) {
  const { getTotalPrice, getTotalItems } = useCartStore();
  const [fees, setFees] = useState<FeeConfig>(FALLBACK_FEES);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body?.success || !body.data) return;
        setFees({
          deliveryFeeBase:
            body.data.deliveryFeeBase ?? FALLBACK_FEES.deliveryFeeBase,
          deliveryFeeReduced:
            body.data.deliveryFeeReduced ?? FALLBACK_FEES.deliveryFeeReduced,
          freeDeliveryThreshold:
            body.data.freeDeliveryThreshold ??
            FALLBACK_FEES.freeDeliveryThreshold,
          serviceFeePercentage:
            body.data.serviceFeePercentage ??
            FALLBACK_FEES.serviceFeePercentage,
          taxPercentage: body.data.taxPercentage ?? FALLBACK_FEES.taxPercentage,
          taxEnabled: body.data.taxEnabled ?? FALLBACK_FEES.taxEnabled,
          minimumOrderAmount:
            body.data.minimumOrderAmount ?? FALLBACK_FEES.minimumOrderAmount,
        });
      })
      .catch(() => {
        // Fetch failure: keep fallback values; no UI noise.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = getTotalPrice();
  const totalItems = getTotalItems();

  // REQ-061 — derived from fetched settings rather than hardcoded.
  let deliveryFee = 0;
  let serviceFee = 0;
  let tax = 0;

  if (orderType === 'delivery') {
    deliveryFee =
      subtotal >= fees.freeDeliveryThreshold
        ? fees.deliveryFeeReduced
        : fees.deliveryFeeBase;
  }
  serviceFee = Math.round(subtotal * fees.serviceFeePercentage);
  if (fees.taxEnabled) {
    tax = Math.round(subtotal * fees.taxPercentage);
  }

  const total = subtotal + deliveryFee + serviceFee + tax;

  // REQ-061 — minimum order derived from settings + delivery free-threshold
  // (delivery orders bump the minimum to the free-delivery threshold to
  // preserve the previous "pickup ₦1000 / delivery ₦2000" UX).
  const minimumOrders: Record<
    NonNullable<CartSummaryProps['orderType']>,
    number
  > = {
    'dine-in': 0,
    pickup: fees.minimumOrderAmount,
    delivery: Math.max(fees.minimumOrderAmount, fees.freeDeliveryThreshold),
  };

  const minimum = minimumOrders[orderType];
  const meetsMinimum = subtotal >= minimum;
  const remaining = minimum - subtotal;
  const serviceFeeLabel = `Service Fee (${(fees.serviceFeePercentage * 100).toFixed(0)}%)`;

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  }

  return (
    <div className="space-y-3">
      {/* Item Count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Items</span>
        <span className="font-medium">{totalItems}</span>
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-semibold">{formatPrice(subtotal)}</span>
      </div>

      {showFees && (
        <>
          {/* Delivery Fee */}
          {orderType === 'delivery' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
          )}

          {/* Service Fee */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{serviceFeeLabel}</span>
            <span>{formatPrice(serviceFee)}</span>
          </div>

          {/* Tax */}
          {fees.taxEnabled && tax > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Tax ({(fees.taxPercentage * 100).toFixed(1)}%)
              </span>
              <span>{formatPrice(tax)}</span>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold">Total</span>
            <span className="font-bold">{formatPrice(total)}</span>
          </div>
        </>
      )}

      {/* Minimum Order Warning */}
      {!meetsMinimum && minimum > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Minimum Order Not Met
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Add {formatPrice(remaining)} more to meet the minimum order of{' '}
                {formatPrice(minimum)} for {orderType}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Free Delivery Badge */}
      {orderType === 'delivery' &&
        subtotal >= fees.freeDeliveryThreshold &&
        showFees && (
          <Badge variant="secondary" className="w-full justify-center">
            🎉 Free Delivery Unlocked!
          </Badge>
        )}
    </div>
  );
}
