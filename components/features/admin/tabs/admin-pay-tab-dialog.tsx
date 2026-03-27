'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { completeTabPaymentManuallyAction, recordPartialPaymentAction } from '@/app/actions/tabs/tab-actions';
import { Loader2, CreditCard, Receipt, DollarSign, SplitSquareHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AdminPayTabDialogProps {
  tabId: string;
  tabNumber: string;
  tableNumber: string;
  total: number;
  outstandingBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * @requirement REQ-012 - Admin dialog for processing tab payments including partial payments
 */
export function AdminPayTabDialog({
  tabId,
  tabNumber,
  tableNumber,
  total,
  outstandingBalance,
  open,
  onOpenChange,
  onSuccess,
}: AdminPayTabDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'partial' | 'checkout'>('manual');
  const [paymentType, setPaymentType] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [comments, setComments] = useState('');
  const [partialAmount, setPartialAmount] = useState('');
  const [partialNote, setPartialNote] = useState('');
  const [partialPaymentType, setPartialPaymentType] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [partialPaymentReference, setPartialPaymentReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const hasPartialPayments = outstandingBalance < total;

  async function handleManualPayment() {
    if (!paymentReference.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a payment or transfer reference',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeTabPaymentManuallyAction({
        tabId,
        paymentType,
        paymentReference: paymentReference.trim(),
        comments: comments.trim(),
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Tab payment completed successfully',
        });
        resetForm();
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to complete payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePartialPayment() {
    const amount = parseFloat(partialAmount);

    if (!amount || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount >= outstandingBalance) {
      toast({
        title: 'Error',
        description: `Partial payment must be less than the outstanding balance (₦${outstandingBalance.toLocaleString()}). Use full payment to close the tab.`,
        variant: 'destructive',
      });
      return;
    }

    if (!partialNote.trim()) {
      toast({
        title: 'Error',
        description: 'A note is required for partial payments',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await recordPartialPaymentAction({
        tabId,
        amount,
        note: partialNote.trim(),
        paymentType: partialPaymentType,
        paymentReference: partialPaymentReference.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Partial Payment Recorded',
          description: `₦${amount.toLocaleString()} recorded. Remaining balance: ₦${(outstandingBalance - amount).toLocaleString()}`,
        });
        resetForm();
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to record partial payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record partial payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCheckoutRedirect() {
    onOpenChange(false);
    router.push(`/dashboard/orders/tabs/${tabId}/checkout`);
  }

  function resetForm() {
    setPaymentReference('');
    setComments('');
    setPartialAmount('');
    setPartialNote('');
    setPartialPaymentReference('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Tab Payment
          </DialogTitle>
          <DialogDescription>
            Tab #{tabNumber} (Table {tableNumber}) —{' '}
            {hasPartialPayments ? (
              <>Outstanding: ₦{outstandingBalance.toLocaleString()} <span className="text-muted-foreground">(of ₦{total.toLocaleString()} total)</span></>
            ) : (
              <>Total: ₦{total.toLocaleString()}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'manual' | 'partial' | 'checkout')}>
              <Card className={paymentMethod === 'manual' ? 'border-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="manual" id="manual" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="manual" className="cursor-pointer font-semibold">
                        Full Payment — Close Tab
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pay the {hasPartialPayments ? 'remaining' : 'full'} balance (₦{outstandingBalance.toLocaleString()}) and close the tab
                      </p>
                    </div>
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className={paymentMethod === 'partial' ? 'border-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="partial" id="partial" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="partial" className="cursor-pointer font-semibold">
                        Partial Payment
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Record a partial payment — the tab stays open with the remaining balance
                      </p>
                    </div>
                    <SplitSquareHorizontal className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className={paymentMethod === 'checkout' ? 'border-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="checkout" id="checkout" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="checkout" className="cursor-pointer font-semibold">
                        Full Checkout Process
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Complete checkout with payment gateway (card, transfer, USSD)
                      </p>
                    </div>
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          </div>

          {/* Manual Full Payment Form */}
          {paymentMethod === 'manual' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="paymentType">Payment Type *</Label>
                <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as 'cash' | 'transfer' | 'card')}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="cursor-pointer">Cash</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transfer" id="transfer" />
                      <Label htmlFor="transfer" className="cursor-pointer">Bank Transfer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="cursor-pointer">Card (POS)</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">
                  {paymentType === 'cash' ? 'Receipt Number' : 'Transfer/Transaction Reference'} *
                </Label>
                <Input
                  id="reference"
                  placeholder={
                    paymentType === 'cash'
                      ? 'Enter receipt number...'
                      : 'Enter transfer or transaction reference...'
                  }
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Add any additional notes about this payment..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleManualPayment}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay ₦{outstandingBalance.toLocaleString()} & Close Tab
              </Button>
            </div>
          )}

          {/* Partial Payment Form */}
          {paymentMethod === 'partial' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="partialAmount">Payment Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                  <Input
                    id="partialAmount"
                    type="number"
                    min="1"
                    max={outstandingBalance - 1}
                    step="any"
                    placeholder="0.00"
                    className="pl-7"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Outstanding balance: ₦{outstandingBalance.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partialNote">Note * <span className="text-xs text-muted-foreground">(mandatory)</span></Label>
                <Textarea
                  id="partialNote"
                  placeholder="e.g., Cash payment for drinks, Customer paid for first round..."
                  value={partialNote}
                  onChange={(e) => setPartialNote(e.target.value)}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Type *</Label>
                <RadioGroup value={partialPaymentType} onValueChange={(value) => setPartialPaymentType(value as 'cash' | 'transfer' | 'card')}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="partial-cash" />
                      <Label htmlFor="partial-cash" className="cursor-pointer">Cash</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transfer" id="partial-transfer" />
                      <Label htmlFor="partial-transfer" className="cursor-pointer">Bank Transfer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="partial-card" />
                      <Label htmlFor="partial-card" className="cursor-pointer">Card (POS)</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partialReference">
                  {partialPaymentType === 'cash' ? 'Receipt Number' : 'Transfer/Transaction Reference'} (Optional)
                </Label>
                <Input
                  id="partialReference"
                  placeholder={
                    partialPaymentType === 'cash'
                      ? 'Enter receipt number...'
                      : 'Enter transfer or transaction reference...'
                  }
                  value={partialPaymentReference}
                  onChange={(e) => setPartialPaymentReference(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {partialAmount && parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < outstandingBalance && (
                <div className="p-3 bg-background rounded-md border text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment amount:</span>
                    <span className="font-medium">₦{parseFloat(partialAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining after payment:</span>
                    <span className="font-semibold">₦{(outstandingBalance - parseFloat(partialAmount)).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handlePartialPayment}
                disabled={isSubmitting || !partialNote.trim() || !partialAmount || parseFloat(partialAmount) <= 0 || parseFloat(partialAmount) >= outstandingBalance}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Partial Payment
              </Button>
            </div>
          )}

          {/* Checkout Process */}
          {paymentMethod === 'checkout' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                You will be redirected to the checkout page where you can complete the payment process
                with the customer using the payment gateway (card, transfer, USSD, or phone number).
              </p>
              <Button
                className="w-full"
                onClick={handleCheckoutRedirect}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Go to Checkout
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
