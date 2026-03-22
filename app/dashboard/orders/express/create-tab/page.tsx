/**
 * @requirement REQ-009 - Express Create Tab flow
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { expressListOpenTabsAction, expressCreateTabAction } from '@/app/actions/admin/express-actions';
import { ArrowLeft, Plus, Receipt, ArrowRight, Loader2 } from 'lucide-react';

interface OpenTab {
  _id: string;
  tabNumber: string;
  tableNumber: string;
  customerName?: string;
  total: number;
  orders: string[];
  openedAt: string;
}

export default function ExpressCreateTabPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<'review' | 'create' | 'done'>('review');
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [createdTab, setCreatedTab] = useState<OpenTab | null>(null);

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

  const tableHasOpenTab = openTabs.some(
    (tab) => tab.tableNumber.toLowerCase() === tableNumber.toLowerCase()
  );

  async function handleCreateTab() {
    if (!tableNumber.trim()) {
      toast({ title: 'Error', description: 'Table number is required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    const result = await expressCreateTabAction({
      tableNumber: tableNumber.trim(),
      customerName: customerName.trim() || undefined,
    });

    if (result.success && result.data) {
      setCreatedTab(result.data.tab as unknown as OpenTab);
      setStep('done');
      toast({ title: 'Tab Created', description: `Tab ${result.data.tab.tabNumber} is now open` });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to create tab', variant: 'destructive' });
    }
    setCreating(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Express: Create Tab</h1>
          <p className="text-muted-foreground">Open a new tab for a table</p>
        </div>
      </div>

      {/* Step 1: Review existing tabs */}
      {step === 'review' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Open Tabs</CardTitle>
              <CardDescription>
                {loading
                  ? 'Loading...'
                  : `${openTabs.length} tab${openTabs.length !== 1 ? 's' : ''} currently open`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : openTabs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No open tabs</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {openTabs.map((tab) => (
                    <div
                      key={tab._id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Table {tab.tableNumber}</span>
                          {tab.customerName && (
                            <span className="text-muted-foreground ml-2">— {tab.customerName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{tab.orders.length} orders</Badge>
                        <span className="text-sm font-medium">
                          ₦{tab.total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Tab</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tableNumber">Table Number *</Label>
                <Input
                  id="tableNumber"
                  placeholder="e.g. T1, A5, VIP-2"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  autoFocus
                />
                {tableNumber && tableHasOpenTab && (
                  <p className="text-sm text-destructive">
                    Table {tableNumber} already has an open tab
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name (optional)</Label>
                <Input
                  id="customerName"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCreateTab}
                disabled={!tableNumber.trim() || tableHasOpenTab || creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Tab
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 2: Tab created — prompt to add order */}
      {step === 'done' && createdTab && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              Tab Created
            </CardTitle>
            <CardDescription>
              {createdTab.tabNumber} — Table {createdTab.tableNumber}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Would you like to add an order to this tab?
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                size="lg"
                onClick={() =>
                  router.push(
                    `/dashboard/orders/express/create-order?tabId=${createdTab._id}&tableNumber=${createdTab.tableNumber}`
                  )
                }
              >
                Yes, Add Order
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={() => router.push('/dashboard/orders')}
              >
                No, Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
