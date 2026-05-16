'use client';

/**
 * REQ-037 AC3 + AC4 — Delete Kitchen Ingredient confirmation dialog.
 *
 * Confirmation step before invoking `deleteKitchenIngredientAction`. The
 * action enforces the active-recipe safe-removal guard on the server.
 * If it returns a blocking error, this dialog stays open and renders
 * the error inline so the operator can see exactly which recipes need
 * to be deactivated.
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
import { Loader2, AlertTriangle } from 'lucide-react';
import { deleteKitchenIngredientAction } from '@/app/actions/admin/kitchen-ingredient-actions';

export interface DeleteKitchenIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: {
    _id: string;
    name: string;
  };
}

export function DeleteKitchenIngredientDialog({
  open,
  onOpenChange,
  inventory,
}: DeleteKitchenIngredientDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setBusy(true);
    setError(null);
    const result = await deleteKitchenIngredientAction(inventory._id);
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete kitchen ingredient
          </DialogTitle>
          <DialogDescription>
            <strong>{inventory.name}</strong> will be archived. Historical
            expense links, stock movements, and cost history will keep
            referencing it for the audit trail, but it won't appear in any
            ingredient picker after this.
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
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
