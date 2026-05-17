'use client';

/**
 * REQ-037 AC3 + AC4 — Archive Kitchen Ingredient confirmation dialog.
 *
 * Archive is the operator-facing verb because the action is **reversible**
 * — the ingredient can be restored later from the Kitchen tab's "Show
 * archived" section. The schema is soft-delete (`archivedAt`), so
 * historical StockMovement / Expense / CostHistory back-refs continue to
 * resolve after archive. Aligns with the Recipe deactivate / reactivate
 * pattern shipped under REQ-034.
 *
 * The action enforces the active-recipe safe-removal guard on the
 * server. If it returns a blocking error, this dialog stays open and
 * renders the error inline so the operator can see exactly which
 * recipes need to be deactivated.
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Archive } from 'lucide-react';
import { archiveKitchenIngredientAction } from '@/app/actions/admin/kitchen-ingredient-actions';

export interface ArchiveKitchenIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: {
    _id: string;
    name: string;
  };
}

export function ArchiveKitchenIngredientDialog({
  open,
  onOpenChange,
  inventory,
}: ArchiveKitchenIngredientDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setBusy(true);
    setError(null);
    const result = await archiveKitchenIngredientAction(inventory._id);
    setBusy(false);
    if (!result.success) {
      // Keep the dialog open; render the named-recipe error inline.
      setError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            Archive kitchen ingredient
          </DialogTitle>
          <DialogDescription>
            <strong>{inventory.name}</strong> will be archived (not deleted).
            Historical expense links, stock movements, and cost history will
            keep referencing it for the audit trail. It will disappear from the
            ingredient pickers and the Kitchen tab&apos;s default view, but you
            can bring it back any time from <em>Show archived</em>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Archiving…
              </>
            ) : (
              'Archive'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
