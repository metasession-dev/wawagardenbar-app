/**
 * @requirement REQ-009 - Express Create Order flow
 */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  expressSearchMenuAction,
  expressGetCategoriesAction,
  expressCreateOrderAction,
  expressListOpenTabsAction,
} from '@/app/actions/admin/express-actions';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Loader2,
  X,
  CreditCard,
  Banknote,
  Building2,
  Receipt,
} from 'lucide-react';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  mainCategory: string;
  description: string;
  isAvailable: boolean;
  portionOptions?: {
    halfPortionEnabled?: boolean;
    halfPortionSurcharge?: number;
    quarterPortionEnabled?: boolean;
    quarterPortionSurcharge?: number;
  };
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  portionSize: 'full' | 'half' | 'quarter';
}

interface OpenTab {
  _id: string;
  tabNumber: string;
  tableNumber: string;
  customerName?: string;
  total: number;
}

function ExpressCreateOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const preselectedTabId = searchParams.get('tabId');
  const preselectedTable = searchParams.get('tableNumber');

  const [step, setStep] = useState<'menu' | 'checkout'>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout state
  const [destination, setDestination] = useState<'tab' | 'pay-now'>(preselectedTabId ? 'tab' : 'tab');
  const [selectedTabId, setSelectedTabId] = useState(preselectedTabId || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    const [menuResult, catResult, tabsResult] = await Promise.all([
      expressSearchMenuAction({}),
      expressGetCategoriesAction(),
      expressListOpenTabsAction(),
    ]);

    if (menuResult.success && menuResult.data) {
      setMenuItems(menuResult.data.items as unknown as MenuItem[]);
    }
    if (catResult.success && catResult.data) {
      setCategories(catResult.data.categories);
    }
    if (tabsResult.success && tabsResult.data) {
      setOpenTabs(tabsResult.data.tabs as unknown as OpenTab[]);
    }
    setLoading(false);
  }

  const searchMenu = useCallback(
    async (query: string, category: string | null) => {
      const result = await expressSearchMenuAction({
        query: query || undefined,
        category: category || undefined,
      });
      if (result.success && result.data) {
        setMenuItems(result.data.items as unknown as MenuItem[]);
      }
    },
    []
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchMenu(searchQuery, selectedCategory);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, selectedCategory, searchMenu]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id && c.portionSize === 'full');
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id && c.portionSize === 'full'
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1, portionSize: 'full' as const }];
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(menuItemId: string) {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function getCartQuantity(menuItemId: string): number {
    return cart.find((c) => c.menuItemId === menuItemId)?.quantity || 0;
  }

  async function handleSubmit() {
    if (cart.length === 0) return;

    setSubmitting(true);
    const result = await expressCreateOrderAction({
      items: cart,
      tabId: destination === 'tab' ? selectedTabId : undefined,
      tableNumber: preselectedTable || undefined,
      paymentMethod: destination === 'pay-now' ? paymentMethod : undefined,
      paymentReference: destination === 'pay-now' && paymentReference ? paymentReference : undefined,
    });

    if (result.success) {
      toast({
        title: destination === 'tab' ? 'Order Added to Tab' : 'Order Created & Paid',
        description: result.message,
      });
      router.push('/dashboard/orders');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (step === 'checkout' ? setStep('menu') : router.push('/dashboard/orders'))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Express: Create Order</h1>
          <p className="text-muted-foreground">
            {step === 'menu' ? 'Select menu items' : 'Complete order'}
            {preselectedTabId && ` — Adding to tab`}
          </p>
        </div>
        {step === 'menu' && cartCount > 0 && (
          <Button size="lg" onClick={() => setStep('checkout')}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Checkout ({cartCount})
            <span className="ml-2 font-bold">₦{cartTotal.toLocaleString()}</span>
          </Button>
        )}
      </div>

      {/* Menu Selection Step */}
      {step === 'menu' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => {
              const qty = getCartQuantity(item._id);
              return (
                <Card
                  key={item._id}
                  className={`cursor-pointer transition-all ${qty > 0 ? 'ring-2 ring-primary' : 'hover:bg-accent/50'}`}
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                        <p className="font-bold mt-1">₦{item.price.toLocaleString()}</p>
                      </div>
                      {qty > 0 && (
                        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item._id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-bold text-sm">{qty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item._id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {menuItems.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No menu items found</p>
          )}
        </>
      )}

      {/* Checkout Step */}
      {step === 'checkout' && (
        <div className="space-y-6">
          {/* Cart Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFromCart(item.menuItemId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">x{item.quantity}</span>
                  </div>
                  <span className="font-medium">₦{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₦{cartTotal.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Destination */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Destination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={destination === 'tab' ? 'default' : 'outline'}
                  className="h-16 flex-col gap-1"
                  onClick={() => setDestination('tab')}
                >
                  <Receipt className="h-5 w-5" />
                  Add to Tab
                </Button>
                <Button
                  variant={destination === 'pay-now' ? 'default' : 'outline'}
                  className="h-16 flex-col gap-1"
                  onClick={() => setDestination('pay-now')}
                >
                  <CreditCard className="h-5 w-5" />
                  Pay Now
                </Button>
              </div>

              {destination === 'tab' && (
                <div className="space-y-2">
                  <Label>Select Tab</Label>
                  {openTabs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No open tabs available</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {openTabs.map((tab) => (
                        <div
                          key={tab._id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedTabId === tab._id
                              ? 'ring-2 ring-primary bg-primary/5'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => setSelectedTabId(tab._id)}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">Table {tab.tableNumber}</span>
                            <span className="text-sm">₦{tab.total.toLocaleString()}</span>
                          </div>
                          {tab.customerName && (
                            <p className="text-sm text-muted-foreground">{tab.customerName}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {destination === 'pay-now' && (
                <div className="space-y-4">
                  <Label>Payment Method</Label>
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={
              submitting ||
              cart.length === 0 ||
              (destination === 'tab' && !selectedTabId)
            }
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : destination === 'tab' ? (
              <Receipt className="h-4 w-4 mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {destination === 'tab'
              ? 'Add Order to Tab'
              : `Pay ₦${cartTotal.toLocaleString()}`}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ExpressCreateOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ExpressCreateOrderContent />
    </Suspense>
  );
}
