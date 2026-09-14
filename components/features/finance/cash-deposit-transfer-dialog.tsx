'use client';

/**
 * @requirement REQ-106 - Confirm a cash deposit's bank transfer.
 * Like transfer-confirmation-dialog.tsx but reference is OPTIONAL.
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
import { confirmCashDepositTransferAction } from '@/app/actions/finance/cash-deposit-actions';
import { toast } from '@/hooks/use-toast';

interface CashDepositTransferDialogProps {
  depositId: string | null;
  amount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CashDepositTransferDialog({
  depositId,
  amount,
  open,
  onOpenChange,
  onSuccess,
}: CashDepositTransferDialogProps) {
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    if (!depositId) return;
    setIsSubmitting(true);
    try {
      const result = await confirmCashDepositTransferAction(
        depositId,
        reference.trim() || undefined
      );
      if (result.success) {
        toast({
          title: 'Deposit confirmed',
          description: 'Current Cash Position updated.',
        });
        setReference('');
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
          setReference('');
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Deposit Transfer</DialogTitle>
          <DialogDescription>
            This will confirm the ₦
            {amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}{' '}
            deposit and reduce Current Cash Position. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="depositRef">Bank Reference (Optional)</Label>
          <Input
            id="depositRef"
            placeholder="e.g., deposit slip #"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Confirm Deposit'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
