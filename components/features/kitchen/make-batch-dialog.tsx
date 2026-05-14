'use client';

/**
 * REQ-034 — Make-a-batch dialog.
 */
import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChefHat, Loader2 } from 'lucide-react';
import { makeBatchAction } from '@/app/actions/kitchen/production-actions';

interface ActiveRecipe {
  _id: string;
  name: string;
  yieldPortions: number;
}

export function MakeBatchDialog({ recipes }: { recipes: ActiveRecipe[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState('');
  const [batchCount, setBatchCount] = useState(1);
  const [actualYield, setActualYield] = useState<string>(''); // string so the field can be blank → defaults to expected
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRecipe = recipes.find((r) => r._id === recipeId);
  const expected = selectedRecipe
    ? selectedRecipe.yieldPortions * batchCount
    : 0;

  async function onConfirm() {
    setBusy(true);
    setError(null);
    const result = await makeBatchAction({
      recipeId,
      batchCount,
      actualYield: actualYield.trim() === '' ? undefined : Number(actualYield),
      notes: notes.trim() === '' ? undefined : notes,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setRecipeId('');
    setBatchCount(1);
    setActualYield('');
    setNotes('');
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ChefHat className="h-4 w-4 mr-2" /> Make a batch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a batch</DialogTitle>
          <DialogDescription>
            Deducts every ingredient at once and adds the yield to the target
            menu item's inventory. The batch is blocked if any ingredient is
            short.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Recipe</Label>
            <Select value={recipeId} onValueChange={setRecipeId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick an active recipe…" />
              </SelectTrigger>
              <SelectContent>
                {recipes.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    No active recipes
                  </SelectItem>
                ) : (
                  recipes.map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      {r.name} ({r.yieldPortions} per batch)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Batches</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Actual yield (optional)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder={`Default ${expected}`}
                value={actualYield}
                onChange={(e) => setActualYield(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. burnt some, slightly under"
            />
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
            onClick={onConfirm}
            disabled={busy || !recipeId || batchCount < 1}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…
              </>
            ) : (
              'Run batch'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
