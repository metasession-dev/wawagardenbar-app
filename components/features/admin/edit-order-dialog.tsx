'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  updateOrderItemsAction,
  getAvailableMenuItemsAction,
} from '@/app/actions/admin/order-edit-actions';
import { Loader2, Plus, Trash2, Minus, ShoppingCart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditOrderDialogProps {
  orderId: string;
  currentItems: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    portionSize?: 'full' | 'half';
    customizations?: Array<{
      name: string;
      option: string;
      price: number;
    }>;
    specialInstructions?: string;
  }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string;
}

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  portionSize?: 'full' | 'half';
  customizations?: Array<{
    name: string;
    option: string;
    price: number;
  }>;
  specialInstructions?: string;
}

export function EditOrderDialog({
  orderId,
  currentItems,
  open,
  onOpenChange,
}: EditOrderDialogProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [availableMenuItems, setAvailableMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMenu, setIsFetchingMenu] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Initialize items from current order
  useEffect(() => {
    if (open) {
      setItems(
        currentItems.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          portionSize: item.portionSize || 'full',
          customizations: item.customizations || [],
          specialInstructions: item.specialInstructions || '',
        }))
      );
      fetchMenuItems();
    }
  }, [open, currentItems]);

  async function fetchMenuItems() {
    setIsFetchingMenu(true);
    try {
      const result = await getAvailableMenuItemsAction();
      if (result.success && result.data) {
        setAvailableMenuItems(result.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load menu items',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingMenu(false);
    }
  }

  function handleQuantityChange(index: number, newQuantity: number) {
    if (newQuantity < 1) return;
    const newItems = [...items];
    newItems[index].quantity = newQuantity;
    setItems(newItems);
  }

  function handleRemoveItem(index: number) {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  }

  function handleAddItem(menuItemId: string) {
    const menuItem = availableMenuItems.find((mi) => mi._id === menuItemId);
    if (!menuItem) return;

    // Check if item already exists
    const existingIndex = items.findIndex(
      (item) => item.menuItemId === menuItemId
    );

    if (existingIndex >= 0) {
      // Increment quantity
      handleQuantityChange(existingIndex, items[existingIndex].quantity + 1);
    } else {
      // Add new item
      setItems([
        ...items,
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          customizations: [],
          specialInstructions: '',
        },
      ]);
    }
  }

  async function handleSave() {
    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Order must have at least one item',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateOrderItemsAction({
        orderId,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          portionSize: item.portionSize,
          customizations: item.customizations,
          specialInstructions: item.specialInstructions,
        })),
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Order updated successfully',
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update order',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Order Items</DialogTitle>
          <DialogDescription>
            Add, remove, or change quantities of items in this order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Item Section */}
          <div className="space-y-2">
            <Label>Add Item</Label>
            <Select onValueChange={handleAddItem} disabled={isFetchingMenu}>
              <SelectTrigger>
                <SelectValue placeholder="Select item to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableMenuItems.map((menuItem) => (
                  <SelectItem key={menuItem._id} value={menuItem._id}>
                    {menuItem.name} - ₦{menuItem.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Current Items */}
          <div className="space-y-2">
            <Label>Order Items</Label>
            <ScrollArea className="h-[300px] border rounded-md p-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-2" />
                  <p>No items in order</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-md"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {item.portionSize === 'half' && (
                            <Badge variant="secondary" className="text-xs">Half</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ₦{item.price.toLocaleString()} each
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() =>
                            handleQuantityChange(index, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              index,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-16 text-center"
                          min={1}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() =>
                            handleQuantityChange(index, item.quantity + 1)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Item Total */}
                      <div className="w-24 text-right font-medium">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </div>

                      {/* Remove Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Subtotal */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Subtotal:</span>
            <span className="text-lg font-bold">
              ₦{subtotal.toLocaleString()}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            Note: Service fees, delivery fees, and taxes will be recalculated
            automatically based on the new subtotal.
          </p>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || items.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
