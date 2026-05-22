'use client';

/**
 * @requirement REQ-028 - Grouped expense category dropdown in Add Expense
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  createPendingExpenseGroupAction,
  listKitchenIngredientInventoryAction,
  listSellableInventoryAction,
} from '@/app/actions/finance/pending-expense-actions';
import { getExpenseCategoriesAction } from '@/app/actions/finance/expense-categories-actions';
import { getUnitsOfMeasurementAction } from '@/app/actions/units-actions';
import {
  DEFAULT_UNITS_OF_MEASUREMENT,
  type UnitOfMeasurement,
} from '@/interfaces/unit-of-measurement.interface';
import { getActiveUnits } from '@/lib/units';
import { toast } from '@/hooks/use-toast';
import {
  DIRECT_COST_CATEGORIES,
  OPERATING_EXPENSE_CATEGORIES,
} from '@/interfaces/expense.interface';
import type {
  CategoryGroup,
  ExpenseType,
} from '@/interfaces/expense.interface';
import { buildDropdownSections } from '@/lib/expense-categories-display';

const lineItemSchema = z.object({
  expenseType: z.enum(['direct-cost', 'operating-expense'], {
    required_error: 'Expense type is required',
  }),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  quantity: z.number().min(0, 'Quantity must be 0 or more'),
  unit: z.string().min(1, 'Unit is required'),
  unitCost: z.number().min(0, 'Unit cost must be 0 or more'),
  totalCost: z.number().min(0, 'Total cost must be 0 or more'),
  // REQ-034 AC5 — optional kitchen-ingredient inventory id.
  linkedInventoryId: z.string().optional(),
});

const expenseFormSchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

function makeDefaultItem() {
  return {
    expenseType: 'direct-cost' as ExpenseType,
    category: '',
    description: '',
    quantity: 1,
    unit: '',
    unitCost: 0,
    totalCost: 0,
    linkedInventoryId: undefined as string | undefined,
  };
}

import {
  InventoryLinkSection,
  type KitchenInventoryOption,
  type SellableInventoryOption,
} from './inventory-link-section';
import { computeLockedUnit } from '@/lib/expense-inventory-link';
import { useExpenseLineAutoDerive } from '@/hooks/use-expense-line-auto-derive';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /**
   * @requirement REQ-032 — `items` lets the caller open the dialog
   * pre-populated with one or more line items (e.g. mapped from selected
   * existing Expense rows). When omitted the dialog opens with one blank line.
   */
  prefill?: { date?: Date; items?: ExpenseFormValues['items'] };
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
  const [directCostGroups, setDirectCostGroups] = useState<CategoryGroup[]>([]);
  const [operatingExpenseGroups, setOperatingExpenseGroups] = useState<
    CategoryGroup[]
  >([]);
  const [unitsRegistry, setUnitsRegistry] = useState<UnitOfMeasurement[]>([
    ...DEFAULT_UNITS_OF_MEASUREMENT,
  ]);
  // REQ-034 AC5 — kitchen-ingredient inventory rows for the per-line
  // "Add to inventory" dropdown; only loaded when the dialog opens.
  const [kitchenInventory, setKitchenInventory] = useState<
    KitchenInventoryOption[]
  >([]);
  // REQ-038 — sellable inventory rows for the per-line "Update inventory
  // count" sellable dropdown.
  const [sellableInventory, setSellableInventory] = useState<
    SellableInventoryOption[]
  >([]);
  // REQ-038 — per-line "Update inventory count" checkbox state. Keyed by
  // line index; not persisted in the form schema because the underlying
  // field is the shared `linkedInventoryId`.
  const [sellableLinkEnabled, setSellableLinkEnabled] = useState<
    Record<number, boolean>
  >({});

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: prefill?.date ?? new Date(),
      items:
        prefill?.items && prefill.items.length > 0
          ? prefill.items
          : [makeDefaultItem()],
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
      fetchUnits();
      fetchKitchenInventory();
      fetchSellableInventory();
      setSellableLinkEnabled({});
      resetAutoDerive();
      form.reset({
        date: prefill?.date ?? new Date(),
        items:
          prefill?.items && prefill.items.length > 0
            ? prefill.items
            : [makeDefaultItem()],
        notes: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fetchCategories() {
    try {
      const result = await getExpenseCategoriesAction();
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
    } catch {
      /* use defaults */
    }
  }

  // REQ-033: load the UoM registry; falls back to seed defaults on error.
  async function fetchUnits() {
    try {
      const result = await getUnitsOfMeasurementAction();
      if (result.success && result.units && result.units.length > 0) {
        setUnitsRegistry(result.units);
      }
    } catch {
      /* keep seed defaults */
    }
  }

  // REQ-034 AC5: load kitchen-ingredient inventory rows for the dropdown.
  async function fetchKitchenInventory() {
    try {
      const result = await listKitchenIngredientInventoryAction();
      if (result.success && result.items) {
        setKitchenInventory(result.items);
      }
    } catch {
      /* dropdown will simply be empty */
    }
  }

  // REQ-038: load sellable inventory rows for the "Update inventory
  // count" dropdown.
  async function fetchSellableInventory() {
    try {
      const result = await listSellableInventoryAction();
      if (result.success && result.items) {
        setSellableInventory(result.items);
      }
    } catch {
      /* dropdown will simply be empty */
    }
  }

  const items = form.watch('items');

  function getDropdownSections(expenseType: string) {
    const categories =
      expenseType === 'direct-cost'
        ? directCostCategories
        : operatingExpenseCategories;
    const groups =
      expenseType === 'direct-cost' ? directCostGroups : operatingExpenseGroups;
    return buildDropdownSections(categories, groups);
  }

  // #104 — bidirectional auto-derive across {quantity, unitCost, totalCost}.
  // The hook tracks which of {unitCost, totalCost} was last edited per
  // row and recomputes the other side when qty changes. Editing Unit
  // Cost recomputes Total; editing Total recomputes Unit Cost. Qty is
  // the anchor — if qty isn't > 0, nothing computes.
  const { onFieldEdit, resetAll: resetAutoDerive } = useExpenseLineAutoDerive({
    form,
  });

  const groupTotal = items.reduce(
    (sum, item) => sum + (item.totalCost || 0),
    0
  );

  async function onSubmit(data: ExpenseFormValues) {
    setIsSubmitting(true);
    try {
      const result = await createPendingExpenseGroupAction({
        date: data.date,
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

              {fields.map((field, index) => {
                const sections = getDropdownSections(
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
                                // REQ-034 AC5: clear the inventory link when
                                // expense type flips away from Direct Cost.
                                if (v !== 'direct-cost') {
                                  form.setValue(
                                    `items.${index}.linkedInventoryId`,
                                    undefined
                                  );
                                }
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
                                {sections.map((section, sectionIdx) => {
                                  const key =
                                    section.heading ??
                                    `__ungrouped_${sectionIdx}`;
                                  const showSeparator =
                                    sectionIdx > 0 &&
                                    sections[sectionIdx - 1].items.length > 0 &&
                                    section.items.length > 0;
                                  return (
                                    <div key={key}>
                                      {showSeparator && <SelectSeparator />}
                                      {section.heading !== null ? (
                                        <SelectGroup>
                                          <SelectLabel>
                                            {section.heading}
                                          </SelectLabel>
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
                                placeholder="1"
                                {...f}
                                onChange={(e) => {
                                  f.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0
                                  );
                                  onFieldEdit(index, 'quantity');
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
                        render={({ field: f }) => {
                          const lockedUnit = computeLockedUnit(
                            sellableLinkEnabled[index] === true,
                            items[index]?.linkedInventoryId,
                            sellableInventory
                          );
                          return (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">
                                Unit
                              </FormLabel>
                              <Select
                                value={f.value}
                                onValueChange={f.onChange}
                                disabled={!!lockedUnit}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {getActiveUnits(unitsRegistry).map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
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
                                step="0.0001"
                                placeholder="0.00"
                                {...f}
                                onChange={(e) => {
                                  f.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0
                                  );
                                  onFieldEdit(index, 'unitCost');
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
                                placeholder="0.00"
                                {...f}
                                onChange={(e) => {
                                  f.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0
                                  );
                                  onFieldEdit(index, 'totalCost');
                                }}
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
                    {/* Inventory linking — Direct Cost only. Shared with
                        the Edit Pending Group dialog via the same component. */}
                    <InventoryLinkSection
                      form={form}
                      index={index}
                      expenseType={items[index]?.expenseType ?? ''}
                      kitchenInventory={kitchenInventory}
                      sellableInventory={sellableInventory}
                      sellableLinkEnabled={sellableLinkEnabled[index] === true}
                      setSellableLinkEnabled={(enabled) =>
                        setSellableLinkEnabled((prev) => ({
                          ...prev,
                          [index]: enabled,
                        }))
                      }
                    />
                  </div>
                );
              })}

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
