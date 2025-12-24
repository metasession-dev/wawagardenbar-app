'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const expenseCategoriesSchema = z.object({
  directCostCategories: z.array(z.string().min(1)).min(1, 'At least one direct cost category is required'),
  operatingExpenseCategories: z.array(z.string().min(1)).min(1, 'At least one operating expense category is required'),
});

type ExpenseCategoriesFormValues = z.infer<typeof expenseCategoriesSchema>;

interface ExpenseCategoriesFormProps {
  initialCategories: {
    directCostCategories: string[];
    operatingExpenseCategories: string[];
  };
}

export function ExpenseCategoriesForm({ initialCategories }: ExpenseCategoriesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDirectCostCategory, setNewDirectCostCategory] = useState('');
  const [newOperatingExpenseCategory, setNewOperatingExpenseCategory] = useState('');

  const form = useForm<ExpenseCategoriesFormValues>({
    resolver: zodResolver(expenseCategoriesSchema),
    defaultValues: initialCategories,
  });

  const directCostCategories = form.watch('directCostCategories');
  const operatingExpenseCategories = form.watch('operatingExpenseCategories');

  async function onSubmit(data: ExpenseCategoriesFormValues) {
    setIsSubmitting(true);

    try {
      const result = await updateExpenseCategoriesAction(data);

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

  function addDirectCostCategory() {
    if (!newDirectCostCategory.trim()) return;
    
    const currentCategories = form.getValues('directCostCategories');
    if (currentCategories.includes(newDirectCostCategory.trim())) {
      toast({
        title: 'Duplicate category',
        description: 'This category already exists',
        variant: 'destructive',
      });
      return;
    }
    
    form.setValue('directCostCategories', [...currentCategories, newDirectCostCategory.trim()]);
    setNewDirectCostCategory('');
  }

  function removeDirectCostCategory(index: number) {
    const currentCategories = form.getValues('directCostCategories');
    form.setValue(
      'directCostCategories',
      currentCategories.filter((_, i) => i !== index)
    );
  }

  function addOperatingExpenseCategory() {
    if (!newOperatingExpenseCategory.trim()) return;
    
    const currentCategories = form.getValues('operatingExpenseCategories');
    if (currentCategories.includes(newOperatingExpenseCategory.trim())) {
      toast({
        title: 'Duplicate category',
        description: 'This category already exists',
        variant: 'destructive',
      });
      return;
    }
    
    form.setValue('operatingExpenseCategories', [...currentCategories, newOperatingExpenseCategory.trim()]);
    setNewOperatingExpenseCategory('');
  }

  function removeOperatingExpenseCategory(index: number) {
    const currentCategories = form.getValues('operatingExpenseCategories');
    form.setValue(
      'operatingExpenseCategories',
      currentCategories.filter((_, i) => i !== index)
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Direct Cost Categories */}
            <FormField
              control={form.control}
              name="directCostCategories"
              render={() => (
                <FormItem>
                  <FormLabel>Direct Cost Categories (COGS)</FormLabel>
                  <FormDescription>
                    Categories for costs directly tied to menu items (ingredients, beverages, etc.)
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-3">
                      {/* Add new category */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new category name"
                          value={newDirectCostCategory}
                          onChange={(e) => setNewDirectCostCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addDirectCostCategory();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={addDirectCostCategory}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Display categories */}
                      <div className="flex flex-wrap gap-2">
                        {directCostCategories.map((category, index) => (
                          <Badge key={index} variant="secondary" className="text-sm">
                            {category}
                            <button
                              type="button"
                              onClick={() => removeDirectCostCategory(index)}
                              className="ml-2 hover:text-destructive"
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

            {/* Operating Expense Categories */}
            <FormField
              control={form.control}
              name="operatingExpenseCategories"
              render={() => (
                <FormItem>
                  <FormLabel>Operating Expense Categories</FormLabel>
                  <FormDescription>
                    Categories for business running costs (utilities, rent, salaries, etc.)
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-3">
                      {/* Add new category */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new category name"
                          value={newOperatingExpenseCategory}
                          onChange={(e) => setNewOperatingExpenseCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addOperatingExpenseCategory();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={addOperatingExpenseCategory}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Display categories */}
                      <div className="flex flex-wrap gap-2">
                        {operatingExpenseCategories.map((category, index) => (
                          <Badge key={index} variant="secondary" className="text-sm">
                            {category}
                            <button
                              type="button"
                              onClick={() => removeOperatingExpenseCategory(index)}
                              className="ml-2 hover:text-destructive"
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

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Categories
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
