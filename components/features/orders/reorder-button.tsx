'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/hooks/use-toast';
import type { IOrder } from '@/interfaces';

/**
 * @requirement REQ-062 — Reorder button (P1 #9).
 *
 * v1 naïve add: clones the historical order's items into the cart and
 * navigates to /cart. Uses the order item's own snapshot of name, price,
 * quantity, portionSize, customizations — does NOT re-resolve against
 * the current menu (out-of-stock items / deleted items / price changes
 * aren't detected here). A future REQ can layer menu-state resolution
 * on top.
 *
 * Order items don't carry `category` / `preparationTime` (those are
 * menu-item fields, not order-snapshot fields). v1 supplies sensible
 * defaults so the cart can render; the customer can adjust quantities
 * and proceed normally.
 */
interface ReorderButtonProps {
  order: Pick<IOrder, 'items' | 'orderNumber'>;
}

export function ReorderButton({ order }: ReorderButtonProps) {
  const router = useRouter();
  const { clearCart, addItem } = useCartStore();
  const { toast } = useToast();

  const handleReorder = () => {
    clearCart();
    for (const item of order.items) {
      addItem({
        id: item.menuItemId.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        portionSize: item.portionSize,
        portionMultiplier: item.portionMultiplier,
        category: '',
        preparationTime: 0,
        specialInstructions: item.specialInstructions,
        // Order item's customization snapshot already matches
        // SelectedCustomization's { name, option, price } shape.
        customizations: item.customizations,
      });
    }
    toast({
      title: 'Items added to cart',
      description: `${order.items.length} item${order.items.length === 1 ? '' : 's'} from order #${order.orderNumber} added.`,
    });
    router.push('/cart');
  };

  return (
    <Button variant="outline" onClick={handleReorder}>
      Reorder
    </Button>
  );
}
