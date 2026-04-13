'use client';

/**
 * @requirement REQ-026 - Pending expense group workflow
 */
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
import { updatePendingExpenseGroupAction } from '@/app/actions/finance/pending-expense-actions';
import { getExpenseCategoriesAction } from '@/app/actions/finance/expense-categories-actions';
import { toast } from '@/hooks/use-toast';
import {
  DIRECT_COST_CATEGORIES,
  OPERATING_EXPENSE_CATEGORIES,
  ExpenseType,
} from '@/interfaces/expense.interface';
import { IPendingExpenseGroup } from '@/interfaces/pending-expense-group.interface';

const lineItemSchema = z.object({
  expenseType: z.enum(['direct-cost', 'operating-expense'], {
    required_error: 'Expense type is required',
  }),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  quantity: z.number().min(0),
  unit: z.string().min(1, 'Unit is required'),
  unitCost: z.number().min(0),
  totalCost: z.number().min(0),
});

const editSchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  items: z.array(lineItemSchema).min(1),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

function makeDefaultItem() {
  return {
    expenseType: 'direct-cost' as ExpenseType,
    category: '',
    description: '',
    quantity: 1,
    unit: '',
    unitCost: 0,
    totalCost: 0,
  };
}

interface EditPendingGroupDialogProps {
  group: IPendingExpenseGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPendingGroupDialog({
  group,
  open,
  onOpenChange,
  onSuccess,
}: EditPendingGroupDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directCostCategories, setDirectCostCategories] = useState<string[]>([
    ...DIRECT_COST_CATEGORIES,
  ]);
  const [operatingExpenseCategories, setOperatingExpenseCategories] = useState<
    string[]
  >([...OPERATING_EXPENSE_CATEGORIES]);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      date: new Date(group.date),
      items: group.items.map((i) => ({ ...i })),
      notes: group.notes ?? '',
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
        date: new Date(group.date),
        items: group.items.map((i) => ({ ...i })),
        notes: group.notes ?? '',
      });
    }
  }, [open, group]);

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

  const items = form.watch('items');

  function getItemCategories(expenseType: string): string[] {
    return expenseType === 'direct-cost'
      ? directCostCategories
      : operatingExpenseCategories;
  }

  const groupTotal = items.reduce(
    (sum, item) => sum + (item.totalCost || 0),
    0
  );

  function handleQtyOrCostChange(index: number) {
    const item = form.getValues(`items.${index}`);
    const qty = item.quantity ?? 0;
    const cost = item.unitCost ?? 0;
    form.setValue(
      `items.${index}.totalCost`,
      parseFloat((qty * cost).toFixed(2))
    );
  }

  async function onSubmit(data: EditFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updatePendingExpenseGroupAction(
        group._id.toString(),
        {
          date: data.date,
          items: data.items,
          notes: data.notes,
        }
      );
      if (result.success) {
        toast({ title: 'Updated', description: 'Expense group updated.' });
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Expense Group</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* ── Header: Date only ── */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col max-w-xs">
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

            <Separator />

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

              {fields.map((field, index) => {
                const itemCategories = getItemCategories(
                  items[index]?.expenseType ?? 'direct-cost'
                );
                return (
                  <div
                    key={field.id}
                    className="rounded-md border p-3 space-y-2"
                  >
                    {/* Row 1: Type + Category */}
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.expenseType`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Type
                            </FormLabel>
                            <Select
                              onValueChange={(v) => {
                                f.onChange(v);
                                form.setValue(`items.${index}.category`, '');
                              }}
                              value={f.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-sm">
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
                        name={`items.${index}.category`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Category
                            </FormLabel>
                            <Select onValueChange={f.onChange} value={f.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {itemCategories.map((cat) => (
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
                    {/* Row 2: Description + numeric fields + delete */}
                    <div className="grid grid-cols-[2fr_0.8fr_0.8fr_1.1fr_1.1fr_auto] gap-2 items-start">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Description
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-8 text-sm"
                                placeholder="e.g., Goat"
                                {...f}
                              />
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
                            <FormLabel className="text-xs text-muted-foreground">
                              Qty
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                step="0.01"
                                {...f}
                                onChange={(e) => {
                                  f.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0
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
                            <FormLabel className="text-xs text-muted-foreground">
                              Unit
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-8 text-sm"
                                placeholder="kg"
                                {...f}
                              />
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
                            <FormLabel className="text-xs text-muted-foreground">
                              Unit Cost (₦)
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                step="0.01"
                                {...f}
                                onChange={(e) => {
                                  f.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0
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
                            <FormLabel className="text-xs text-muted-foreground">
                              Total (₦)
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                step="0.01"
                                {...f}
                                onChange={(e) =>
                                  f.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0
                                  )
                                }
                                value={f.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="pt-5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

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
