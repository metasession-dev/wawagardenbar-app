/**
 * @requirement REQ-084 - Admin manual tab payment form (separated from customer checkout)
 * @requirement REQ-TABMGT-003 - Admin pay tab with cash, transfer, or POS
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { completeTabPaymentManuallyAction } from '@/app/actions/tabs/tab-actions';
import { TipInputRow } from '@/components/features/orders/tip-input-row';
import {
  Banknote,
  CreditCard,
  Building2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface AdminTabCheckoutFormProps {
  tab: {
    _id: string;
    tabNumber: string;
    tableNumber: string;
    customerName?: string;
    total: number;
    subtotal?: number;
    tax?: number;
    serviceFee?: number;
    deliveryFee?: number;
    discount?: number;
    tipAmount?: number;
    partialPayments?: Array<{
      amount: number;
      paymentType: string;
      note: string;
      paidAt: string;
    }>;
    orders?: Array<{
      orderNumber: string;
      total: number;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
    }>;
  };
}

export function AdminTabCheckoutForm({ tab }: AdminTabCheckoutFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'transfer' | 'card'
  >('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [comments, setComments] = useState('');
  const [tipAmount, setTipAmount] = useState(0);
  const [tipPaymentMethod, setTipPaymentMethod] = useState<
    'cash' | 'transfer' | 'card'
  >('cash');
  const [tipMethodOverridden, setTipMethodOverridden] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const effectiveTipMethod = tipMethodOverridden
    ? tipPaymentMethod
    : paymentMethod;

  const totalPartialPayments = (tab.partialPayments ?? []).reduce(
    (sum, pp) => sum + pp.amount,
    0
  );
  const outstandingBalance = tab.total - totalPartialPayments;

  async function handleSubmit() {
    setSubmitting(true);
    const result = await completeTabPaymentManuallyAction({
      tabId: tab._id,
      paymentType: paymentMethod,
      paymentReference:
        paymentReference || `ADMIN-TAB-${tab._id.slice(-6)}-${Date.now()}`,
      comments: comments || undefined,
      tipAmount: tipAmount > 0 ? tipAmount : undefined,
      tipPaymentMethod: tipAmount > 0 ? effectiveTipMethod : undefined,
    });

    if (result.success) {
      toast({
        title: 'Tab Paid & Closed',
        description: `Table ${tab.tableNumber} — ₦${tab.total.toLocaleString()}`,
      });
      router.push(`/dashboard/orders/tabs/${tab._id}`);
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/orders/tabs/${tab._id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Close Tab — Table {tab.tableNumber}
          </h1>
          <p className="text-muted-foreground">
            Tab #{tab.tabNumber}
            {tab.customerName ? ` · ${tab.customerName}` : ''}
          </p>
        </div>
      </div>

      {/* Tab Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tab Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tab.orders && tab.orders.length > 0 && (
            <div className="space-y-2">
              {tab.orders.map((order) => (
                <div key={order.orderNumber} className="text-sm">
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="text-muted-foreground ml-2">
                    ₦{order.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Separator />
          {tab.subtotal !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₦{(tab.subtotal ?? 0).toLocaleString()}</span>
            </div>
          )}
          {tab.serviceFee !== undefined && tab.serviceFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service Fee</span>
              <span>₦{(tab.serviceFee ?? 0).toLocaleString()}</span>
            </div>
          )}
          {tab.tax !== undefined && tab.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>₦{(tab.tax ?? 0).toLocaleString()}</span>
            </div>
          )}
          {tab.discount !== undefined && tab.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-₦{(tab.discount ?? 0).toLocaleString()}</span>
            </div>
          )}
          {totalPartialPayments > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Partial Payments</span>
                <span>-₦{totalPartialPayments.toLocaleString()}</span>
              </div>
            </>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Outstanding Balance</span>
            <span>₦{outstandingBalance.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={paymentMethod === 'cash' ? 'default' : 'outline'}
              className="h-14 flex-col gap-1"
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote className="h-4 w-4" />
              Cash
            </Button>
            <Button
              variant={paymentMethod === 'card' ? 'default' : 'outline'}
              className="h-14 flex-col gap-1"
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard className="h-4 w-4" />
              POS
            </Button>
            <Button
              variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
              className="h-14 flex-col gap-1"
              onClick={() => setPaymentMethod('transfer')}
            >
              <Building2 className="h-4 w-4" />
              Transfer
            </Button>
          </div>

          {paymentMethod !== 'cash' && (
            <div className="space-y-2">
              <Label htmlFor="paymentRef">Reference (optional)</Label>
              <Input
                id="paymentRef"
                placeholder="Transaction reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (optional)</Label>
            <Input
              id="comments"
              placeholder="Notes about this payment"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          <TipInputRow
            tipAmount={tipAmount}
            onTipAmountChange={setTipAmount}
            tipPaymentMethod={effectiveTipMethod}
            onTipPaymentMethodChange={(m) => {
              setTipPaymentMethod(m);
              setTipMethodOverridden(true);
            }}
            disabled={submitting}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4 mr-2" />
        )}
        Close Tab · Pay ₦{outstandingBalance.toLocaleString()}
      </Button>
    </div>
  );
}
