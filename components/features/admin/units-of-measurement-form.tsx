'use client';

/**
 * @requirement REQ-033 — App-wide Unit-of-Measurement registry
 */
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { updateUnitsOfMeasurementAction } from '@/app/dashboard/settings/actions';
import {
  UOM_CATEGORIES,
  type UnitOfMeasurement,
  type UoMCategory,
} from '@/interfaces/unit-of-measurement.interface';

const unitSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .regex(
      /^[a-z][a-z0-9-]*$/,
      'Lowercase letters, digits, and hyphens only — no spaces'
    ),
  label: z.string().min(1, 'Label is required'),
  category: z.enum(UOM_CATEGORIES, {
    required_error: 'Category is required',
  }),
  isActive: z.boolean(),
});

const formSchema = z
  .object({
    units: z.array(unitSchema).min(1, 'At least one unit is required'),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.units.forEach((u, idx) => {
      if (seen.has(u.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['units', idx, 'id'],
          message: `Duplicate id: '${u.id}'`,
        });
      }
      seen.add(u.id);
    });
  });

type FormValues = z.infer<typeof formSchema>;

interface UnitsOfMeasurementFormProps {
  initialUnits: UnitOfMeasurement[];
}

const CATEGORY_LABEL: Record<UoMCategory, string> = {
  mass: 'Mass',
  volume: 'Volume',
  count: 'Count',
  time: 'Time',
  other: 'Other',
};

export function UnitsOfMeasurementForm({
  initialUnits,
}: UnitsOfMeasurementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { units: initialUnits },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'units',
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateUnitsOfMeasurementAction(values.units);
      if (result.success) {
        toast({
          title: 'Units of measurement updated',
          description: `Saved ${values.units.length} unit${values.units.length === 1 ? '' : 's'}.`,
        });
      } else {
        toast({
          title: 'Failed to update',
          description: result.error || 'Unknown error',
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
        <CardTitle>Units of Measurement</CardTitle>
        <CardDescription>
          Used by the Expense form, Inventory items, Menu items, and (when
          REQ-034 ships) Recipes. Soft-deleted units stay resolvable for legacy
          records but are hidden from new dropdowns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isActive = form.watch(`units.${index}.isActive`);
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border bg-muted/30"
                  >
                    <FormField
                      control={form.control}
                      name={`units.${index}.id`}
                      render={({ field }) => (
                        <FormItem className="col-span-3">
                          <FormLabel className="text-xs">ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="kg"
                              aria-label={`Unit ID for row ${index + 1}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`units.${index}.label`}
                      render={({ field }) => (
                        <FormItem className="col-span-4">
                          <FormLabel className="text-xs">Label</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Kilograms (kg)"
                              aria-label={`Unit label for row ${index + 1}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`units.${index}.category`}
                      render={({ field }) => (
                        <FormItem className="col-span-3">
                          <FormLabel className="text-xs">Category</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger
                                aria-label={`Unit category for row ${index + 1}`}
                              >
                                <SelectValue placeholder="Pick a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {UOM_CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {CATEGORY_LABEL[c]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`units.${index}.isActive`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 flex items-center pb-2 gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-label={`Active toggle for row ${index + 1}`}
                            />
                          </FormControl>
                          {isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </FormItem>
                      )}
                    />
                    <div className="col-span-1 flex justify-end pb-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        aria-label={`Remove row ${index + 1}`}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    id: '',
                    label: '',
                    category: 'count',
                    isActive: true,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add unit
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
