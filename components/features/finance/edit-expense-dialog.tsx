'use client';

/**
 * @requirement REQ-026 - Pending expense group workflow
 * @requirement REQ-028 - Grouped expense category dropdown in Edit Expense
 *
 * Dialog for editing a single live expense record (post-transfer).
 * Available to super-admin only.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { updateExpenseAction } from '@/app/actions/finance/expense-actions';
import { toast } from '@/hooks/use-toast';
import {
  DIRECT_COST_CATEGORIES,
  OPERATING_EXPENSE_CATEGORIES,
} from '@/interfaces/expense.interface';
import type { CategoryGroup } from '@/interfaces/expense.interface';
import { getExpenseCategoriesAction } from '@/app/actions/finance/expense-categories-actions';
import { buildDropdownSections } from '@/lib/expense-categories-display';

const editExpenseSchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  expenseType: z.enum(['direct-cost', 'operating-expense']),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  amount: z.number().min(0, 'Amount must be 0 or more'),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type EditExpenseFormValues = z.infer<typeof editExpenseSchema>;

interface ExpenseRecord {
  _id: string;
  date: Date;
  expenseType: 'direct-cost' | 'operating-expense';
  category: string;
  description: string;
  quantity?: number;
  unit?: string;
  amount: number;
  supplier?: string;
  notes?: string;
}

interface EditExpenseDialogProps {
  expense: ExpenseRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditExpenseDialog({
  expense,
  open,
  onOpenChange,
  onSuccess,
}: EditExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directCostCategories, setDirectCostCategories] = useState<string[]>([
    ...DIRECT_COST_CATEGORIES,
  ]);
  const [operatingExpenseCategories, setOperatingExpenseCategories] = useState<
    string[]
  >([...OPERATING_EXPENSE_CATEGORIES]);
  const [directCostGroups, setDirectCostGroups] = useState<CategoryGroup[]>([]);
  const [operatingExpenseGroups, setOperatingExpenseGroups] = useState<
    CategoryGroup[]
  >([]);

  const form = useForm<EditExpenseFormValues>({
    resolver: zodResolver(editExpenseSchema),
    defaultValues: expense
      ? {
          date: new Date(expense.date),
          expenseType: expense.expenseType,
          category: expense.category,
          description: expense.description,
          quantity: expense.quantity ?? undefined,
          unit: expense.unit ?? '',
          amount: expense.amount,
          supplier: expense.supplier ?? '',
          notes: expense.notes ?? '',
        }
      : undefined,
  });

  useEffect(() => {
    if (open && expense) {
      form.reset({
        date: new Date(expense.date),
        expenseType: expense.expenseType,
        category: expense.category,
        description: expense.description,
        quantity: expense.quantity ?? undefined,
        unit: expense.unit ?? '',
        amount: expense.amount,
        supplier: expense.supplier ?? '',
        notes: expense.notes ?? '',
      });
      // Pull live admin config so newly added categories/groups appear here too.
      getExpenseCategoriesAction()
        .then((result) => {
          if (result.success && result.categories) {
            setDirectCostCategories(result.categories.directCostCategories);
            setOperatingExpenseCategories(
              result.categories.operatingExpenseCategories
            );
            setDirectCostGroups(result.categories.directCostGroups ?? []);
            setOperatingExpenseGroups(
              result.categories.operatingExpenseGroups ?? []
            );
          }
        })
        .catch(() => {
          /* use defaults */
        });
    }
  }, [open, expense]);

  const expenseType = form.watch('expenseType');
  const sections = buildDropdownSections(
    expenseType === 'direct-cost'
      ? directCostCategories
      : operatingExpenseCategories,
    expenseType === 'direct-cost' ? directCostGroups : operatingExpenseGroups
  );

  async function onSubmit(data: EditExpenseFormValues) {
    if (!expense) return;
    setIsSubmitting(true);
    try {
      const result = await updateExpenseAction(expense._id, {
        date: data.date,
        expenseType: data.expenseType,
        category: data.category,
        description: data.description,
        quantity: data.quantity,
        unit: data.unit || undefined,
        amount: data.amount,
        supplier: data.supplier || undefined,
        notes: data.notes || undefined,
      });
      if (result.success) {
        toast({ title: 'Updated', description: 'Expense updated.' });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type + Category */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="expenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue('category', '');
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="direct-cost">
                          Direct Cost (COGS)
                        </SelectItem>
                        <SelectItem value="operating-expense">
                          Operating Expense
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.map((section, sectionIdx) => {
                          const key =
                            section.heading ?? `__ungrouped_${sectionIdx}`;
                          const showSeparator =
                            sectionIdx > 0 &&
                            sections[sectionIdx - 1].items.length > 0 &&
                            section.items.length > 0;
                          return (
                            <div key={key}>
                              {showSeparator && <SelectSeparator />}
                              {section.heading !== null ? (
                                <SelectGroup>
                                  <SelectLabel>{section.heading}</SelectLabel>
                                  {section.items.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ) : (
                                section.items.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))
                              )}
                            </div>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Palm oil for cooking"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Qty + Unit + Amount */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qty</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : 0
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
