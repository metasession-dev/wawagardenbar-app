'use client';

import { useCartStore } from '@/stores/cart-store';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CartItem } from './cart-item';
import { CartSummary } from './cart-summary';
import { EmptyState } from '@/components/shared/ui';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CartSidebar() {
  const { items, isOpen, closeCart, getTotalItems } = useCartStore();
  const router = useRouter();

  function handleCheckout() {
    closeCart();
    router.push('/checkout');
  }

  const totalItems = getTotalItems();

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Review your items and proceed to checkout
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              description="Add items from the menu to get started"
            />
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <CartItem key={item.cartItemId} item={item} />
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Cart Summary */}
            <div className="space-y-4 py-4">
              <CartSummary />

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={closeCart}
              >
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
