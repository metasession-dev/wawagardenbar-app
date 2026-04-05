'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { createMenuItemAction } from '@/app/actions/admin/menu-actions';
import { IMenuSettings } from '@/interfaces/menu-settings.interface';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  mainCategory: z.enum(['food', 'drinks']),
  category: z.string().min(1, 'Category is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  preparationTime: z
    .number()
    .min(1, 'Preparation time must be at least 1 minute'),
  isAvailable: z.boolean(),
  halfPortionEnabled: z.boolean(),
  halfPortionSurcharge: z.number().min(0, 'Surcharge must be 0 or greater'),
  quarterPortionEnabled: z.boolean(),
  quarterPortionSurcharge: z.number().min(0, 'Surcharge must be 0 or greater'),
  allowManualPriceOverride: z.boolean(),
  tags: z.string().optional(),
  trackInventory: z.boolean(),
  currentStock: z.number().min(0).optional(),
  minimumStock: z.number().min(0).optional(),
  maximumStock: z.number().min(0).optional(),
  unit: z.string().optional(),
  supplier: z.string().optional(),
  preventOrdersWhenOutOfStock: z.boolean().optional(),
  crateSize: z.number().min(1).optional(),
  packagingType: z.string().optional(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface MenuItemFormProps {
  availableCategories?: IMenuSettings;
}

/**
 * Menu item form component
 */
export function MenuItemForm({ availableCategories }: MenuItemFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      description: '',
      mainCategory: 'food',
      category: '',
      price: 0,
      preparationTime: 15,
      isAvailable: true,
      halfPortionEnabled: false,
      halfPortionSurcharge: 0,
      quarterPortionEnabled: false,
      quarterPortionSurcharge: 0,
      allowManualPriceOverride: false,
      tags: '',
      trackInventory: false,
      currentStock: 0,
      minimumStock: 10,
      maximumStock: 100,
      unit: 'units',
      supplier: '',
      preventOrdersWhenOutOfStock: false,
    },
  });

  const mainCategory = watch('mainCategory');
  const isAvailable = watch('isAvailable');
  const halfPortionEnabled = watch('halfPortionEnabled');
  const halfPortionSurcharge = watch('halfPortionSurcharge');
  const quarterPortionEnabled = watch('quarterPortionEnabled');
  const quarterPortionSurcharge = watch('quarterPortionSurcharge');
  const trackInventory = watch('trackInventory');
  const price = watch('price');

  async function onSubmit(data: MenuItemFormData) {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('mainCategory', data.mainCategory);
      formData.append('category', data.category);
      formData.append('price', data.price.toString());
      formData.append('preparationTime', data.preparationTime.toString());
      formData.append('isAvailable', data.isAvailable.toString());
      formData.append('halfPortionEnabled', data.halfPortionEnabled.toString());
      formData.append(
        'halfPortionSurcharge',
        data.halfPortionSurcharge.toString()
      );
      formData.append(
        'quarterPortionEnabled',
        data.quarterPortionEnabled.toString()
      );
      formData.append(
        'quarterPortionSurcharge',
        data.quarterPortionSurcharge.toString()
      );
      formData.append(
        'allowManualPriceOverride',
        data.allowManualPriceOverride.toString()
      );
      formData.append('tags', data.tags || '');

      // Add inventory fields
      formData.append('trackInventory', data.trackInventory.toString());
      if (data.trackInventory) {
        formData.append('currentStock', (data.currentStock || 0).toString());
        formData.append('minimumStock', (data.minimumStock || 10).toString());
        formData.append('maximumStock', (data.maximumStock || 100).toString());
        formData.append('unit', data.unit || 'units');
        formData.append('supplier', data.supplier || '');
        formData.append(
          'preventOrdersWhenOutOfStock',
          (data.preventOrdersWhenOutOfStock || false).toString()
        );
        if (data.crateSize)
          formData.append('crateSize', data.crateSize.toString());
        if (data.packagingType)
          formData.append('packagingType', data.packagingType);
      }

      const result = await createMenuItemAction(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        router.push('/dashboard/menu');
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create menu item',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error creating menu item:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }

  const foodCategories = availableCategories?.food
    .filter((c) => c.isEnabled)
    .sort((a, b) => a.order - b.order) || [
    { value: 'main-courses', label: 'Main Courses' },
    { value: 'starters', label: 'Starters' },
    { value: 'desserts', label: 'Desserts' },
    { value: 'sides', label: 'Sides' },
  ];

  const drinkCategories = availableCategories?.drinks
    .filter((c) => c.isEnabled)
    .sort((a, b) => a.order - b.order) || [
    { value: 'beer-local', label: 'Beer (Local)' },
    { value: 'beer-imported', label: 'Beer (Imported)' },
    { value: 'beer-craft', label: 'Beer (Craft)' },
    { value: 'wine', label: 'Wine' },
    { value: 'soft-drinks', label: 'Soft Drinks' },
    { value: 'cocktails', label: 'Cocktails' },
  ];

  const categories = mainCategory === 'food' ? foodCategories : drinkCategories;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Jollof Rice"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Describe the menu item..."
          rows={3}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Main Category & Category */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mainCategory">Main Category *</Label>
          <Select
            value={mainCategory}
            onValueChange={(value) =>
              setValue('mainCategory', value as 'food' | 'drinks')
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="drinks">Drinks</SelectItem>
            </SelectContent>
          </Select>
          {errors.mainCategory && (
            <p className="text-sm text-destructive">
              {errors.mainCategory.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            onValueChange={(value) => setValue('category', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      {/* Price & Preparation Time */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Price (₦) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            placeholder="0.00"
            disabled={isLoading}
          />
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="preparationTime">Preparation Time (minutes) *</Label>
          <Input
            id="preparationTime"
            type="number"
            {...register('preparationTime', { valueAsNumber: true })}
            placeholder="15"
            disabled={isLoading}
          />
          {errors.preparationTime && (
            <p className="text-sm text-destructive">
              {errors.preparationTime.message}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          {...register('tags')}
          placeholder="e.g., spicy, vegetarian, popular (comma-separated)"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Separate tags with commas
        </p>
        {errors.tags && (
          <p className="text-sm text-destructive">{errors.tags.message}</p>
        )}
      </div>

      {/* Availability */}
      <div className="flex items-center space-x-2">
        <Switch
          id="isAvailable"
          checked={isAvailable}
          onCheckedChange={(checked) => setValue('isAvailable', checked)}
          disabled={isLoading}
        />
        <Label htmlFor="isAvailable">Available for ordering</Label>
      </div>

      {/* Manual Price Override */}
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="allowManualPriceOverride" className="font-medium">
              Allow Manual Price Override
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable staff to enter custom prices for this item when creating
              orders
            </p>
          </div>
          <Switch
            id="allowManualPriceOverride"
            checked={watch('allowManualPriceOverride')}
            onCheckedChange={(checked) =>
              setValue('allowManualPriceOverride', checked)
            }
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Half Portion Section - Only for Food Items */}
      {mainCategory === 'food' && (
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Portion Options</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="halfPortionEnabled" className="font-medium">
                    Half Portion (50%)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to order half portions at 50% price
                  </p>
                </div>
                <Switch
                  id="halfPortionEnabled"
                  checked={halfPortionEnabled}
                  onCheckedChange={(checked) =>
                    setValue('halfPortionEnabled', checked)
                  }
                  disabled={isLoading}
                />
              </div>

              {halfPortionEnabled && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="halfPortionSurcharge">
                      Surcharge (optional)
                    </Label>
                    <Input
                      id="halfPortionSurcharge"
                      type="number"
                      min="0"
                      step="50"
                      {...register('halfPortionSurcharge', {
                        valueAsNumber: true,
                      })}
                      disabled={isLoading}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Fixed amount to add to the half portion price
                    </p>
                  </div>
                  {price > 0 && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm">
                        <span className="font-medium">Half Portion Price:</span>{' '}
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN',
                          minimumFractionDigits: 0,
                        }).format(
                          Math.round(price * 0.5) + (halfPortionSurcharge || 0)
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        50% of full price
                        {halfPortionSurcharge > 0
                          ? ` + ₦${halfPortionSurcharge.toLocaleString()} surcharge`
                          : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="quarterPortionEnabled"
                    className="font-medium"
                  >
                    Quarter Portion (25%)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to order quarter portions at 25% price
                  </p>
                </div>
                <Switch
                  id="quarterPortionEnabled"
                  checked={quarterPortionEnabled}
                  onCheckedChange={(checked) =>
                    setValue('quarterPortionEnabled', checked)
                  }
                  disabled={isLoading}
                />
              </div>

              {quarterPortionEnabled && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="quarterPortionSurcharge">
                      Surcharge (optional)
                    </Label>
                    <Input
                      id="quarterPortionSurcharge"
                      type="number"
                      min="0"
                      step="50"
                      {...register('quarterPortionSurcharge', {
                        valueAsNumber: true,
                      })}
                      disabled={isLoading}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Fixed amount to add to the quarter portion price
                    </p>
                  </div>
                  {price > 0 && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm">
                        <span className="font-medium">
                          Quarter Portion Price:
                        </span>{' '}
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN',
                          minimumFractionDigits: 0,
                        }).format(
                          Math.round(price * 0.25) +
                            (quarterPortionSurcharge || 0)
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        25% of full price
                        {quarterPortionSurcharge > 0
                          ? ` + ₦${quarterPortionSurcharge.toLocaleString()} surcharge`
                          : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tracking Section */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Inventory Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Enable stock management for this item
            </p>
          </div>
          <Switch
            id="trackInventory"
            checked={trackInventory}
            onCheckedChange={(checked) => setValue('trackInventory', checked)}
            disabled={isLoading}
          />
        </div>

        {trackInventory && (
          <div className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currentStock">Initial Stock *</Label>
                <Input
                  id="currentStock"
                  type="number"
                  {...register('currentStock', { valueAsNumber: true })}
                  placeholder="50"
                  disabled={isLoading}
                />
                {errors.currentStock && (
                  <p className="text-sm text-destructive">
                    {errors.currentStock.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  onValueChange={(value) => setValue('unit', value)}
                  disabled={isLoading}
                  defaultValue="units"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portions">Portions</SelectItem>
                    <SelectItem value="bottles">Bottles</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minimumStock">Minimum Stock</Label>
                <Input
                  id="minimumStock"
                  type="number"
                  {...register('minimumStock', { valueAsNumber: true })}
                  placeholder="10"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this level
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maximumStock">Maximum Stock</Label>
                <Input
                  id="maximumStock"
                  type="number"
                  {...register('maximumStock', { valueAsNumber: true })}
                  placeholder="100"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Target stock level for reordering
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  {...register('supplier')}
                  placeholder="e.g., ABC Suppliers"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="crateSize">Units Per Crate</Label>
                <Input
                  id="crateSize"
                  type="number"
                  min="1"
                  {...register('crateSize', { valueAsNumber: true })}
                  placeholder="e.g., 24"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  How many units in one crate/case (leave empty if N/A)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="packagingType">Packaging Type</Label>
                <Input
                  id="packagingType"
                  {...register('packagingType')}
                  placeholder="e.g., crate, case, pack"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="preventOrdersWhenOutOfStock"
                checked={watch('preventOrdersWhenOutOfStock')}
                onCheckedChange={(checked) =>
                  setValue('preventOrdersWhenOutOfStock', checked)
                }
                disabled={isLoading}
              />
              <Label htmlFor="preventOrdersWhenOutOfStock">
                Prevent orders when out of stock
              </Label>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Menu Item'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
