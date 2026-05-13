'use client';

/**
 * REQ-034 / D7 — Add Kitchen Ingredient dialog.
 *
 * Creates a hidden MenuItem + paired Inventory row both tagged
 * `kind:'kitchen-ingredient'`. Renders on the Kitchen tab of the
 * inventory dashboard.
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Loader2 } from 'lucide-react';
import {
  createKitchenIngredientAction,
  getKitchenIngredientFormOptionsAction,
} from '@/app/actions/admin/kitchen-ingredient-actions';

interface UnitOption {
  id: string;
  label: string;
  category: string;
}

export function AddKitchenIngredientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [currentStock, setCurrentStock] = useState<string>('0');
  const [minimumStock, setMinimumStock] = useState<string>('0');
  const [maximumStock, setMaximumStock] = useState<string>('0');

  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const result = await getKitchenIngredientFormOptionsAction();
      if (cancelled) return;
      if (result.success) {
        setCategories(result.categories);
        setUnits(result.units);
      } else {
        setError(result.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function resetForm() {
    setName('');
    setCategory('');
    setUnit('');
    setCurrentStock('0');
    setMinimumStock('0');
    setMaximumStock('0');
    setError(null);
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const result = await createKitchenIngredientAction({
      name,
      category,
      unit,
      currentStock: currentStock === '' ? 0 : Number(currentStock),
      minimumStock: minimumStock === '' ? 0 : Number(minimumStock),
      maximumStock: maximumStock === '' ? 0 : Number(maximumStock),
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Kitchen Ingredient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Kitchen Ingredient</DialogTitle>
          <DialogDescription>
            Creates a kitchen-ingredient inventory row (and a paired hidden
            menu-item record). Kitchen ingredients are used in recipes and are
            never shown on the customer menu.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ki-name">Name</Label>
            <Input
              id="ki-name"
              placeholder="e.g. Goat meat"
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
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a unit…" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ki-current">Initial stock</Label>
              <Input
                id="ki-current"
                type="number"
                min={0}
                step="any"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ki-min">Min stock</Label>
              <Input
                id="ki-min"
                type="number"
                min={0}
                step="any"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ki-max">Max stock</Label>
              <Input
                id="ki-max"
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
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={busy || !name.trim() || !category || !unit}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              'Create ingredient'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
