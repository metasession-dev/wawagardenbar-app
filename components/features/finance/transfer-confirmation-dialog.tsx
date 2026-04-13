'use client';

/**
 * @requirement REQ-026 - Pending expense group workflow
 */
import { useState } from 'react';
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
import { confirmTransferAction } from '@/app/actions/finance/pending-expense-actions';
import { toast } from '@/hooks/use-toast';

interface TransferConfirmationDialogProps {
  groupIds: string[];
  totalAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TransferConfirmationDialog({
  groupIds,
  totalAmount,
  open,
  onOpenChange,
  onSuccess,
}: TransferConfirmationDialogProps) {
  const [transferReference, setTransferReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (!transferReference.trim()) {
      setError('Transfer reference is required');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await confirmTransferAction(
        groupIds,
        transferReference.trim()
      );
      if (result.success) {
        const count = 'transferred' in result ? result.transferred : 0;
        toast({
          title: 'Transfer confirmed',
          description: `${count} expense group${count > 1 ? 's' : ''} recorded in the ledger.`,
        });
        setTransferReference('');
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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isSubmitting) {
          setTransferReference('');
          setError('');
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Transfer / Payment</DialogTitle>
          <DialogDescription>
            This will commit {groupIds.length} expense group
            {groupIds.length > 1 ? 's' : ''} (₦
            {totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })})
            to the live ledger. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="transferRef">
              Transfer Reference <span className="text-destructive">*</span>
            </Label>
            <Input
              id="transferRef"
              placeholder="e.g., TRF-2026041201"
              value={transferReference}
              onChange={(e) => {
                setTransferReference(e.target.value);
                setError('');
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTransferReference('');
              setError('');
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !transferReference.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Confirm Transfer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
