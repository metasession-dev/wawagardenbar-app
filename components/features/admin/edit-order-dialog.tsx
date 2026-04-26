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
import { CustomizationPickerDialog } from '@/components/features/menu/customization-picker-dialog';
import {
  summariseSelected,
  type SelectedCustomization,
} from '@/lib/customization-validation';
import type { ICustomization } from '@/interfaces/menu-item.interface';

interface EditOrderDialogProps {
  orderId: string;
  currentItems: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    portionSize?: 'full' | 'half' | 'quarter';
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
  customizations?: ICustomization[];
}

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  portionSize?: 'full' | 'half' | 'quarter';
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
  // REQ-031: when a selected menu item has customization groups, open the
  // sub-dialog picker before pushing the line.
  const [pickerMenuItem, setPickerMenuItem] = useState<MenuItem | null>(null);
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

  function customizationsKey(c?: SelectedCustomization[]): string {
    if (!c || c.length === 0) return '';
    return [...c]
      .sort((a, b) =>
        `${a.name}|${a.option}`.localeCompare(`${b.name}|${b.option}`)
      )
      .map((s) => `${s.name}:${s.option}:${s.price}`)
      .join(',');
  }

  function pushItem(
    menuItem: MenuItem,
    customizations?: SelectedCustomization[]
  ) {
    const key = customizationsKey(customizations);
    const existingIndex = items.findIndex(
      (item) =>
        item.menuItemId === menuItem._id &&
        customizationsKey(item.customizations) === key
    );

    if (existingIndex >= 0) {
      // Same item + same customizations → increment quantity
      handleQuantityChange(existingIndex, items[existingIndex].quantity + 1);
      return;
    }

    setItems([
      ...items,
      {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        customizations: customizations ?? [],
        specialInstructions: '',
      },
    ]);
  }

  function handleAddItem(menuItemId: string) {
    const menuItem = availableMenuItems.find((mi) => mi._id === menuItemId);
    if (!menuItem) return;

    // REQ-031: if the menu item has customization groups, open the picker
    // sub-dialog and let the staff pick before pushing the line.
    if (menuItem.customizations && menuItem.customizations.length > 0) {
      setPickerMenuItem(menuItem);
      return;
    }

    pushItem(menuItem);
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

  // REQ-031: surcharge-aware subtotal display in the dialog. Server-side
  // recompute is the source of truth; this matches it for visual consistency.
  const subtotal = items.reduce((sum, item) => {
    const surcharge = (item.customizations ?? []).reduce(
      (s, c) => s + (typeof c.price === 'number' ? c.price : 0),
      0
    );
    return sum + (item.price + surcharge) * item.quantity;
  }, 0);

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
                            <Badge variant="secondary" className="text-xs">
                              Half
                            </Badge>
                          )}
                          {item.portionSize === 'quarter' && (
                            <Badge variant="secondary" className="text-xs">
                              Quarter
                            </Badge>
                          )}
                        </div>
                        {item.customizations &&
                          item.customizations.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {summariseSelected(item.customizations)}
                            </p>
                          )}
                        <p className="text-sm text-muted-foreground">
                          ₦
                          {(
                            item.price +
                            (item.customizations ?? []).reduce(
                              (s, c) =>
                                s + (typeof c.price === 'number' ? c.price : 0),
                              0
                            )
                          ).toLocaleString()}{' '}
                          each
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

                      {/* Item Total — REQ-031: surcharge-aware */}
                      <div className="w-24 text-right font-medium">
                        ₦
                        {(
                          (item.price +
                            (item.customizations ?? []).reduce(
                              (s, c) =>
                                s + (typeof c.price === 'number' ? c.price : 0),
                              0
                            )) *
                          item.quantity
                        ).toLocaleString()}
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
            <Button
              onClick={handleSave}
              disabled={isLoading || items.length === 0}
            >
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

      {/* REQ-031: sub-dialog picker (modal-on-modal per D9) for adding a line
          with customizations. Radix Dialog supports nested instances. */}
      {pickerMenuItem && (
        <CustomizationPickerDialog
          open={!!pickerMenuItem}
          onOpenChange={(open) => !open && setPickerMenuItem(null)}
          itemName={pickerMenuItem.name}
          groups={pickerMenuItem.customizations ?? []}
          onConfirm={(selected) => {
            pushItem(pickerMenuItem, selected);
            setPickerMenuItem(null);
          }}
          confirmLabel="Add to Order"
        />
      )}
    </Dialog>
  );
}
