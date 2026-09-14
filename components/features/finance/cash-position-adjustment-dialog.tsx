'use client';

/**
 * @requirement REQ-106 - Super-admin cash position adjustment (opening
 * balance seed or later correction). Modeled on
 * `transfer-confirmation-dialog.tsx`'s single-purpose shape.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { recordCashPositionAdjustmentAction } from '@/app/actions/finance/cash-position-actions';
import { toast } from '@/hooks/use-toast';

interface CashPositionAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Whether a seed already exists — decides the 'seed' vs 'correction' type. */
  seeded: boolean;
  currentPosition: number;
  formatCurrency: (n: number) => string;
}

export function CashPositionAdjustmentDialog({
  open,
  onOpenChange,
  onSuccess,
  seeded,
  currentPosition,
  formatCurrency,
}: CashPositionAdjustmentDialogProps) {
  const [newPosition, setNewPosition] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNewPosition(seeded ? String(currentPosition) : '');
      setNote('');
      setError('');
    }
  }, [open, seeded, currentPosition]);

  async function handleSubmit() {
    const parsed = parseFloat(newPosition);
    if (Number.isNaN(parsed)) {
      setError('Enter a valid amount');
      return;
    }
    const delta = seeded ? parsed - currentPosition : parsed;
    if (delta === 0) {
      setError('New position matches the current position — nothing to record');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await recordCashPositionAdjustmentAction({
        type: seeded ? 'correction' : 'seed',
        amount: delta,
        effectiveDate: new Date(),
        note: note.trim() || undefined,
      });
      if (result.success) {
        toast({
          title: seeded ? 'Position corrected' : 'Opening balance set',
          description: `Current Cash Position updated to ${formatCurrency(parsed)}.`,
        });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {seeded ? 'Adjust Cash Position' : 'Set Opening Balance'}
          </DialogTitle>
          <DialogDescription>
            {seeded
              ? `Current computed position: ${formatCurrency(currentPosition)}. Enter the actual counted amount — the difference is recorded as an audited correction.`
              : 'Enter the actual counted cash-on-hand right now. Every cash sale, expense, and deposit from this point forward is tracked on top of it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="newPosition">
              {seeded ? 'New Position (₦)' : 'Opening Balance (₦)'}
            </Label>
            <Input
              id="newPosition"
              type="number"
              step="0.01"
              value={newPosition}
              onChange={(e) => {
                setNewPosition(e.target.value);
                setError('');
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Reason (optional)</Label>
            <Textarea
              id="note"
              placeholder="e.g., physical count found ₦500 more than expected"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newPosition}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
