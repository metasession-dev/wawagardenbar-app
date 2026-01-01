'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, X, Loader2, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { updateMenuCategoriesAction } from '@/app/dashboard/settings/actions';
import { IMenuSettings } from '@/interfaces/menu-settings.interface';

const categorySchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required').regex(/^[a-z0-9-]+$/, 'Value must be kebab-case (lowercase, numbers, dashes only)'),
  order: z.number(),
  isEnabled: z.boolean(),
});

const menuSettingsSchema = z.object({
  food: z.array(categorySchema),
  drinks: z.array(categorySchema),
});

type MenuSettingsFormValues = z.infer<typeof menuSettingsSchema>;

interface MenuCategoriesFormProps {
  initialSettings: IMenuSettings;
}

export function MenuCategoriesForm({ initialSettings }: MenuCategoriesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('food');

  const form = useForm<MenuSettingsFormValues>({
    resolver: zodResolver(menuSettingsSchema),
    defaultValues: initialSettings,
  });

  const { fields: foodFields, append: appendFood, remove: removeFood, move: moveFood } = useFieldArray({
    control: form.control,
    name: 'food',
  });

  const { fields: drinkFields, append: appendDrink, remove: removeDrink, move: moveDrink } = useFieldArray({
    control: form.control,
    name: 'drinks',
  });

  async function onSubmit(data: MenuSettingsFormValues) {
    setIsSubmitting(true);

    try {
      // Ensure orders are correct based on array index
      const orderedData = {
        food: data.food.map((item, index) => ({ ...item, order: index + 1 })),
        drinks: data.drinks.map((item, index) => ({ ...item, order: index + 1 })),
      };

      const result = await updateMenuCategoriesAction(orderedData);

      if (result.success) {
        toast({
          title: 'Menu categories updated',
          description: 'Your changes have been saved successfully.',
        });
        // Update local form state with reordered data to keep in sync
        form.reset(orderedData);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update menu categories',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const addNewCategory = (type: 'food' | 'drinks') => {
    const newItem = {
      label: '',
      value: '',
      order: 999, // Will be fixed on submit
      isEnabled: true,
    };

    if (type === 'food') {
      appendFood(newItem);
    } else {
      appendDrink(newItem);
    }
  };

  const renderCategoryList = (
    fields: typeof foodFields,
    remove: (index: number) => void,
    move: (from: number, to: number) => void,
    namePrefix: 'food' | 'drinks'
  ) => {
    return (
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-center gap-4 rounded-md border p-4 bg-card"
          >
            <div className="cursor-grab text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name={`${namePrefix}.${index}.label`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="Label (e.g. Main Courses)" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-generate value if empty
                          const valueField = form.getValues(`${namePrefix}.${index}.value`);
                          if (!valueField) {
                            const generatedValue = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-+|-+$/g, '');
                            form.setValue(`${namePrefix}.${index}.value`, generatedValue);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${namePrefix}.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Value (e.g. main-courses)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-4">
                <FormField
                  control={form.control}
                  name={`${namePrefix}.${index}.isEnabled`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal text-muted-foreground">
                        {field.value ? 'Visible' : 'Hidden'}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <div className="flex-1" />

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => index > 0 && move(index, index - 1)}
                    disabled={index === 0}
                    title="Move Up"
                  >
                    <span className="text-lg">↑</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => index < fields.length - 1 && move(index, index + 1)}
                    disabled={index === fields.length - 1}
                    title="Move Down"
                  >
                    <span className="text-lg">↓</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => remove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => addNewCategory(namePrefix)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Categories</CardTitle>
        <CardDescription>
          Manage available categories for food and drinks. Drag to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="food">Food Categories</TabsTrigger>
                <TabsTrigger value="drinks">Drink Categories</TabsTrigger>
              </TabsList>
              
              <TabsContent value="food" className="pt-4">
                {renderCategoryList(foodFields, removeFood, moveFood, 'food')}
              </TabsContent>
              
              <TabsContent value="drinks" className="pt-4">
                {renderCategoryList(drinkFields, removeDrink, moveDrink, 'drinks')}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Categories
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
