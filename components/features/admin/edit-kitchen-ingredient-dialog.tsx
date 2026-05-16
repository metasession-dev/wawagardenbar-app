'use client';

/**
 * REQ-037 AC1 — Edit Kitchen Ingredient dialog.
 *
 * Pre-filled. Allows editing the name, COGS category, and min/max stock
 * thresholds. Unit is rendered as a disabled display-only field with a
 * tooltip explaining the lock (changing the unit retroactively would
 * corrupt every StockMovement, CostHistory row, and Recipe row that
 * references this ingredient).
 *
 * currentStock is NOT editable here — that's an inventory adjustment
 * with its own audit-trail requirements; out of scope for REQ-037.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock } from 'lucide-react';
import {
  getKitchenIngredientFormOptionsAction,
  updateKitchenIngredientAction,
} from '@/app/actions/admin/kitchen-ingredient-actions';
import { buildDropdownSections } from '@/lib/expense-categories-display';
import type { CategoryGroup } from '@/interfaces/expense.interface';

interface UnitOption {
  id: string;
  label: string;
  category: string;
}

export interface EditKitchenIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: {
    _id: string;
    name: string;
    category: string;
    unit: string;
    minimumStock: number;
    maximumStock: number;
  };
}

export function EditKitchenIngredientDialog({
  open,
  onOpenChange,
  inventory,
}: EditKitchenIngredientDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(inventory.name);
  const [category, setCategory] = useState(inventory.category);
  const [minimumStock, setMinimumStock] = useState<string>(
    String(inventory.minimumStock ?? 0)
  );
  const [maximumStock, setMaximumStock] = useState<string>(
    String(inventory.maximumStock ?? 0)
  );

  const [categories, setCategories] = useState<string[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);

  // Reset local state when a new row is opened.
  useEffect(() => {
    if (open) {
      setName(inventory.name);
      setCategory(inventory.category);
      setMinimumStock(String(inventory.minimumStock ?? 0));
      setMaximumStock(String(inventory.maximumStock ?? 0));
      setError(null);
    }
  }, [open, inventory]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const result = await getKitchenIngredientFormOptionsAction();
      if (cancelled) return;
      if (result.success) {
        setCategories(result.categories);
        setCategoryGroups(result.categoryGroups ?? []);
        setUnits(result.units);
      } else {
        setError(result.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const categorySections = buildDropdownSections(categories, categoryGroups);
  const lockedUnitLabel =
    units.find((u) => u.id === inventory.unit)?.label ?? inventory.unit;

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const result = await updateKitchenIngredientAction({
      inventoryId: inventory._id,
      name,
      category,
      minimumStock: minimumStock === '' ? 0 : Number(minimumStock),
      maximumStock: maximumStock === '' ? 0 : Number(maximumStock),
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Kitchen Ingredient</DialogTitle>
          <DialogDescription>
            Update the ingredient's display name, COGS category, or stock
            thresholds. The unit cannot be changed here — see the lock icon for
            why.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="edit-ki-name">Name</Label>
            <Input
              id="edit-ki-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>COGS category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a category…" />
                </SelectTrigger>
                <SelectContent>
                  {categorySections.map((section, sectionIdx) => {
                    const key = section.heading ?? `__ungrouped_${sectionIdx}`;
                    const showSeparator =
                      sectionIdx > 0 &&
                      categorySections[sectionIdx - 1].items.length > 0 &&
                      section.items.length > 0;
                    return (
                      <div key={key}>
                        {showSeparator && <SelectSeparator />}
                        {section.heading !== null ? (
                          <SelectGroup>
                            <SelectLabel>{section.heading}</SelectLabel>
                            {section.items.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ) : (
                          section.items.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))
                        )}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="edit-ki-unit-locked"
                className="flex items-center gap-1"
              >
                Unit
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="edit-ki-unit-locked"
                value={lockedUnitLabel}
                disabled
                aria-disabled
                title="Unit is locked. Changing it retroactively would corrupt every StockMovement and recipe that references this ingredient. Delete the ingredient and create a new one if you need a different unit."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-ki-min">Min stock</Label>
              <Input
                id="edit-ki-min"
                type="number"
                min={0}
                step="any"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-ki-max">Max stock</Label>
              <Input
                id="edit-ki-max"
                type="number"
                min={0}
                step="any"
                value={maximumStock}
                onChange={(e) => setMaximumStock(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={busy || !name.trim() || !category}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
