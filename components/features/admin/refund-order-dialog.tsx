'use client';

/**
 * @requirement REQ-PAY-014 — staff Refund action on the order page (REQ-128, AC4)
 * Offered only to manager, admin and super-admin; the server action checks again.
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { refundOrderAction } from '@/app/actions/admin/refund-actions';
import { Loader2, Undo2 } from 'lucide-react';

interface RefundOrderDialogProps {
  orderId: string;
  orderNumber: string;
  /** What is still refundable, in naira. */
  refundableNaira: number;
  /** A full refund is offered only while nothing has been refunded yet. */
  fullAvailable: boolean;
}

export function RefundOrderDialog({
  orderId,
  orderNumber,
  refundableNaira,
  fullAvailable,
}: RefundOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'full' | 'partial'>(
    fullAvailable ? 'full' : 'partial'
  );
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function submit() {
    setSubmitting(true);
    try {
      const result = await refundOrderAction({
        orderId,
        mode,
        amountNaira: mode === 'partial' ? Number(amount) : undefined,
        reason,
      });
      if (result.success) {
        toast({ title: 'Refund requested', description: result.message });
        setOpen(false);
        setReason('');
        setAmount('');
        router.refresh();
      } else {
        toast({
          title: 'Could not refund',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Could not refund',
        description: 'Something went wrong. Try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Undo2 className="mr-2 h-4 w-4" />
        Refund
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund order #{orderNumber}</DialogTitle>
            <DialogDescription>
              The money goes back to the customer&apos;s original payment
              through Paystack. Up to ₦{refundableNaira.toLocaleString()} can
              still be refunded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              {fullAvailable && (
                <Button
                  type="button"
                  variant={mode === 'full' ? 'default' : 'outline'}
                  onClick={() => setMode('full')}
                >
                  Full refund
                </Button>
              )}
              <Button
                type="button"
                variant={mode === 'partial' ? 'default' : 'outline'}
                onClick={() => setMode('partial')}
              >
                Partial refund
              </Button>
            </div>
            {mode === 'partial' && (
              <div className="space-y-2">
                <Label htmlFor="refund-amount">Amount (₦) *</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  min="1"
                  max={refundableNaira}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason *</Label>
              <Textarea
                id="refund-reason"
                placeholder="Why is this order being refunded? (do not include personal details)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              onClick={submit}
              disabled={
                submitting ||
                !reason.trim() ||
                (mode === 'partial' && !(Number(amount) > 0))
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
