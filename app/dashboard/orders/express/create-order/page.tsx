/**
 * @requirement REQ-009 - Express Create Order flow
 * @requirement REQ-081 - Main-category to sub-category cascade for express item selection
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
import { CustomizationPickerDialog } from '@/components/features/menu/customization-picker-dialog';
import { TipInputRow } from '@/components/features/orders/tip-input-row';
import {
  CategoryCascadeFilter,
  type CategoryCascadeMainCategory,
} from '@/components/features/admin/category-cascade-filter';
import {
  summariseSelected,
  type SelectedCustomization,
} from '@/lib/customization-validation';
import type { ICustomization } from '@/interfaces/menu-item.interface';
import {
  ArrowLeft,
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
  /** Computed stock status from currentStock + minimumStock (see #98). */
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  /** Live current stock from the paired Inventory row. */
  currentStock?: number;
  portionOptions?: {
    halfPortionEnabled?: boolean;
    halfPortionSurcharge?: number;
    quarterPortionEnabled?: boolean;
    quarterPortionSurcharge?: number;
  };
  customizations?: ICustomization[];
}

interface CartItem {
  cartLineId: string; // local id so two same-menu-item lines with different customizations don't collide
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  portionSize: 'full' | 'half' | 'quarter';
  customizations?: SelectedCustomization[];
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
  const [mainCategories, setMainCategories] = useState<
    CategoryCascadeMainCategory[]
  >([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState<
    string | null
  >(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  // REQ-031: when a clicked menu item has customization groups, open the
  // picker dialog before adding to cart.
  const [pickerItem, setPickerItem] = useState<MenuItem | null>(null);

  // Checkout state
  const [destination, setDestination] = useState<'tab' | 'pay-now'>(
    preselectedTabId ? 'tab' : 'tab'
  );
  const [selectedTabId, setSelectedTabId] = useState(preselectedTabId || '');
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'transfer' | 'card'
  >('cash');
  const [paymentReference, setPaymentReference] = useState('');
  // REQ-035 — tip capture for the pay-now branch. tipPaymentMethod is
  // independent of paymentMethod so a customer can pay card and tip cash.
  const [tipAmount, setTipAmount] = useState(0);
  const [tipPaymentMethod, setTipPaymentMethod] = useState<
    'cash' | 'transfer' | 'card'
  >('cash');
  // Default tipPaymentMethod tracks paymentMethod until staff overrides
  // (overrideability is a UI-only convenience; the persisted value is
  // whatever ends in tipPaymentMethod state at submit time).
  const [tipMethodOverridden, setTipMethodOverridden] = useState(false);
  const effectiveTipMethod = tipMethodOverridden
    ? tipPaymentMethod
    : paymentMethod;
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    const [catResult, tabsResult] = await Promise.all([
      expressGetCategoriesAction(),
      expressListOpenTabsAction(),
    ]);

    if (catResult.success && catResult.data) {
      setMainCategories(catResult.data.mainCategories);
    }
    if (tabsResult.success && tabsResult.data) {
      setOpenTabs(tabsResult.data.tabs as unknown as OpenTab[]);
    }
    setLoading(false);
  }

  const searchMenu = useCallback(
    async (
      query: string,
      mainCategory: string | null,
      category: string | null
    ) => {
      if (!mainCategory || !category) {
        setMenuItems([]);
        return;
      }

      const result = await expressSearchMenuAction({
        query: query || undefined,
        mainCategory: mainCategory || undefined,
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
      searchMenu(searchQuery, selectedMainCategory, selectedCategory);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, selectedMainCategory, selectedCategory, searchMenu]);

  function customizationsKey(c?: SelectedCustomization[]): string {
    if (!c || c.length === 0) return '';
    return [...c]
      .sort((a, b) =>
        `${a.name}|${a.option}`.localeCompare(`${b.name}|${b.option}`)
      )
      .map((s) => `${s.name}:${s.option}:${s.price}`)
      .join(',');
  }

  function addCartLine(
    item: MenuItem,
    customizations?: SelectedCustomization[]
  ) {
    const key = customizationsKey(customizations);
    setCart((prev) => {
      const existing = prev.find(
        (c) =>
          c.menuItemId === item._id &&
          c.portionSize === 'full' &&
          customizationsKey(c.customizations) === key
      );
      if (existing) {
        return prev.map((c) =>
          c.cartLineId === existing.cartLineId
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [
        ...prev,
        {
          cartLineId: `${item._id}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
          portionSize: 'full' as const,
          customizations,
        },
      ];
    });
  }

  function addToCart(item: MenuItem) {
    if (item.customizations && item.customizations.length > 0) {
      // REQ-031: open picker dialog before adding so the staff selects (group, option) pairs
      setPickerItem(item);
      return;
    }
    addCartLine(item);
  }

  function updateQuantity(cartLineId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.cartLineId === cartLineId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(cartLineId: string) {
    setCart((prev) => prev.filter((c) => c.cartLineId !== cartLineId));
  }

  // REQ-031: per-line total includes Σ option.price; portionMultiplier is 1 in
  // express today (no portion picker).
  const cartTotal = cart.reduce((sum, item) => {
    const surcharge = (item.customizations ?? []).reduce(
      (s, c) => s + (typeof c.price === 'number' ? c.price : 0),
      0
    );
    return sum + (item.price + surcharge) * item.quantity;
  }, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function getCartQuantity(menuItemId: string): number {
    // Sum across lines with the same menuItemId (different customizations split into separate lines)
    return cart
      .filter((c) => c.menuItemId === menuItemId)
      .reduce((sum, c) => sum + c.quantity, 0);
  }

  const selectedMain =
    mainCategories.find((category) => category.slug === selectedMainCategory) ??
    null;
  const canBrowseItems = Boolean(selectedMainCategory && selectedCategory);

  async function handleSubmit() {
    if (cart.length === 0) return;

    setSubmitting(true);
    const result = await expressCreateOrderAction({
      // REQ-031: forward customizations per cart line. cartLineId is local UI
      // state, not part of the action contract.
      items: cart.map((c) => ({
        menuItemId: c.menuItemId,
        name: c.name,
        price: c.price,
        quantity: c.quantity,
        portionSize: c.portionSize,
        customizations: c.customizations,
      })),
      tabId: destination === 'tab' ? selectedTabId : undefined,
      tableNumber: preselectedTable || undefined,
      paymentMethod: destination === 'pay-now' ? paymentMethod : undefined,
      paymentReference:
        destination === 'pay-now' && paymentReference
          ? paymentReference
          : undefined,
      // REQ-035 — only forward tip on pay-now; tab orders don't pay yet.
      tipAmount:
        destination === 'pay-now' && tipAmount > 0 ? tipAmount : undefined,
      tipPaymentMethod:
        destination === 'pay-now' && tipAmount > 0
          ? effectiveTipMethod
          : undefined,
    });

    if (result.success) {
      toast({
        title:
          destination === 'tab' ? 'Order Added to Tab' : 'Order Created & Paid',
        description: result.message,
      });
      router.push('/dashboard/orders');
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
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
          onClick={() =>
            step === 'checkout'
              ? setStep('menu')
              : router.push('/dashboard/orders')
          }
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Express: Create Order</h1>
          <p className="text-muted-foreground">
            {step === 'menu'
              ? 'Select menu items by main category'
              : 'Complete order'}
            {preselectedTabId && ' - Adding to tab'}
          </p>
        </div>
        {step === 'menu' && cartCount > 0 && (
          <Button size="lg" onClick={() => setStep('checkout')}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Checkout ({cartCount})
            <span className="ml-2 font-bold">
              ₦{cartTotal.toLocaleString()}
            </span>
          </Button>
        )}
      </div>

      {/* Menu Selection Step */}
      {step === 'menu' && (
        <>
          <CategoryCascadeFilter
            mainCategories={mainCategories}
            selectedMainCategory={selectedMainCategory}
            selectedSubCategory={selectedCategory}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            selectedItemsSearchPlaceholder="Search selected menu items..."
            onMainCategoryChange={(mainCategory) => {
              setSelectedMainCategory(mainCategory);
              setSelectedCategory(null);
              setSearchQuery('');
              setMenuItems([]);
            }}
            onSubCategoryChange={(category) => {
              setSelectedCategory(category);
              setSearchQuery('');
              setMenuItems([]);
            }}
            emptySubCategoriesMessage={
              selectedMain
                ? `No enabled sub categories are configured under ${selectedMain.label}.`
                : undefined
            }
          />

          {/* Menu Grid */}
          {canBrowseItems ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {menuItems.map((item) => {
                  const qty = getCartQuantity(item._id);
                  const stock = item.currentStock;
                  const isOutOfStock = item.stockStatus === 'out-of-stock';
                  const isLowStock = item.stockStatus === 'low-stock';
                  return (
                    <Card
                      key={item._id}
                      aria-disabled={isOutOfStock}
                      className={`transition-all ${
                        isOutOfStock
                          ? 'opacity-60 cursor-not-allowed'
                          : `cursor-pointer ${
                              qty > 0
                                ? 'ring-2 ring-primary'
                                : 'hover:bg-accent/50'
                            }`
                      }`}
                      onClick={() => {
                        if (isOutOfStock) return;
                        addToCart(item);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.category}
                            </p>
                            <p className="font-bold mt-1">
                              ₦{item.price.toLocaleString()}
                            </p>
                            {(isOutOfStock || isLowStock) && (
                              <p
                                className={`text-xs mt-1 font-medium ${
                                  isOutOfStock
                                    ? 'text-destructive'
                                    : 'text-amber-700'
                                }`}
                              >
                                {isOutOfStock
                                  ? 'Out of Stock'
                                  : `Low Stock${typeof stock === 'number' ? ` - ${stock} left` : ''}`}
                              </p>
                            )}
                          </div>
                          {qty > 0 && (
                            <div
                              className="ml-2 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="w-6 text-center text-sm font-bold">
                                {qty}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {menuItems.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  {searchQuery
                    ? 'No matching menu items were found in this sub category.'
                    : 'No available menu items were found in this sub category.'}
                </p>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              {selectedMain
                ? 'Choose a sub category to view menu items.'
                : 'Choose a main category to start browsing menu items.'}
            </p>
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
              {cart.map((item) => {
                const surcharge = (item.customizations ?? []).reduce(
                  (s, c) => s + (typeof c.price === 'number' ? c.price : 0),
                  0
                );
                const lineTotal = (item.price + surcharge) * item.quantity;
                return (
                  <div
                    key={item.cartLineId}
                    className="flex items-start justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(item.cartLineId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-muted-foreground">
                            x{item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.cartLineId, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.cartLineId, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {item.customizations &&
                          item.customizations.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {summariseSelected(item.customizations)}
                            </p>
                          )}
                      </div>
                    </div>
                    <span className="font-medium">
                      ₦{lineTotal.toLocaleString()}
                    </span>
                  </div>
                );
              })}
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
                    <p className="text-sm text-muted-foreground">
                      No open tabs available
                    </p>
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
                            <span className="font-medium">
                              Table {tab.tableNumber}
                            </span>
                            <span className="text-sm">
                              ₦{tab.total.toLocaleString()}
                            </span>
                          </div>
                          {tab.customerName && (
                            <p className="text-sm text-muted-foreground">
                              {tab.customerName}
                            </p>
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
                      variant={
                        paymentMethod === 'transfer' ? 'default' : 'outline'
                      }
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
                  {/* REQ-035 — tip capture on the pay-now branch. */}
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

      {/* REQ-031: customization picker dialog opens when adding a menu item with groups */}
      {pickerItem && (
        <CustomizationPickerDialog
          open={!!pickerItem}
          onOpenChange={(open) => !open && setPickerItem(null)}
          itemName={pickerItem.name}
          groups={pickerItem.customizations ?? []}
          onConfirm={(selected) => {
            addCartLine(pickerItem, selected);
            setPickerItem(null);
          }}
          confirmLabel="Add to Order"
        />
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
