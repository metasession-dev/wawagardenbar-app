'use client';

/**
 * @requirement REQ-028 - Grouped expense categories (Settings editor)
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, X, Loader2, Trash2 } from 'lucide-react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { updateExpenseCategoriesAction } from '@/app/dashboard/settings/actions';
import type {
  CategoryGroup,
  ExpenseCategoriesSettings,
} from '@/interfaces/expense.interface';
import { validateGroups } from '@/lib/expense-categories-display';

const categoryGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  categoryNames: z.array(z.string().min(1)),
});

const expenseCategoriesSchema = z
  .object({
    directCostCategories: z
      .array(z.string().min(1))
      .min(1, 'At least one direct cost category is required'),
    operatingExpenseCategories: z
      .array(z.string().min(1))
      .min(1, 'At least one operating expense category is required'),
    directCostGroups: z.array(categoryGroupSchema).default([]),
    operatingExpenseGroups: z.array(categoryGroupSchema).default([]),
  })
  .superRefine((v, ctx) => {
    const d = validateGroups(v.directCostCategories, v.directCostGroups);
    if (!d.ok) {
      for (const err of d.errors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['directCostGroups'],
          message: err,
        });
      }
    }
    const o = validateGroups(
      v.operatingExpenseCategories,
      v.operatingExpenseGroups
    );
    if (!o.ok) {
      for (const err of o.errors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['operatingExpenseGroups'],
          message: err,
        });
      }
    }
  });

type ExpenseCategoriesFormValues = z.infer<typeof expenseCategoriesSchema>;

interface ExpenseCategoriesFormProps {
  initialCategories: ExpenseCategoriesSettings;
}

type TypeKey = 'directCost' | 'operatingExpense';

const TYPE_CONFIG: Record<
  TypeKey,
  {
    label: string;
    description: string;
    categoryField: 'directCostCategories' | 'operatingExpenseCategories';
    groupField: 'directCostGroups' | 'operatingExpenseGroups';
  }
> = {
  directCost: {
    label: 'Direct Cost Categories (COGS)',
    description:
      'Categories for costs directly tied to menu items (ingredients, beverages, etc.)',
    categoryField: 'directCostCategories',
    groupField: 'directCostGroups',
  },
  operatingExpense: {
    label: 'Operating Expense Categories',
    description:
      'Categories for business running costs (utilities, rent, salaries, etc.)',
    categoryField: 'operatingExpenseCategories',
    groupField: 'operatingExpenseGroups',
  },
};

export function ExpenseCategoriesForm({
  initialCategories,
}: ExpenseCategoriesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryInputs, setNewCategoryInputs] = useState<
    Record<TypeKey, string>
  >({
    directCost: '',
    operatingExpense: '',
  });
  const [newGroupInputs, setNewGroupInputs] = useState<Record<TypeKey, string>>(
    { directCost: '', operatingExpense: '' }
  );

  const form = useForm<ExpenseCategoriesFormValues>({
    resolver: zodResolver(expenseCategoriesSchema),
    defaultValues: {
      directCostCategories: initialCategories.directCostCategories,
      operatingExpenseCategories: initialCategories.operatingExpenseCategories,
      directCostGroups: initialCategories.directCostGroups ?? [],
      operatingExpenseGroups: initialCategories.operatingExpenseGroups ?? [],
    },
  });

  async function onSubmit(data: ExpenseCategoriesFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateExpenseCategoriesAction(
        data as ExpenseCategoriesSettings
      );

      if (result.success) {
        toast({
          title: 'Categories updated',
          description: 'Expense categories have been updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update expense categories',
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

  function addCategory(typeKey: TypeKey) {
    const config = TYPE_CONFIG[typeKey];
    const raw = newCategoryInputs[typeKey].trim();
    if (!raw) return;
    const current = form.getValues(config.categoryField);
    if (current.includes(raw)) {
      toast({
        title: 'Duplicate category',
        description: 'This category already exists',
        variant: 'destructive',
      });
      return;
    }
    form.setValue(config.categoryField, [...current, raw]);
    setNewCategoryInputs((s) => ({ ...s, [typeKey]: '' }));
  }

  function removeCategory(typeKey: TypeKey, index: number) {
    const config = TYPE_CONFIG[typeKey];
    const current = form.getValues(config.categoryField);
    const removed = current[index];
    form.setValue(
      config.categoryField,
      current.filter((_, i) => i !== index)
    );
    // Cascade: remove this name from any group that contained it.
    const groups = form.getValues(config.groupField);
    form.setValue(
      config.groupField,
      groups.map((g) => ({
        ...g,
        categoryNames: g.categoryNames.filter((n) => n !== removed),
      }))
    );
  }

  function addGroup(typeKey: TypeKey) {
    const config = TYPE_CONFIG[typeKey];
    const raw = newGroupInputs[typeKey].trim();
    if (!raw) return;
    const groups = form.getValues(config.groupField);
    if (groups.some((g) => g.name.toLowerCase() === raw.toLowerCase())) {
      toast({
        title: 'Duplicate group name',
        description: 'A group with this name already exists',
        variant: 'destructive',
      });
      return;
    }
    form.setValue(config.groupField, [
      ...groups,
      { name: raw, categoryNames: [] },
    ]);
    setNewGroupInputs((s) => ({ ...s, [typeKey]: '' }));
  }

  function removeGroup(typeKey: TypeKey, index: number) {
    const config = TYPE_CONFIG[typeKey];
    const groups = form.getValues(config.groupField);
    form.setValue(
      config.groupField,
      groups.filter((_, i) => i !== index)
    );
  }

  function renameGroup(typeKey: TypeKey, index: number, name: string) {
    const config = TYPE_CONFIG[typeKey];
    const groups = form.getValues(config.groupField);
    const next = groups.map((g, i) => (i === index ? { ...g, name } : g));
    form.setValue(config.groupField, next);
  }

  function toggleMembership(
    typeKey: TypeKey,
    groupIndex: number,
    categoryName: string
  ) {
    const config = TYPE_CONFIG[typeKey];
    const groups = form.getValues(config.groupField);
    const target = groups[groupIndex];
    if (!target) return;
    const isMember = target.categoryNames.includes(categoryName);

    const next: CategoryGroup[] = groups.map((g, i) => {
      if (i === groupIndex) {
        return {
          ...g,
          categoryNames: isMember
            ? g.categoryNames.filter((n) => n !== categoryName)
            : [...g.categoryNames, categoryName],
        };
      }
      // When adding to the target group, remove from any other group to enforce
      // single-group membership eagerly (validation will still catch drift).
      if (!isMember) {
        return {
          ...g,
          categoryNames: g.categoryNames.filter((n) => n !== categoryName),
        };
      }
      return g;
    });
    form.setValue(config.groupField, next);
  }

  function renderTypeSection(typeKey: TypeKey) {
    const config = TYPE_CONFIG[typeKey];
    const categories = form.watch(config.categoryField);
    const groups = form.watch(config.groupField);

    const membershipOf = new Map<string, string>();
    for (const g of groups) {
      for (const n of g.categoryNames) membershipOf.set(n, g.name);
    }
    const ungrouped = categories.filter((c) => !membershipOf.has(c));

    return (
      <div className="space-y-4" key={typeKey}>
        <FormField
          control={form.control}
          name={config.categoryField}
          render={() => (
            <FormItem>
              <FormLabel>{config.label}</FormLabel>
              <FormDescription>{config.description}</FormDescription>
              <FormControl>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter new category name"
                      value={newCategoryInputs[typeKey]}
                      onChange={(e) =>
                        setNewCategoryInputs((s) => ({
                          ...s,
                          [typeKey]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCategory(typeKey);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => addCategory(typeKey)}
                      aria-label="Add category"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category, index) => (
                      <Badge
                        key={`${category}-${index}`}
                        variant="secondary"
                        className="text-sm"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => removeCategory(typeKey, index)}
                          className="ml-2 hover:text-destructive"
                          aria-label={`Remove ${category}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={config.groupField}
          render={() => (
            <FormItem>
              <FormLabel>Groups</FormLabel>
              <FormDescription>
                Organise categories into groups shown as headings in the Add
                Expense dropdown. A category can belong to at most one group.
              </FormDescription>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter new group name"
                      value={newGroupInputs[typeKey]}
                      onChange={(e) =>
                        setNewGroupInputs((s) => ({
                          ...s,
                          [typeKey]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addGroup(typeKey);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => addGroup(typeKey)}
                      aria-label="Add group"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {groups.map((group, groupIndex) => (
                    <div
                      key={groupIndex}
                      className="rounded-md border p-3 space-y-2"
                    >
                      <div className="flex gap-2 items-center">
                        <Input
                          value={group.name}
                          onChange={(e) =>
                            renameGroup(typeKey, groupIndex, e.target.value)
                          }
                          aria-label="Group name"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGroup(typeKey, groupIndex)}
                          aria-label={`Remove group ${group.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => {
                          const memberOf = membershipOf.get(category);
                          const isInThisGroup = memberOf === group.name;
                          const isInOtherGroup = memberOf && !isInThisGroup;
                          return (
                            <Badge
                              key={`${groupIndex}-${category}`}
                              variant={isInThisGroup ? 'default' : 'outline'}
                              className={
                                isInOtherGroup
                                  ? 'opacity-50 cursor-not-allowed text-sm'
                                  : 'cursor-pointer text-sm'
                              }
                              title={
                                isInOtherGroup
                                  ? `Already in group "${memberOf}"`
                                  : undefined
                              }
                              onClick={() => {
                                if (isInOtherGroup) return;
                                toggleMembership(typeKey, groupIndex, category);
                              }}
                            >
                              {category}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {groups.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Ungrouped (rendered under &ldquo;Other&rdquo; in the
                        dropdown)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ungrouped.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            All categories are assigned to a group.
                          </span>
                        ) : (
                          ungrouped.map((category) => (
                            <Badge
                              key={`ungrouped-${category}`}
                              variant="outline"
                              className="text-sm"
                            >
                              {category}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Categories</CardTitle>
        <CardDescription>
          Manage categories for direct costs (COGS) and operating expenses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {renderTypeSection('directCost')}
            {renderTypeSection('operatingExpense')}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Categories
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
