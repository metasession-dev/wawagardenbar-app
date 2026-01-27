'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateMenuItemAction, duplicateMenuItemAction } from '@/app/actions/admin/menu-actions';
import { MenuImageUpload } from './menu-image-upload';
import { CustomizationOptionsBuilder } from './customization-options-builder';
import { DietaryTagsSelector } from './dietary-tags-selector';
import { DeleteMenuItemDialog } from './delete-menu-item-dialog';
import { IMenuSettings } from '@/interfaces/menu-settings.interface';

const menuItemSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  mainCategory: z.enum(['food', 'drinks']),
  category: z.string().min(1, 'Category is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  preparationTime: z.number().min(1, 'Preparation time must be at least 1 minute'),
  servingSize: z.string().optional(),
  isAvailable: z.boolean(),
  halfPortionEnabled: z.boolean(),
  halfPortionSurcharge: z.number().min(0, 'Surcharge must be 0 or greater'),
  quarterPortionEnabled: z.boolean(),
  quarterPortionSurcharge: z.number().min(0, 'Surcharge must be 0 or greater'),
  tags: z.string().optional(),
  allergens: z.array(z.string()).optional(),
  spiceLevel: z.enum(['none', 'mild', 'medium', 'hot', 'extra-hot']).optional(),
  calories: z.number().min(0).optional(),
  slug: z.string().optional(),
  metaDescription: z.string().optional(),
  trackInventory: z.boolean(),
  currentStock: z.number().min(0).optional(),
  minimumStock: z.number().min(0).optional(),
  maximumStock: z.number().min(0).optional(),
  unit: z.string().optional(),
  costPerUnit: z.number().min(0).optional(),
  supplier: z.string().optional(),
  preventOrdersWhenOutOfStock: z.boolean().optional(),
  pointsRedeemable: z.boolean(),
  pointsValue: z.number().min(0).optional(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface MenuItemEditFormProps {
  menuItem: any;
  availableCategories?: IMenuSettings;
}

/**
 * Menu item edit form component
 */
export function MenuItemEditForm({ menuItem, availableCategories }: MenuItemEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customizations, setCustomizations] = useState(menuItem.customizations || []);
  const [conversionRate, setConversionRate] = useState(100);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch conversion rate on mount
  useEffect(() => {
    async function fetchConversionRate() {
      try {
        const response = await fetch('/api/settings/points-conversion-rate');
        const data = await response.json();
        setConversionRate(data.rate || 100);
      } catch (error) {
        console.error('Failed to fetch conversion rate:', error);
      }
    }
    fetchConversionRate();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: menuItem.name,
      description: menuItem.description || '',
      mainCategory: menuItem.mainCategory,
      category: menuItem.category,
      price: menuItem.price,
      preparationTime: menuItem.preparationTime,
      servingSize: menuItem.servingSize || '',
      isAvailable: menuItem.isAvailable,
      halfPortionEnabled: menuItem.portionOptions?.halfPortionEnabled || false,
      halfPortionSurcharge: menuItem.portionOptions?.halfPortionSurcharge || 0,
      quarterPortionEnabled: menuItem.portionOptions?.quarterPortionEnabled || false,
      quarterPortionSurcharge: menuItem.portionOptions?.quarterPortionSurcharge || 0,
      tags: menuItem.tags?.join(', ') || '',
      allergens: menuItem.allergens || [],
      spiceLevel: menuItem.nutritionalInfo?.spiceLevel || 'none',
      calories: menuItem.nutritionalInfo?.calories || 0,
      slug: menuItem.slug || '',
      metaDescription: menuItem.metaDescription || '',
      trackInventory: menuItem.trackInventory || false,
      currentStock: menuItem.inventory?.currentStock || 0,
      minimumStock: menuItem.inventory?.minimumStock || 10,
      maximumStock: menuItem.inventory?.maximumStock || 100,
      unit: menuItem.inventory?.unit || 'units',
      costPerUnit: menuItem.inventory?.costPerUnit || 0,
      supplier: menuItem.inventory?.supplier || '',
      preventOrdersWhenOutOfStock: menuItem.inventory?.preventOrdersWhenOutOfStock || false,
      pointsRedeemable: menuItem.pointsRedeemable || false,
      pointsValue: menuItem.pointsValue || 0,
    },
  });

  const mainCategory = watch('mainCategory');
  const isAvailable = watch('isAvailable');
  const halfPortionEnabled = watch('halfPortionEnabled');
  const halfPortionSurcharge = watch('halfPortionSurcharge');
  const quarterPortionEnabled = watch('quarterPortionEnabled');
  const quarterPortionSurcharge = watch('quarterPortionSurcharge');
  const name = watch('name');
  const trackInventory = watch('trackInventory');
  const price = watch('price');
  const pointsRedeemable = watch('pointsRedeemable');
  const pointsValue = watch('pointsValue');

  // Track form changes
  useEffect(() => {
    const subscription = watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [watch]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Auto-generate slug from name
  useEffect(() => {
    if (name && !watch('slug')) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('slug', slug);
    }
  }, [name, setValue, watch]);

  async function onSubmit(data: MenuItemFormData) {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('mainCategory', data.mainCategory);
      formData.append('category', data.category);
      formData.append('price', data.price.toString());
      formData.append('preparationTime', data.preparationTime.toString());
      formData.append('servingSize', data.servingSize || '');
      formData.append('isAvailable', data.isAvailable.toString());
      formData.append('halfPortionEnabled', data.halfPortionEnabled.toString());
      formData.append('halfPortionSurcharge', data.halfPortionSurcharge.toString());
      formData.append('quarterPortionEnabled', data.quarterPortionEnabled.toString());
      formData.append('quarterPortionSurcharge', data.quarterPortionSurcharge.toString());
      formData.append('tags', data.tags || '');
      formData.append('allergens', JSON.stringify(data.allergens || []));
      formData.append('spiceLevel', data.spiceLevel || 'none');
      formData.append('calories', (data.calories || 0).toString());
      formData.append('slug', data.slug || '');
      formData.append('metaDescription', data.metaDescription || '');
      formData.append('customizations', JSON.stringify(customizations));

      // Add inventory tracking data
      formData.append('trackInventory', data.trackInventory.toString());
      if (data.trackInventory) {
        formData.append('currentStock', (data.currentStock || 0).toString());
        formData.append('minimumStock', (data.minimumStock || 10).toString());
        formData.append('maximumStock', (data.maximumStock || 100).toString());
        formData.append('unit', data.unit || 'units');
        formData.append('costPerUnit', (data.costPerUnit || 0).toString());
        formData.append('supplier', data.supplier || '');
        formData.append('preventOrdersWhenOutOfStock', (data.preventOrdersWhenOutOfStock || false).toString());
      }

      // Add points redemption data
      formData.append('pointsRedeemable', data.pointsRedeemable.toString());
      if (data.pointsRedeemable && data.pointsValue) {
        formData.append('pointsValue', data.pointsValue.toString());
      }

      const result = await updateMenuItemAction(menuItem._id, formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setIsDirty(false);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update menu item',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveAndContinue() {
    await handleSubmit(onSubmit)();
  }

  async function handleDuplicate() {
    setIsLoading(true);
    try {
      const result = await duplicateMenuItemAction(menuItem._id);

      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: 'Menu item duplicated successfully',
        });
        router.push(`/dashboard/menu/${result.data.itemId}/edit`);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to duplicate menu item',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error duplicating menu item:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push('/dashboard/menu');
      }
    } else {
      router.push('/dashboard/menu');
    }
  }

  const foodCategories = availableCategories?.food
    .filter(c => c.isEnabled)
    .sort((a, b) => a.order - b.order) || [
    { value: 'main-courses', label: 'Main Courses' },
    { value: 'starters', label: 'Starters' },
    { value: 'desserts', label: 'Desserts' },
  ];

  const drinkCategories = availableCategories?.drinks
    .filter(c => c.isEnabled)
    .sort((a, b) => a.order - b.order) || [
    { value: 'beer-local', label: 'Beer (Local)' },
    { value: 'beer-imported', label: 'Beer (Imported)' },
    { value: 'beer-craft', label: 'Beer (Craft)' },
    { value: 'wine', label: 'Wine' },
    { value: 'soft-drinks', label: 'Soft Drinks' },
  ];

  const categories = mainCategory === 'food' ? foodCategories : drinkCategories;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Main Category & Category */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mainCategory">Main Category *</Label>
                <Select
                  value={mainCategory}
                  onValueChange={(value) => setValue('mainCategory', value as 'food' | 'drinks')}
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
                  <p className="text-sm text-destructive">{errors.mainCategory.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={watch('category')}
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
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                )}
              </div>
            </div>

            {/* Price, Prep Time, Serving Size */}
            <div className="grid gap-4 md:grid-cols-3">
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
                <Label htmlFor="preparationTime">Prep Time (min) *</Label>
                <Input
                  id="preparationTime"
                  type="number"
                  {...register('preparationTime', { valueAsNumber: true })}
                  placeholder="15"
                  disabled={isLoading}
                />
                {errors.preparationTime && (
                  <p className="text-sm text-destructive">{errors.preparationTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="servingSize">Serving Size</Label>
                <Input
                  id="servingSize"
                  {...register('servingSize')}
                  placeholder="e.g., 1 plate"
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Management */}
        <MenuImageUpload
          menuItemId={menuItem._id}
          currentImages={menuItem.images}
        />

        {/* Availability & Status */}
        <Card>
          <CardHeader>
            <CardTitle>Availability & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isAvailable">Available</Label>
                <p className="text-sm text-muted-foreground">
                  Make this item available for ordering
                </p>
              </div>
              <Switch
                id="isAvailable"
                checked={isAvailable}
                onCheckedChange={(checked) => setValue('isAvailable', checked)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Portion Options - Only for Food Items */}
        {mainCategory === 'food' && (
          <Card>
            <CardHeader>
              <CardTitle>Portion Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="halfPortionEnabled">Half Portion (50%)</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to order half portions at 50% price
                  </p>
                </div>
                <Switch
                  id="halfPortionEnabled"
                  checked={halfPortionEnabled}
                  onCheckedChange={(checked) => setValue('halfPortionEnabled', checked)}
                  disabled={isLoading}
                />
              </div>

              {halfPortionEnabled && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="halfPortionSurcharge">Surcharge (optional)</Label>
                    <Input
                      id="halfPortionSurcharge"
                      type="number"
                      min="0"
                      step="50"
                      {...register('halfPortionSurcharge', { valueAsNumber: true })}
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
                        }).format(Math.round(price * 0.5) + (halfPortionSurcharge || 0))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        50% of full price{halfPortionSurcharge > 0 ? ` + ₦${halfPortionSurcharge.toLocaleString()} surcharge` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="quarterPortionEnabled">Quarter Portion (25%)</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to order quarter portions at 25% price
                  </p>
                </div>
                <Switch
                  id="quarterPortionEnabled"
                  checked={quarterPortionEnabled}
                  onCheckedChange={(checked) => setValue('quarterPortionEnabled', checked)}
                  disabled={isLoading}
                />
              </div>

              {quarterPortionEnabled && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="quarterPortionSurcharge">Surcharge (optional)</Label>
                    <Input
                      id="quarterPortionSurcharge"
                      type="number"
                      min="0"
                      step="50"
                      {...register('quarterPortionSurcharge', { valueAsNumber: true })}
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
                        <span className="font-medium">Quarter Portion Price:</span>{' '}
                        {new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN',
                          minimumFractionDigits: 0,
                        }).format(Math.round(price * 0.25) + (quarterPortionSurcharge || 0))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        25% of full price{quarterPortionSurcharge > 0 ? ` + ₦${quarterPortionSurcharge.toLocaleString()} surcharge` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Customization Options */}
        <CustomizationOptionsBuilder
          customizations={customizations}
          onChange={setCustomizations}
          disabled={isLoading}
        />

        {/* Inventory Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Track Inventory Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trackInventory">Track Inventory</Label>
                <p className="text-sm text-muted-foreground">
                  Enable inventory tracking for this item
                </p>
              </div>
              <Switch
                id="trackInventory"
                checked={trackInventory}
                onCheckedChange={(checked) => setValue('trackInventory', checked)}
                disabled={isLoading}
              />
            </div>

            {/* Inventory Fields (shown when tracking is enabled) */}
            {trackInventory && (
              <>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Current Stock *</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      step="0.01"
                      {...register('currentStock', { valueAsNumber: true })}
                      placeholder="0"
                      disabled={isLoading}
                    />
                    {errors.currentStock && (
                      <p className="text-sm text-destructive">{errors.currentStock.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit Type</Label>
                    <Input
                      id="unit"
                      {...register('unit')}
                      placeholder="e.g., bottles, portions, kg"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minimumStock">Minimum Stock</Label>
                    <Input
                      id="minimumStock"
                      type="number"
                      step="0.01"
                      {...register('minimumStock', { valueAsNumber: true })}
                      placeholder="10"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maximumStock">Maximum Stock</Label>
                    <Input
                      id="maximumStock"
                      type="number"
                      step="0.01"
                      {...register('maximumStock', { valueAsNumber: true })}
                      placeholder="100"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="costPerUnit">Cost Per Unit (₦)</Label>
                    <Input
                      id="costPerUnit"
                      type="number"
                      step="0.01"
                      {...register('costPerUnit', { valueAsNumber: true })}
                      placeholder="0.00"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      {...register('supplier')}
                      placeholder="Supplier name"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="preventOrdersWhenOutOfStock"
                    checked={watch('preventOrdersWhenOutOfStock')}
                    onCheckedChange={(checked) => setValue('preventOrdersWhenOutOfStock', checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="preventOrdersWhenOutOfStock" className="text-sm font-normal">
                    Prevent orders when out of stock
                  </Label>
                </div>

                {menuItem.inventoryId && (
                  <>
                    <Separator />
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/dashboard/inventory/${menuItem.inventoryId}`}>
                        View Full Inventory Details & History
                      </a>
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Points Redemption Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Points Redemption Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Points Redeemable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pointsRedeemable">Allow Points Redemption</Label>
                <p className="text-sm text-muted-foreground">
                  Enable customers to purchase this item using loyalty points
                </p>
              </div>
              <Switch
                id="pointsRedeemable"
                checked={pointsRedeemable}
                onCheckedChange={(checked) => setValue('pointsRedeemable', checked)}
                disabled={isLoading}
              />
            </div>

            {/* Points Value Fields (shown when redeemable is enabled) */}
            {pointsRedeemable && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="pointsValue">Points Value *</Label>
                  <Input
                    id="pointsValue"
                    type="number"
                    {...register('pointsValue', { valueAsNumber: true })}
                    placeholder="0"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Points required to redeem this item. Current rate: {conversionRate} points = ₦1
                  </p>
                  {errors.pointsValue && (
                    <p className="text-sm text-destructive">{errors.pointsValue.message}</p>
                  )}
                </div>

                {/* Auto-calculate button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const calculatedPoints = Math.round(price * conversionRate);
                    setValue('pointsValue', calculatedPoints);
                    toast({
                      title: 'Points Calculated',
                      description: `Set to ${calculatedPoints.toLocaleString()} points based on ₦${price.toLocaleString()} price`,
                    });
                  }}
                  disabled={isLoading || !price}
                >
                  Calculate from Price
                </Button>

                {/* Conversion display */}
                {pointsValue && pointsValue > 0 && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium">Conversion Preview:</p>
                    <p className="text-muted-foreground">
                      ₦{price.toLocaleString()} = {pointsValue.toLocaleString()} points
                    </p>
                    <p className="text-muted-foreground">
                      ({conversionRate} points per ₦1)
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Dietary & Allergen Information */}
        <DietaryTagsSelector
          selectedTags={watch('allergens') || []}
          onChange={(tags) => setValue('allergens', tags)}
          spiceLevel={watch('spiceLevel')}
          onSpiceLevelChange={(level) => setValue('spiceLevel', level as any)}
          calories={watch('calories')}
          onCaloriesChange={(cal) => setValue('calories', cal)}
          disabled={isLoading}
        />

        {/* SEO & Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>SEO & Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="auto-generated-from-name"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Used in the URL. Auto-generated from name if left empty.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                {...register('metaDescription')}
                placeholder="Brief description for search engines..."
                rows={2}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                {...register('tags')}
                placeholder="spicy, popular, vegetarian"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAndContinue}
            disabled={isLoading}
          >
            Save & Continue Editing
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <div className="flex-1" />

          <Button
            type="button"
            variant="outline"
            onClick={handleDuplicate}
            disabled={isLoading}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </form>

      {/* Delete Dialog */}
      <DeleteMenuItemDialog
        menuItemId={menuItem._id}
        menuItemName={menuItem.name}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </div>
  );
}
