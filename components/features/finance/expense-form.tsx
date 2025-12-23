'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
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
  FormDescription,
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
import { cn } from '@/lib/utils';
import { createExpenseAction, updateExpenseAction } from '@/app/actions/finance/expense-actions';
import { toast } from '@/hooks/use-toast';
import {
  DIRECT_COST_CATEGORIES,
  OPERATING_EXPENSE_CATEGORIES,
  ExpenseType,
} from '@/interfaces/expense.interface';

const expenseFormSchema = z.object({
  date: z.date({
    required_error: 'Date is required',
  }),
  expenseType: z.enum(['direct-cost', 'operating-expense'], {
    required_error: 'Expense type is required',
  }),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  supplier: z.string().optional(),
  receiptReference: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // If quantity is provided, unit must be provided
    if (data.quantity !== undefined && data.quantity > 0 && !data.unit) {
      return false;
    }
    return true;
  },
  {
    message: 'Unit is required when quantity is specified',
    path: ['unit'],
  }
);

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  expense?: {
    _id: string;
    date: Date;
    expenseType: ExpenseType;
    category: string;
    description: string;
    quantity?: number;
    unit?: string;
    amount: number;
    supplier?: string;
    receiptReference?: string;
    notes?: string;
  };
}

export function ExpenseForm({ open, onOpenChange, onSuccess, expense }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: new Date(),
      expenseType: 'direct-cost',
      category: '',
      description: '',
    },
  });

  // Reset form when expense prop changes (for editing) or dialog opens
  useEffect(() => {
    if (open) {
      if (expense) {
        form.reset({
          date: new Date(expense.date),
          expenseType: expense.expenseType,
          category: expense.category,
          description: expense.description,
          quantity: expense.quantity,
          unit: expense.unit,
          amount: expense.amount,
          supplier: expense.supplier,
          receiptReference: expense.receiptReference,
          notes: expense.notes,
        });
      } else {
        form.reset({
          date: new Date(),
          expenseType: 'direct-cost',
          category: '',
          description: '',
          quantity: undefined,
          unit: undefined,
          amount: undefined,
          supplier: undefined,
          receiptReference: undefined,
          notes: undefined,
        });
      }
    }
  }, [expense, open, form]);

  const expenseType = form.watch('expenseType');

  const categories =
    expenseType === 'direct-cost'
      ? DIRECT_COST_CATEGORIES
      : OPERATING_EXPENSE_CATEGORIES;

  async function onSubmit(data: ExpenseFormValues) {
    setIsSubmitting(true);

    try {
      const result = expense
        ? await updateExpenseAction(expense._id, data)
        : await createExpenseAction(data);

      if (result.success) {
        toast({
          title: expense ? 'Expense updated' : 'Expense created',
          description: expense
            ? 'The expense has been updated successfully.'
            : 'The expense has been recorded successfully.',
        });

        if (saveAndAddAnother && !expense) {
          // Reset form but keep expense type
          form.reset({
            date: new Date(),
            expenseType: data.expenseType,
            category: '',
            description: '',
          });
          setSaveAndAddAnother(false);
        } else {
          onOpenChange(false);
          form.reset();
        }

        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save expense',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {expense
              ? 'Update the expense details below.'
              : 'Record a new expense for your business.'}
          </DialogDescription>
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
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expense Type */}
            <FormField
              control={form.control}
              name="expenseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('category', ''); // Reset category when type changes
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="direct-cost">Direct Cost (COGS)</SelectItem>
                      <SelectItem value="operating-expense">Operating Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Direct costs are tied to menu items. Operating expenses are business
                    running costs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
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
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 1 Goat for pepper soup"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        value={field.value ?? ''}
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
                    <FormLabel>Unit (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., goat, litres, kg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Amount */}
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
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier/Vendor (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt Reference */}
            <FormField
              control={form.control}
              name="receiptReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt/Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Invoice or receipt number" {...field} />
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

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {!expense && (
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
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && !saveAndAddAnother ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : expense ? (
                  'Update Expense'
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
