'use client';

import { useMemo, useState } from 'react';
import { useForm, useFieldArray, type ArrayPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, X, Loader2, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { IMainCategoryConfig } from '@/interfaces/main-category.interface';

const categorySchema = z.object({
  label: z.string().min(1, 'Label is required'),
  value: z
    .string()
    .min(1, 'Value is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Value must be kebab-case (lowercase, numbers, dashes only)'
    ),
  order: z.number(),
  isEnabled: z.boolean(),
});

/**
 * REQ-075 — Sub-category settings are now keyed off the configurable
 * main-category registry. The form mounts one tab per main category and
 * uses `useFieldArray` to manage that key's array of sub-categories.
 */
const menuSettingsSchema = z.record(z.string(), z.array(categorySchema));

type MenuSettingsFormValues = z.infer<typeof menuSettingsSchema>;

interface MenuCategoriesFormProps {
  initialSettings: IMenuSettings;
  /**
   * Available main categories from the registry. Determines which tabs
   * are rendered. The form syncs the form-state keys against this list
   * (so a new main category added through the main-category settings
   * appears here with an empty list, and a deleted one disappears).
   */
  mainCategories: IMainCategoryConfig[];
}

export function MenuCategoriesForm({
  initialSettings,
  mainCategories,
}: MenuCategoriesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabled = useMemo(
    () =>
      mainCategories
        .filter((m) => m.isEnabled)
        .sort((a, b) => a.order - b.order),
    [mainCategories]
  );

  const [activeTab, setActiveTab] = useState(enabled[0]?.slug ?? '');

  const defaults = useMemo<MenuSettingsFormValues>(() => {
    const seeded: MenuSettingsFormValues = {};
    for (const main of enabled) {
      seeded[main.slug] = initialSettings[main.slug] ?? [];
    }
    return seeded;
  }, [enabled, initialSettings]);

  const form = useForm<MenuSettingsFormValues>({
    resolver: zodResolver(menuSettingsSchema),
    defaultValues: defaults,
  });

  async function onSubmit(data: MenuSettingsFormValues) {
    setIsSubmitting(true);

    try {
      const orderedData: MenuSettingsFormValues = {};
      for (const [slug, list] of Object.entries(data)) {
        orderedData[slug] = (list ?? []).map((item, index) => ({
          ...item,
          order: index + 1,
        }));
      }

      const result = await updateMenuCategoriesAction(orderedData);

      if (result.success) {
        toast({
          title: 'Menu categories updated',
          description: 'Your changes have been saved successfully.',
        });
        form.reset(orderedData);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update menu categories',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Categories</CardTitle>
        <CardDescription>
          Manage available sub-categories for each main category. Drag to
          reorder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {enabled.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No main categories enabled. Configure them in the Main Categories
            section above.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList
                  className="grid w-full"
                  style={{
                    gridTemplateColumns: `repeat(${enabled.length}, minmax(0, 1fr))`,
                  }}
                >
                  {enabled.map((main) => (
                    <TabsTrigger key={main.slug} value={main.slug}>
                      {main.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {enabled.map((main) => (
                  <TabsContent
                    key={main.slug}
                    value={main.slug}
                    className="pt-4"
                  >
                    <SubCategoryList form={form} namePrefix={main.slug} />
                  </TabsContent>
                ))}
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
        )}
      </CardContent>
    </Card>
  );
}

function SubCategoryList({
  form,
  namePrefix,
}: {
  form: ReturnType<typeof useForm<MenuSettingsFormValues>>;
  namePrefix: string;
}) {
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: namePrefix as ArrayPath<MenuSettingsFormValues>,
  });

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
                        const valueField = form.getValues(
                          `${namePrefix}.${index}.value`
                        );
                        if (!valueField) {
                          const generatedValue = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '');
                          form.setValue(
                            `${namePrefix}.${index}.value`,
                            generatedValue
                          );
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
                  onClick={() =>
                    index < fields.length - 1 && move(index, index + 1)
                  }
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
        onClick={() =>
          append({
            label: '',
            value: '',
            order: 999,
            isEnabled: true,
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Category
      </Button>
    </div>
  );
}
