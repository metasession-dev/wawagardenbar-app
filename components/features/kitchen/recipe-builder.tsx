'use client';

/**
 * REQ-034 — Recipe builder (create + edit).
 *
 * Submits to createRecipeAction / updateRecipeAction. Cross-collection
 * validation lives in RecipeService — error messages surface verbatim.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  createRecipeAction,
  updateRecipeAction,
} from '@/app/actions/kitchen/recipe-actions';

interface TargetOption {
  id: string;
  name: string;
  mainCategory?: string;
  category?: string;
}
interface IngredientOption {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
}
interface RecipeFormIngredient {
  inventoryId: string;
  quantity: number;
  unitId: string;
}
interface InitialRecipe {
  _id: string;
  name: string;
  targetMenuItemId: string;
  yieldPortions: number;
  ingredients: RecipeFormIngredient[];
  notes?: string;
  isActive: boolean;
}

// REQ-033 — unit ids accepted by the registry. The builder offers a
// fixed minimum list; the inventory's own unit is always allowed.
const DEFAULT_UNIT_CHOICES = ['g', 'kg', 'ml', 'litres', 'eggs', 'pieces'];

export function RecipeBuilder({
  initialRecipe,
  targets,
  ingredients,
}: {
  initialRecipe: InitialRecipe | null;
  targets: TargetOption[];
  ingredients: IngredientOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialRecipe?.name ?? '');
  const [targetMenuItemId, setTargetMenuItemId] = useState(
    initialRecipe?.targetMenuItemId ?? ''
  );
  const [yieldPortions, setYieldPortions] = useState(
    initialRecipe?.yieldPortions ?? 1
  );
  const [notes, setNotes] = useState(initialRecipe?.notes ?? '');
  const [rows, setRows] = useState<RecipeFormIngredient[]>(
    initialRecipe?.ingredients ?? [{ inventoryId: '', quantity: 0, unitId: '' }]
  );

  const addRow = () =>
    setRows((r) => [...r, { inventoryId: '', quantity: 0, unitId: '' }]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));
  const updateRow = (i: number, patch: Partial<RecipeFormIngredient>) =>
    setRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    );

  async function onSave() {
    setBusy(true);
    setError(null);
    const payload = {
      name,
      targetMenuItemId,
      yieldPortions,
      ingredients: rows,
      notes,
    };
    const result = initialRecipe
      ? await updateRecipeAction(initialRecipe._id, payload)
      : await createRecipeAction(payload);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push('/dashboard/kitchen/recipes');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialRecipe ? 'Edit' : 'New'} Recipe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Recipe name</Label>
            <Input
              id="recipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pepper Soup — large pot"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipe-target">Target menu item</Label>
            <Select
              value={targetMenuItemId}
              onValueChange={setTargetMenuItemId}
            >
              <SelectTrigger id="recipe-target">
                <SelectValue placeholder="Pick a menu item…" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.category ? ` — ${t.category}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipe-yield">Portions per batch</Label>
            <Input
              id="recipe-yield"
              type="number"
              min={1}
              step={1}
              value={yieldPortions}
              onChange={(e) => setYieldPortions(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Ingredients</Label>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> Add ingredient
            </Button>
          </div>
          {rows.map((row, i) => {
            const inv = ingredients.find((x) => x.id === row.inventoryId);
            return (
              <div
                key={i}
                className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end rounded-md border p-2"
              >
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Kitchen ingredient
                  </Label>
                  <Select
                    value={row.inventoryId}
                    onValueChange={(v) => {
                      const next = ingredients.find((x) => x.id === v);
                      updateRow(i, {
                        inventoryId: v,
                        unitId: row.unitId || next?.unit || '',
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          No kitchen ingredients available
                        </SelectItem>
                      ) : (
                        ingredients.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Quantity
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(i, { quantity: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <Select
                    value={row.unitId}
                    onValueChange={(v) => updateRow(i, { unitId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unit…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        new Set(
                          [...DEFAULT_UNIT_CHOICES, inv?.unit ?? ''].filter(
                            Boolean
                          )
                        )
                      ).map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={rows.length === 1}
                  onClick={() => removeRow(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipe-notes">Notes (optional)</Label>
          <Textarea
            id="recipe-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Prep tips, plating, etc."
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/kitchen/recipes')}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : initialRecipe ? (
              'Update recipe'
            ) : (
              'Create recipe'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
