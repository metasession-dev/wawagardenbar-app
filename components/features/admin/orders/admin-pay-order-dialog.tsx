'use client';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Banknote, Building2, ExternalLink, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { completeOrderPaymentManuallyAction } from '@/app/actions/admin/order-payment-actions';

interface AdminPayOrderDialogProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminPayOrderDialog({
  orderId,
  orderNumber,
  totalAmount,
  open,
  onOpenChange,
  onSuccess,
}: AdminPayOrderDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'checkout'>('manual');
  const [paymentType, setPaymentType] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  }

  function handleClose() {
    if (!isProcessing) {
      setPaymentMethod('manual');
      setPaymentType('cash');
      setPaymentReference('');
      setComments('');
      onOpenChange(false);
    }
  }

  async function handleManualPayment() {
    if (!paymentReference.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a payment reference',
        variant: 'destructive',
      });
      return;
    }

    if (paymentReference.trim().length < 3) {
      toast({
        title: 'Validation Error',
        description: 'Payment reference must be at least 3 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await completeOrderPaymentManuallyAction({
        orderId,
        paymentType,
        paymentReference: paymentReference.trim(),
        comments: comments.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Payment Processed',
          description: `Order ${orderNumber} has been marked as paid`,
        });
        handleClose();
        onSuccess?.();
      } else {
        toast({
          title: 'Payment Failed',
          description: result.message || 'Failed to process payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleFullCheckout() {
    router.push(`/checkout?orderId=${orderId}`);
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Order Payment</DialogTitle>
          <DialogDescription>
            Complete payment for Order #{orderNumber} - {formatPrice(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'manual' | 'checkout')}>
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="manual" id="manual" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="manual" className="flex items-center gap-2 font-medium cursor-pointer">
                    <CreditCard className="h-4 w-4" />
                    Manual Payment Entry
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enter payment details for cash, bank transfer, or POS card payments.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="checkout" id="checkout" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="checkout" className="flex items-center gap-2 font-medium cursor-pointer">
                    <ExternalLink className="h-4 w-4" />
                    Full Checkout Process
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Complete checkout with payment gateway (Card, Transfer, USSD).
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Manual Payment Form */}
          {paymentMethod === 'manual' && (
            <>
              <div className="space-y-3">
                <Label>Payment Type *</Label>
                <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as 'cash' | 'transfer' | 'card')}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer font-normal">
                        <Banknote className="h-4 w-4" />
                        Cash
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transfer" id="transfer" />
                      <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer font-normal">
                        <Building2 className="h-4 w-4" />
                        Bank Transfer
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer font-normal">
                        <CreditCard className="h-4 w-4" />
                        Card (POS)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Receipt Number *</Label>
                <Input
                  id="reference"
                  placeholder="Enter receipt or reference number..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  disabled={isProcessing}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 3 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Add any additional notes about this payment..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={isProcessing}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {comments.length}/500 characters
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This will mark the order as paid and trigger inventory deduction and reward calculation.
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Checkout Redirect Info */}
          {paymentMethod === 'checkout' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You will be redirected to the customer checkout flow to process payment via Monnify/Paystack gateway.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          {paymentMethod === 'manual' ? (
            <Button onClick={handleManualPayment} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Complete Payment'}
            </Button>
          ) : (
            <Button onClick={handleFullCheckout}>
              Proceed to Checkout
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
