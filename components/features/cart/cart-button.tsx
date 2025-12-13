'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';

export function CartButton() {
  const { getTotalItems, openCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const totalItems = getTotalItems();

  // Prevent hydration mismatch by only showing cart count after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      data-testid="cart-button"
      onClick={openCart}
      aria-label={mounted ? `Shopping cart with ${totalItems} items` : 'Shopping cart'}
    >
      <ShoppingCart className="h-5 w-5" />
      {mounted && totalItems > 0 && (
        <Badge
          variant="destructive"
          className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
          data-testid="cart-count"
        >
          {totalItems > 99 ? '99+' : totalItems}
        </Badge>
      )}
    </Button>
  );
}
