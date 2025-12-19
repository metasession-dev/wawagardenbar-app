'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Banknote, Building2, ExternalLink, Info } from 'lucide-react';

interface AdminPaymentOptionProps {
  onManualPayment: (data: {
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
  }) => void;
  onFullCheckout: () => void;
  isProcessing?: boolean;
}

export function AdminPaymentOption({
  onManualPayment,
  onFullCheckout,
  isProcessing = false,
}: AdminPaymentOptionProps) {
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'checkout'>('manual');
  const [paymentType, setPaymentType] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  function handleManualPaymentSubmit() {
    setError('');

    if (!paymentReference.trim()) {
      setError('Please enter a payment reference');
      return;
    }

    if (paymentReference.trim().length < 3) {
      setError('Payment reference must be at least 3 characters');
      return;
    }

    onManualPayment({
      paymentType,
      paymentReference: paymentReference.trim(),
      comments: comments.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Admin Payment Options</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(value) => setPaymentMethod(value as 'manual' | 'checkout')}
        >
          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
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

          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
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
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <Label>Payment Type *</Label>
              <RadioGroup
                value={paymentType}
                onValueChange={(value) => setPaymentType(value as 'cash' | 'transfer' | 'card')}
              >
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
                onChange={(e) => {
                  setPaymentReference(e.target.value);
                  setError('');
                }}
                disabled={isProcessing}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">Minimum 3 characters</p>
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
              <p className="text-xs text-muted-foreground">{comments.length}/500 characters</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This will mark the order as paid and trigger inventory deduction and reward calculation.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleManualPaymentSubmit}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : 'Complete Payment & Submit Order'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Checkout Redirect Info */}
      {paymentMethod === 'checkout' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You will proceed with the standard payment gateway flow (Monnify/Paystack) to complete this order.
              </AlertDescription>
            </Alert>

            <Button onClick={onFullCheckout} className="w-full">
              Continue to Payment Gateway
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
