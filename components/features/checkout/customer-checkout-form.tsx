/**
 * @requirement REQ-084 - Separate customer and admin checkout paths
 * @requirement REQ-121 - One-page customer checkout
 * @requirement REQ-CHECKOUT-001 - Checkout form renders and validates (one page)
 * @requirement REQ-CHECKOUT-014 - One page, single Pay, no stepper or info/tab/payment-method step
 * @requirement REQ-CHECKOUT-015 - Name asked once only if missing; no email
 * @requirement REQ-CHECKOUT-016 - Minimal fields per order type; saved address
 * @requirement REQ-CHECKOUT-017 - Order type and table preselected from the link
 * @requirement REQ-CHECKOUT-018 - Inline typed errors; closed hours block Pay
 * @requirement REQ-AUTHC-001 - Checkout requires the WhatsApp PIN sign-in (REQ-117)
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderTypeFields } from './order-type-fields';
import { InlineTip } from './inline-tip';
import { OrderSummary } from './order-summary';
import { BusinessHoursBanner } from './business-hours-banner';
import {
  createOrder,
  initializePayment,
} from '@/app/actions/payment/payment-actions';
import {
  getOrderingOptionsAction,
  type OrderingOptions,
} from '@/app/actions/ordering/ordering-options-actions';
import { cancelSupersededOrderAction } from '@/app/actions/order/order-actions';
import {
  cartFingerprint,
  clearCheckoutAttempt,
  resolveCheckoutAttempt,
  writeCheckoutAttempt,
} from '@/lib/checkout-attempt';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import type { PaymentMethod } from '@/interfaces/payment';
import {
  buildCheckoutSchema,
  buildDeliveryInfo,
  isPayBlockedByHours,
  mapCheckoutError,
  pickDefaultAddress,
  resolveInitialOrderType,
  type CheckoutFormValues,
  type CheckoutOrderType,
  type SavedAddressLike,
} from '@/lib/checkout/checkout-rules';

/** Every method is offered; the provider's hosted page lets the customer choose. */
const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'CARD',
  'ACCOUNT_TRANSFER',
  'USSD',
  'PHONE_NUMBER',
];

const LAST_ORDER_TYPE_KEY = 'wgb:last-order-type';

function readLastOrderType(): string | null {
  try {
    return window.localStorage.getItem(LAST_ORDER_TYPE_KEY);
  } catch {
    return null;
  }
}

function writeLastOrderType(type: string): void {
  try {
    window.localStorage.setItem(LAST_ORDER_TYPE_KEY, type);
  } catch {
    // Private mode or blocked storage: the preselect is a convenience only.
  }
}

