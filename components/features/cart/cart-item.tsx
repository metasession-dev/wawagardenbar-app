'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCartStore, CartItem as CartItemType } from '@/stores/cart-store';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PriceOverrideDialog } from '@/components/features/admin/price-override-dialog';
import { Minus, Plus, Trash2, MessageSquare, DollarSign } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem, updateInstructions, overrideItemPrice, resetItemPrice } = useCartStore();
  const { user } = useAuth();
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(!!item.specialInstructions);
  const [instructions, setInstructions] = useState(item.specialInstructions || '');
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
  const canOverridePrice = isAdmin && item.allowManualPriceOverride;

  function handleQuantityChange(delta: number) {
    const newQuantity = item.quantity + delta;
    if (newQuantity >= 1) {
      updateQuantity(item.cartItemId, newQuantity);
    }
  }

  function handleInstructionsChange(value: string) {
    setInstructions(value);
    updateInstructions(item.cartItemId, value);
  }

  function handlePriceOverride(newPrice: number, reason?: string) {
    overrideItemPrice(item.cartItemId, newPrice, reason);
  }

  function handleResetPrice() {
    resetItemPrice(item.cartItemId);
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  }

  const itemTotal = item.price * item.quantity;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex gap-3">
        {/* Image */}
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <span className="text-2xl">🍽️</span>
            </div>
          )}
        </div>

        {/* Item Details */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <h4 className="font-medium leading-tight">
              {(() => {
                let portionPrefix = '';
                if (item.portionSize === 'half') {
                  portionPrefix = '1/2 ';
                } else if (item.portionSize === 'quarter') {
                  portionPrefix = '1/4 ';
                }
                return portionPrefix + item.name;
              })()}
            </h4>
            <p className="text-sm text-muted-foreground">{item.category}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold">{formatPrice(itemTotal)}</span>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm text-muted-foreground">
                {formatPrice(item.price)} each
              </span>
              {item.priceOverridden && item.originalPrice && (
                <span className="text-xs text-orange-600 line-through">
                  {formatPrice(item.originalPrice)} original
                </span>
              )}
            </div>
          </div>

          {/* Price Override Badge */}
          {item.priceOverridden && (
            <Badge variant="outline" className="text-xs border-orange-600 text-orange-600">
              <DollarSign className="h-3 w-3 mr-1" />
              Price Overridden
            </Badge>
          )}
        </div>
      </div>

      {/* Price Override Button (Admin Only) */}
      {canOverridePrice && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOverrideDialogOpen(true)}
            className="flex-1"
          >
            <DollarSign className="h-4 w-4 mr-1" />
            {item.priceOverridden ? 'Edit Price' : 'Override Price'}
          </Button>
          {item.priceOverridden && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetPrice}
            >
              Reset
            </Button>
          )}
        </div>
      )}

      {/* Quantity Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(-1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeItem(item.cartItemId)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Remove
        </Button>
      </div>

      {/* Special Instructions */}
      <Collapsible open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <MessageSquare className="mr-2 h-4 w-4" />
            {item.specialInstructions ? 'Edit' : 'Add'} Special Instructions
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <Label htmlFor={`instructions-${item.id}`} className="text-xs">
            Dietary requirements or special requests
          </Label>
          <Textarea
            id={`instructions-${item.id}`}
            placeholder="e.g., No onions, extra spicy..."
            value={instructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            rows={2}
            maxLength={200}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {instructions.length}/200 characters
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Price Override Dialog */}
      {canOverridePrice && (
        <PriceOverrideDialog
          open={overrideDialogOpen}
          onOpenChange={setOverrideDialogOpen}
          itemName={item.name}
          originalPrice={item.originalPrice || item.price}
          currentPrice={item.price}
          onConfirm={handlePriceOverride}
        />
      )}
    </div>
  );
}
