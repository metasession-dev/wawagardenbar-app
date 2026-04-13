'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  SelectItem,
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { createPendingExpenseGroupAction } from '@/app/actions/finance/pending-expense-actions';
import { getExpenseCategoriesAction } from '@/app/actions/finance/expense-categories-actions';
import { toast } from '@/hooks/use-toast';
import {
  DIRECT_COST_CATEGORIES,
  OPERATING_EXPENSE_CATEGORIES,
  ExpenseType,
} from '@/interfaces/expense.interface';

const lineItemSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters'),
  quantity: z.number().min(0, 'Quantity must be 0 or more'),
  unit: z.string().min(1, 'Unit is required'),
  unitCost: z.number().min(0, 'Unit cost must be 0 or more'),
  totalCost: z.number().min(0, 'Total cost must be 0 or more'),
});

const expenseFormSchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  expenseType: z.enum(['direct-cost', 'operating-expense'], {
    required_error: 'Expense type is required',
  }),
  category: z.string().min(1, 'Category is required'),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

function makeDefaultItem() {
  return { description: '', quantity: 1, unit: '', unitCost: 0, totalCost: 0 };
}

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefill?: { date?: Date; expenseType?: ExpenseType; category?: string };
}

export function ExpenseForm({
  open,
  onOpenChange,
  onSuccess,
  prefill,
}: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [directCostCategories, setDirectCostCategories] = useState<string[]>([
    ...DIRECT_COST_CATEGORIES,
  ]);
  const [operatingExpenseCategories, setOperatingExpenseCategories] = useState<
    string[]
  >([...OPERATING_EXPENSE_CATEGORIES]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: prefill?.date ?? new Date(),
      expenseType: prefill?.expenseType ?? 'direct-cost',
      category: prefill?.category ?? '',
      items: [makeDefaultItem()],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      form.reset({
        date: prefill?.date ?? new Date(),
        expenseType: prefill?.expenseType ?? 'direct-cost',
        category: prefill?.category ?? '',
        items: [makeDefaultItem()],
        notes: '',
      });
    }
  }, [open]);

  async function fetchCategories() {
    try {
      const result = await getExpenseCategoriesAction();
      if (result.success && result.categories) {
        setDirectCostCategories(result.categories.directCostCategories);
        setOperatingExpenseCategories(
          result.categories.operatingExpenseCategories
        );
      }
    } catch {
      /* use defaults */
    }
  }

  const expenseType = form.watch('expenseType');
  const items = form.watch('items');
  const categories =
    expenseType === 'direct-cost'
      ? directCostCategories
      : operatingExpenseCategories;

  function handleQtyOrCostChange(index: number) {
    const item = form.getValues(`items.${index}`);
    const qty = item.quantity ?? 0;
    const cost = item.unitCost ?? 0;
    form.setValue(
      `items.${index}.totalCost`,
      parseFloat((qty * cost).toFixed(2))
    );
  }

  const groupTotal = items.reduce(
    (sum, item) => sum + (item.totalCost || 0),
    0
  );

  async function onSubmit(data: ExpenseFormValues) {
    setIsSubmitting(true);
    try {
      const result = await createPendingExpenseGroupAction({
        date: data.date,
        expenseType: data.expenseType,
        category: data.category,
        items: data.items,
        notes: data.notes,
      });

      if (result.success) {
        toast({
          title: 'Expense submitted',
          description: 'Added to pending expenses for approval.',
        });

        if (saveAndAddAnother) {
          form.reset({
            date: data.date,
            expenseType: data.expenseType,
            category: data.category,
            items: [makeDefaultItem()],
            notes: '',
          });
          setSaveAndAddAnother(false);
        } else {
          onOpenChange(false);
        }
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit expense',
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Enter the expense details. All items will be submitted for approval
            before being recorded.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* ── Header: Date / Type / Category ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                          disabled={(d) => d > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Type</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue('category', '');
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* ── Line Items ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-base font-medium leading-none">
                  Line Items
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(makeDefaultItem())}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Unit Cost (₦)</span>
                <span>Total (₦)</span>
                <span />
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-start"
                >
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g., Goat" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1"
                            {...f}
                            onChange={(e) => {
                              f.onChange(
                                e.target.value ? parseFloat(e.target.value) : 0
                              );
                              handleQtyOrCostChange(index);
                            }}
                            value={f.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="kg" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitCost`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...f}
                            onChange={(e) => {
                              f.onChange(
                                e.target.value ? parseFloat(e.target.value) : 0
                              );
                              handleQtyOrCostChange(index);
                            }}
                            value={f.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.totalCost`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...f}
                            onChange={(e) =>
                              f.onChange(
                                e.target.value ? parseFloat(e.target.value) : 0
                              )
                            }
                            value={f.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 text-muted-foreground hover:text-destructive"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <p className="text-sm font-semibold">
                  Group Total: ₦
                  {groupTotal.toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <Separator />

            {/* ── Notes ── */}
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

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => setSaveAndAddAnother(true)}
              >
                {isSubmitting && saveAndAddAnother ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Add Another'
                )}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && !saveAndAddAnother ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Expense'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
