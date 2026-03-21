/**
 * @requirement REQ-009 - Express Close Tab flow
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  expressListOpenTabsAction,
  expressGetTabForCloseAction,
  expressCloseTabAction,
} from '@/app/actions/admin/express-actions';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Banknote,
  CreditCard,
  Building2,
} from 'lucide-react';

interface OpenTab {
  _id: string;
  tabNumber: string;
  tableNumber: string;
  customerName?: string;
  total: number;
  orders: string[];
  openedAt: string;
}

interface TabDetails {
  tab: OpenTab;
  orders: Array<{
    _id: string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number; subtotal: number }>;
    total: number;
    status: string;
  }>;
}

export default function ExpressCloseTabPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<'select' | 'confirm' | 'done'>('select');
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabDetails, setTabDetails] = useState<TabDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [closing, setClosing] = useState(false);

  const [paymentType, setPaymentType] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    loadOpenTabs();
  }, []);

  async function loadOpenTabs() {
    setLoading(true);
    const result = await expressListOpenTabsAction();
    if (result.success && result.data) {
      setOpenTabs(result.data.tabs as unknown as OpenTab[]);
    }
    setLoading(false);
  }

  async function selectTab(tabId: string) {
    setLoadingDetails(true);
    const result = await expressGetTabForCloseAction(tabId);
    if (result.success && result.data) {
      setTabDetails(result.data as unknown as TabDetails);
      setStep('confirm');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setLoadingDetails(false);
  }

  async function handleCloseTab() {
    if (!tabDetails) return;

    setClosing(true);
    const result = await expressCloseTabAction({
      tabId: tabDetails.tab._id,
      paymentType,
      paymentReference: paymentReference || undefined,
    });

    if (result.success) {
      setStep('done');
      toast({ title: 'Tab Closed', description: `${tabDetails.tab.tabNumber} has been closed` });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setClosing(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === 'confirm') {
              setStep('select');
              setTabDetails(null);
            } else {
              router.push('/dashboard/orders');
            }
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Express: Close Tab</h1>
          <p className="text-muted-foreground">
            {step === 'select' && 'Select a tab to close'}
            {step === 'confirm' && 'Review and confirm'}
            {step === 'done' && 'Tab closed'}
          </p>
        </div>
      </div>

      {/* Step 1: Select tab */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Open Tabs</CardTitle>
            <CardDescription>
              {loading
                ? 'Loading...'
                : `${openTabs.length} tab${openTabs.length !== 1 ? 's' : ''} open`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : openTabs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No open tabs to close</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/dashboard/orders')}
                >
                  Back to Orders
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {openTabs.map((tab) => (
                  <div
                    key={tab._id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-all"
                    onClick={() => selectTab(tab._id)}
                  >
                    <div>
                      <p className="font-medium">Table {tab.tableNumber}</p>
                      {tab.customerName && (
                        <p className="text-sm text-muted-foreground">{tab.customerName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{tab.orders.length} orders</Badge>
                      <span className="font-bold text-lg">₦{tab.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {loadingDetails && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading tab details...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirm and pay */}
      {step === 'confirm' && tabDetails && (
        <>
          {/* Tab Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {tabDetails.tab.tabNumber} — Table {tabDetails.tab.tableNumber}
              </CardTitle>
              {tabDetails.tab.customerName && (
                <CardDescription>{tabDetails.tab.customerName}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {tabDetails.orders.map((order) => (
                <div key={order._id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{order.orderNumber}</span>
                    <Badge variant="outline" className="text-xs">
                      {order.status}
                    </Badge>
                  </div>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm pl-4">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>₦{item.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₦{tabDetails.tab.total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          {tabDetails.tab.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={paymentType === 'cash' ? 'default' : 'outline'}
                    className="h-14 flex-col gap-1"
                    onClick={() => setPaymentType('cash')}
                  >
                    <Banknote className="h-4 w-4" />
                    Cash
                  </Button>
                  <Button
                    variant={paymentType === 'card' ? 'default' : 'outline'}
                    className="h-14 flex-col gap-1"
                    onClick={() => setPaymentType('card')}
                  >
                    <CreditCard className="h-4 w-4" />
                    POS
                  </Button>
                  <Button
                    variant={paymentType === 'transfer' ? 'default' : 'outline'}
                    className="h-14 flex-col gap-1"
                    onClick={() => setPaymentType('transfer')}
                  >
                    <Building2 className="h-4 w-4" />
                    Transfer
                  </Button>
                </div>
                {paymentType !== 'cash' && (
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
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleCloseTab}
            disabled={closing}
          >
            {closing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Close Tab{tabDetails.tab.total > 0 ? ` — ₦${tabDetails.tab.total.toLocaleString()}` : ''}
          </Button>
        </>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 space-y-4">
            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Tab Closed</h2>
            <p className="text-muted-foreground">Payment recorded successfully</p>
            <Button size="lg" onClick={() => router.push('/dashboard/orders')}>
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