export function CustomerCheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    items,
    getTotalPrice,
    clearCart,
    tableNumber: storeTableNumber,
    hydrated: cartHydrated,
  } = useCartStore();
  const { user, isAuthenticated, isLoading: isLoadingUser } = useAuth();

  const [options, setOptions] = useState<OrderingOptions | null>(null);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const preselected = useRef(false);

  // REQ-CHECKOUT-015: the name is asked once, and only when the account has
  // none. Wait for the profile to load first (it arrives in its own request),
  // and use `hasName`: `name` falls back to the email prefix.
  const needsName =
    isAuthenticated &&
    !isLoadingUser &&
    Boolean(user) &&
    user?.hasName === false;
  const schema = useMemo(() => buildCheckoutSchema({ needsName }), [needsName]);
  const savedAddress = useMemo(
    () =>
      pickDefaultAddress<SavedAddressLike>(
        (user?.addresses ?? []) as SavedAddressLike[]
      ),
    [user?.addresses]
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      orderType: 'dine-in',
      tableNumber: '',
      pickupMode: 'asap',
      pickupTime: '',
      deliveryStreet: '',
      deliveryLandmark: '',
      deliveryInstructions: '',
      specialInstructions: '',
      tipAmount: 0,
    },
  });
  const orderType = form.watch('orderType') as CheckoutOrderType;
  const tipAmount = form.watch('tipAmount') ?? 0;

  useEffect(() => {
    let cancelled = false;
    getOrderingOptionsAction()
      .then((res) => {
        if (!cancelled && res.success && res.data) setOptions(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setOptionsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // REQ-CHECKOUT-017: preselect the order type and table once the options are known.
  useEffect(() => {
    if (!optionsLoaded || preselected.current) return;
    preselected.current = true;
    const tableParam = searchParams.get('table')?.trim() || '';
    const table = tableParam || storeTableNumber || '';
    const type = resolveInitialOrderType({
      typeParam: searchParams.get('type'),
      hasTable: Boolean(table),
      lastUsed: readLastOrderType(),
      enabledTypes: options?.orderTypes ?? null,
    });
    form.setValue('orderType', type);
    if (table) form.setValue('tableNumber', table);
  }, [optionsLoaded, options, searchParams, storeTableNumber, form]);

  // A table scanned after the page loaded still fills the field.
  useEffect(() => {
    if (storeTableNumber && !form.getValues('tableNumber')) {
      form.setValue('tableNumber', storeTableNumber);
    }
  }, [storeTableNumber, form]);

  // REQ-CHECKOUT-016: the saved address is preselected for delivery.
  useEffect(() => {
    if (orderType === 'delivery' && savedAddress && useSavedAddress) {
      form.setValue('deliveryStreet', savedAddress.streetAddress);
    }
  }, [orderType, savedAddress, useSavedAddress, form]);

  useEffect(() => {
    if (isSubmitting || hasSubmitted) return;
    if (cartHydrated && items.length === 0) router.push('/menu');
  }, [cartHydrated, items.length, router, isSubmitting, hasSubmitted]);

  const handleTipChange = useCallback(
    (amount: number) => form.setValue('tipAmount', amount),
    [form]
  );

  if (items.length === 0) return null;

  const closedBlocksPay = isPayBlockedByHours(
    orderType,
    options ? options.isOpenNow : null
  );
  const payDisabled =
    isSubmitting || hasSubmitted || isLoadingUser || closedBlocksPay;

  async function onSubmit(data: CheckoutFormValues) {
    if (isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);
    setHasSubmitted(true);
    setRootError(null);

    const fail = (message: string) => {
      setRootError(message);
      setIsSubmitting(false);
      setHasSubmitted(false);
    };

    try {
      // REQ-127 — the idempotency key follows the cart. The same cart (after a
      // failed payment start, a reload, or a return from the menu) reuses the
      // key, so the server returns the same Pending order; a changed cart gets a
      // new key and its earlier unpaid order is cancelled.
      const deliveryInfo =
        data.orderType === 'delivery'
          ? buildDeliveryInfo({
              street: data.deliveryStreet ?? '',
              landmark: data.deliveryLandmark,
              instructions: data.deliveryInstructions,
              saved: savedAddress,
            })
          : undefined;
      const fingerprint = cartFingerprint({
        orderType: data.orderType,
        items,
        tableNumber:
          data.orderType === 'dine-in' ? data.tableNumber?.trim() : undefined,
        pickupTime:
          data.orderType === 'pickup' && data.pickupMode === 'later'
            ? data.pickupTime
            : undefined,
        delivery: deliveryInfo ? JSON.stringify(deliveryInfo) : undefined,
        specialInstructions: data.specialInstructions,
        tipAmount: data.tipAmount || 0,
      });
      const attempt = resolveCheckoutAttempt(fingerprint);
      if (attempt.supersededOrderId) {
        // Best effort: the 30-minute unpaid-order expiry is the backstop.
        await cancelSupersededOrderAction(attempt.supersededOrderId).catch(
          () => undefined
        );
      }
      const idempotencyKey = attempt.key;
      writeCheckoutAttempt({
        key: idempotencyKey,
        fingerprint,
        orderId: null,
        createdAt: Date.now(),
      });

      const orderResult = await createOrder({
        orderType: data.orderType,
        items,
        customerInfo: needsName ? { name: data.firstName?.trim() } : undefined,
        deliveryInfo,
        pickupTime:
          data.orderType === 'pickup' && data.pickupMode === 'later'
            ? data.pickupTime
            : undefined,
        tableNumber:
          data.orderType === 'dine-in' ? data.tableNumber?.trim() : undefined,
        specialInstructions: data.specialInstructions?.trim() || undefined,
        tipAmount: data.tipAmount || 0,
        idempotencyKey,
      });

      if (!orderResult.success || !orderResult.data) {
        // REQ-CHECKOUT-018: a typed error shows next to its field, or inline above Pay.
        const mapped = mapCheckoutError(orderResult.code, orderResult.message);
        if (mapped.field === 'root') {
          fail(mapped.message);
        } else {
          form.setError(mapped.field, {
            type: 'server',
            message: mapped.message,
          });
          setIsSubmitting(false);
          setHasSubmitted(false);
        }
        return;
      }

      writeCheckoutAttempt({
        key: idempotencyKey,
        fingerprint,
        orderId: orderResult.data.orderId,
        createdAt: Date.now(),
      });

      const paymentResult = await initializePayment({
        orderId: orderResult.data.orderId,
        amount: getTotalPrice() + (data.tipAmount || 0),
        customerName: data.firstName?.trim() || user?.name,
        paymentMethods: ALL_PAYMENT_METHODS,
      });

      if (!paymentResult.success || !paymentResult.data) {
        fail(
          paymentResult.message ||
            'Failed to start the payment. Please try again.'
        );
        return;
      }

      writeLastOrderType(data.orderType);
      const { checkoutUrl } = paymentResult.data;
      clearCheckoutAttempt();
      clearCart();
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 500);
    } catch (error) {
      console.error('Checkout error:', error);
      fail('Something went wrong while placing your order. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-28 lg:pb-0">
      <BusinessHoursBanner />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Checkout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingUser && <Skeleton className="h-10 w-full" />}

                  {needsName && (
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="given-name"
                              placeholder="Your first name"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <OrderTypeFields
                    form={form}
                    enabledTypes={options?.orderTypes ?? null}
                    pickupSlots={options?.pickupSlots ?? []}
                    savedAddress={savedAddress}
                    useSavedAddress={useSavedAddress}
                    onUseSavedAddressChange={setUseSavedAddress}
                  />

                  <InlineTip
                    subtotal={getTotalPrice()}
                    onChange={handleTipChange}
                  />

                  {showNote ? (
                    <FormField
                      control={form.control}
                      name="specialInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note for the kitchen</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={2}
                              placeholder="Allergies, dietary requirements, other requests"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNote(true)}
                    >
                      Add a note
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <OrderSummary orderType={orderType} tipAmount={tipAmount} />

              <div className="fixed inset-x-0 bottom-0 z-20 space-y-3 border-t bg-background p-4 lg:static lg:border-0 lg:bg-transparent lg:p-0">
                {rootError && (
                  <Alert variant="destructive" data-testid="checkout-error">
                    <AlertDescription>{rootError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={payDisabled}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? 'Processing...' : 'Pay'}
                </Button>
                {closedBlocksPay && (
                  <p className="text-center text-xs text-muted-foreground">
                    We are closed right now, so pickup and delivery orders
                    cannot be paid.
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
