'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MenuItemWithStock } from '@/services/category-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Minus, Plus, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCartStore } from '@/stores/cart-store';
import { validateCartItem } from '@/app/actions/cart/cart-actions';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

interface MenuItemDetailModalProps {
  item: MenuItemWithStock;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MenuItemDetailModal({ item, open, onOpenChange }: MenuItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [portionSize, setPortionSize] = useState<'full' | 'half' | 'quarter'>('full');
  const [adjustedPrice, setAdjustedPrice] = useState(item.price);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const { addItem, openCart } = useCartStore();
  const { session } = useAuth();
  const router = useRouter();

  // Update price when portion changes
  useEffect(() => {
    if (item.portionOptions?.halfPortionEnabled && portionSize === 'half') {
      const basePrice = Math.round(item.price * 0.5);
      const surcharge = item.portionOptions?.halfPortionSurcharge || 0;
      setAdjustedPrice(basePrice + surcharge);
    } else if (item.portionOptions?.quarterPortionEnabled && portionSize === 'quarter') {
      const basePrice = Math.round(item.price * 0.25);
      const surcharge = item.portionOptions?.quarterPortionSurcharge || 0;
      setAdjustedPrice(basePrice + surcharge);
    } else {
      setAdjustedPrice(item.price);
    }
  }, [portionSize, item.price, item.portionOptions]);

  const isOutOfStock = item.stockStatus === 'out-of-stock';
  const isLowStock = item.stockStatus === 'low-stock';

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  }

  function handleQuantityChange(delta: number) {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  }

  async function handleAddToCart() {
    // Check if user is logged in (customers, admins, and super-admins can all add to cart)
    // Admin users who logged in via /admin/login should have session.isLoggedIn = true
    if (!session?.isLoggedIn && !session?.userId) {
      toast({
        title: 'Login Required',
        description: 'Please register to continue',
      });
      router.push('/login?redirect=/menu');
      return;
    }

    setIsAdding(true);
    
    try {
      // Validate item availability with portion size
      const validation = await validateCartItem(item._id, quantity, portionSize);
      
      if (!validation.success) {
        toast({
          title: 'Cannot Add to Cart',
          description: validation.message,
          variant: 'destructive',
        });
        setIsAdding(false);
        return;
      }

      // Add to cart with portion size
      addItem({
        id: item._id,
        name: item.name,
        price: adjustedPrice,
        quantity,
        portionSize,
        portionMultiplier: portionSize === 'half' ? 0.5 : portionSize === 'quarter' ? 0.25 : 1.0,
        image: item.images?.[0],
        category: item.category,
        specialInstructions: specialInstructions || undefined,
        preparationTime: item.preparationTime,
      });

      const portionText = portionSize === 'half' ? ' (Half Portion)' : portionSize === 'quarter' ? ' (Quarter Portion)' : '';
      toast({
        title: 'Added to Cart',
        description: `${quantity}x ${item.name}${portionText} added to your cart`,
        duration: 2000,
      });

      // Open cart sidebar
      openCart();
      
      // Close modal and reset
      onOpenChange(false);
      setQuantity(1);
      setSpecialInstructions('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item to cart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setQuantity(1);
    setPortionSize('full');
    setSpecialInstructions('');
  }

  const totalPrice = adjustedPrice * quantity;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.category}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Gallery */}
          {item.images && item.images.length > 0 && (
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <Image
                src={item.images[0]}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Stock Status */}
          {(isOutOfStock || isLowStock) && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 ${
                isOutOfStock
                  ? 'border-destructive/50 bg-destructive/10 text-destructive'
                  : 'border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {isOutOfStock ? 'Out of Stock' : `Low Stock - Only ${item.currentStock} left`}
              </span>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="mb-2 font-semibold">Description</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>

          {/* Nutritional Info */}
          {item.nutritionalInfo && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 font-semibold">Nutritional Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  {item.nutritionalInfo.calories && (
                    <div>
                      <p className="text-muted-foreground">Calories</p>
                      <p className="font-medium">{item.nutritionalInfo.calories} kcal</p>
                    </div>
                  )}
                  {item.nutritionalInfo.protein && (
                    <div>
                      <p className="text-muted-foreground">Protein</p>
                      <p className="font-medium">{item.nutritionalInfo.protein}g</p>
                    </div>
                  )}
                  {item.nutritionalInfo.carbs && (
                    <div>
                      <p className="text-muted-foreground">Carbs</p>
                      <p className="font-medium">{item.nutritionalInfo.carbs}g</p>
                    </div>
                  )}
                  {item.nutritionalInfo.fat && (
                    <div>
                      <p className="text-muted-foreground">Fat</p>
                      <p className="font-medium">{item.nutritionalInfo.fat}g</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 font-semibold">Allergen Information</h3>
                <div className="flex flex-wrap gap-2">
                  {item.allergens.map((allergen) => (
                    <Badge key={allergen} variant="destructive">
                      {allergen}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Preparation Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Preparation time: {item.preparationTime} minutes</span>
          </div>

          <Separator />

          {/* Portion Size Selector - Only for food items with portion options enabled */}
          {item.mainCategory === 'food' && (item.portionOptions?.halfPortionEnabled || item.portionOptions?.quarterPortionEnabled) && (
            <div>
              <Label className="mb-3 block font-semibold">Portion Size</Label>
              <RadioGroup value={portionSize} onValueChange={(value) => setPortionSize(value as 'full' | 'half' | 'quarter')}>
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="flex-1 cursor-pointer font-normal">
                    <div className="flex items-center justify-between">
                      <span>Full Portion</span>
                      <span className="font-semibold">{formatPrice(item.price)}</span>
                    </div>
                  </Label>
                </div>
                {item.portionOptions?.halfPortionEnabled && (
                  <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
                    <RadioGroupItem value="half" id="half" />
                    <Label htmlFor="half" className="flex-1 cursor-pointer font-normal">
                      <div className="flex items-center justify-between">
                        <span>Half Portion (50%)</span>
                        <span className="font-semibold">{formatPrice(Math.round(item.price * 0.5) + (item.portionOptions?.halfPortionSurcharge || 0))}</span>
                      </div>
                    </Label>
                  </div>
                )}
                {item.portionOptions?.quarterPortionEnabled && (
                  <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
                    <RadioGroupItem value="quarter" id="quarter" />
                    <Label htmlFor="quarter" className="flex-1 cursor-pointer font-normal">
                      <div className="flex items-center justify-between">
                        <span>Quarter Portion (25%)</span>
                        <span className="font-semibold">{formatPrice(Math.round(item.price * 0.25) + (item.portionOptions?.quarterPortionSurcharge || 0))}</span>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <Label htmlFor="quantity" className="mb-2 block">
              Quantity
            </Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-lg font-semibold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99 || (isLowStock && quantity >= (item.currentStock || 0))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <Label htmlFor="instructions" className="mb-2 block">
              Special Instructions (Optional)
            </Label>
            <Textarea
              id="instructions"
              placeholder="Any dietary requirements or special requests..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {specialInstructions.length}/200 characters
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center justify-between sm:justify-start">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="ml-2 text-2xl font-bold">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleAddToCart} disabled={isOutOfStock || isAdding}>
              <Plus className="mr-2 h-4 w-4" />
              {isAdding ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
