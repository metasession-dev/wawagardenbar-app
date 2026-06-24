/**
 * @requirement REQ-084 - Separate customer and admin checkout paths
 * @requirement REQ-CHECKOUT-001 - Multi-step checkout renders & validates per step
 * @requirement REQ-AUTHC-003 - Guest checkout (no PIN)
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { CustomerInfoStep } from './customer-info-step';
import { OrderDetailsStep } from './order-details-step';
import { PaymentMethodStep } from './payment-method-step';
import { TabOptionsStep } from './tab-options-step';
import { TipInputStep } from './tip-input-step';
import { OrderSummary } from './order-summary';
import { OrderStatusDialog } from './order-status-dialog';
import {
  createOrder,
  initializePayment,
} from '@/app/actions/payment/payment-actions';
import {
  createTabAction,
  getOpenTabForTableAction,
} from '@/app/actions/tabs/tab-actions';
import { checkUserTabRestrictionsAction } from '@/app/actions/tabs/tab-restriction-actions';
import { ArrowLeft, ArrowRight, Loader2, UserCircle2 } from 'lucide-react';
import { ITab } from '@/interfaces';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const checkoutSchema = z
  .object({
    customerName: z.string().min(2, 'Name must be at least 2 characters'),
    customerEmail: z.string().email('Invalid email address'),
    customerPhone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits'),
    orderType: z.enum(['dine-in', 'pickup', 'delivery', 'pay-now']),
    tableNumber: z.string().optional(),
    pickupTime: z.string().optional(),
    deliveryStreet: z.string().optional(),
    deliveryStreet2: z.string().optional(),
    deliveryCity: z.string().optional(),
    deliveryState: z.string().optional(),
    deliveryPostalCode: z.string().optional(),
    deliveryCountry: z.string().optional(),
    deliveryLandmark: z.string().optional(),
    deliveryInstructions: z.string().optional(),
    specialInstructions: z.string().optional(),
    useTab: z.enum(['pay-now', 'new-tab', 'existing-tab']).optional(),
    tipAmount: z.number().min(0).optional(),
    tipPaymentMethod: z.enum(['cash', 'transfer', 'card']).optional(),
    paymentMethod: z
      .enum(['CARD', 'ACCOUNT_TRANSFER', 'USSD', 'PHONE_NUMBER'], {
        required_error: 'Please select a payment method',
      })
      .optional(),
    savePhone: z.boolean().optional(),
    saveAddress: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.orderType === 'dine-in' && !data.tableNumber) return false;
      return true;
    },
    {
      message: 'Table number is required for dine-in orders',
      path: ['tableNumber'],
    }
  )
  .refine(
    (data) => {
      if (data.orderType === 'pickup' && !data.pickupTime) return false;
      return true;
    },
    {
      message: 'Pickup time is required for pickup orders',
      path: ['pickupTime'],
    }
  )
  .refine(
    (data) => {
      if (data.orderType === 'delivery' && !data.deliveryStreet) return false;
      return true;
    },
    {
      message: 'Street address is required for delivery orders',
      path: ['deliveryStreet'],
    }
  )
  .refine(
    (data) => {
      if (data.orderType === 'delivery' && !data.deliveryCity) return false;
      return true;
    },
    { message: 'City is required for delivery orders', path: ['deliveryCity'] }
  )
  .refine(
    (data) => {
      if (data.orderType === 'delivery' && !data.deliveryState) return false;
      return true;
    },
    {
      message: 'State is required for delivery orders',
      path: ['deliveryState'],
    }
  )
  .refine(
    (data) => {
      if (data.orderType === 'delivery' && !data.deliveryCountry) return false;
      return true;
    },
    {
      message: 'Country is required for delivery orders',
      path: ['deliveryCountry'],
    }
  )
  .refine(
    (data) => {
      if ((data.tipAmount ?? 0) > 0 && !data.tipPaymentMethod) return false;
      return true;
    },
    {
      message: 'Please select how the tip will be paid',
      path: ['tipPaymentMethod'],
    }
  );

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const baseSteps = [
  { id: 1, name: 'Customer Info', description: 'Your contact details' },
  { id: 2, name: 'Order Details', description: 'Delivery or pickup info' },
  { id: 3, name: 'Payment Options', description: 'Tab or pay now' },
  { id: 4, name: 'Tip', description: 'Add a tip (optional)' },
  { id: 5, name: 'Payment', description: 'Choose payment method' },
];

export function CustomerCheckoutForm() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    items,
    getTotalPrice,
    clearCart,
    tableNumber: storeTableNumber,
  } = useCartStore();
  const { user, isAuthenticated, isLoading: isLoadingUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [existingTab, setExistingTab] = useState<ITab | null>(null);
  const [isTableLocked, setIsTableLocked] = useState(false);
  const [isTabOccupied, setIsTabOccupied] = useState(false);
  const [steps, setSteps] = useState(baseSteps);
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [orderStatus, setOrderStatus] = useState<{
    status: 'success' | 'error';
    title: string;
    message: string;
    redirectUrl?: string;
    redirectLabel?: string;
  } | null>(null);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      orderType: 'dine-in',
      tableNumber: '',
      pickupTime: '',
      deliveryStreet: '',
      deliveryStreet2: '',
      deliveryCity: '',
      deliveryState: '',
      deliveryPostalCode: '',
      deliveryCountry: '',
      deliveryLandmark: '',
      deliveryInstructions: '',
      specialInstructions: '',
      useTab: 'pay-now',
      tipAmount: 0,
      savePhone: true,
      saveAddress: true,
    },
  });

  const orderType = form.watch('orderType');
  const useTab = form.watch('useTab');
  const tableNumber = form.watch('tableNumber');

  useEffect(() => {
    if (isAuthenticated && user) {
      const hasData = user.name || user.phone || user.email;
      if (hasData) {
        setIsPreFilled(true);
        if (user.name) form.setValue('customerName', user.name);
        if (user.email) form.setValue('customerEmail', user.email);
        if (user.phone) form.setValue('customerPhone', user.phone);
      }
    }
  }, [isAuthenticated, user, form]);

  useEffect(() => {
    if (storeTableNumber) {
      form.setValue('orderType', 'dine-in');
      form.setValue('tableNumber', storeTableNumber);
      setIsTableLocked(false);
    }
  }, [storeTableNumber, form]);

  useEffect(() => {
    async function fetchExistingTab() {
      if (orderType === 'dine-in') {
        const restrictions = await checkUserTabRestrictionsAction();
        if (restrictions.isRestricted && restrictions.existingTab) {
          setExistingTab(restrictions.existingTab);
          form.setValue('tableNumber', restrictions.existingTab.tableNumber);
          form.setValue('useTab', 'existing-tab');
          setIsTableLocked(true);
        } else {
          setIsTableLocked(false);
          setExistingTab(null);
        }
      }
    }
    fetchExistingTab();
  }, [orderType, storeTableNumber, form]);

  useEffect(() => {
    if (isTableLocked || !tableNumber) return;
    setIsTabOccupied(false);
    const timer = setTimeout(async () => {
      if (tableNumber.length < 1) return;
      try {
        const result = await getOpenTabForTableAction(tableNumber);
        if (result.success && result.data?.tab) {
          const tab = result.data.tab;
          const isMyTab = tab.userId
            ? user?.id && tab.userId.toString() === user.id
            : true;
          if (isMyTab) {
            setExistingTab(tab);
            form.setValue('useTab', 'existing-tab');
            setIsTabOccupied(false);
          } else {
            setExistingTab(null);
            form.setValue('useTab', 'new-tab');
            setIsTabOccupied(true);
          }
        } else {
          setExistingTab(null);
          form.setValue('useTab', 'new-tab');
          setIsTabOccupied(false);
        }
      } catch (error) {
        console.error('Error checking table:', error);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [tableNumber, isTableLocked, form, user]);

  useEffect(() => {
    if (orderType === 'dine-in') {
      if (useTab === 'new-tab' || useTab === 'existing-tab') {
        setSteps([baseSteps[0], baseSteps[1], baseSteps[2]]);
      } else {
        setSteps(baseSteps);
      }
    } else {
      setSteps([baseSteps[0], baseSteps[1], baseSteps[3], baseSteps[4]]);
    }
  }, [orderType, useTab]);

  useEffect(() => {
    if (orderStatus?.status === 'success') return;
    if (items.length === 0) router.push('/menu');
  }, [items.length, router, orderStatus]);

  useEffect(() => {
    const key = `checkout-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    setIdempotencyKey(key);
  }, []);

  useEffect(() => {
    return () => {
      setHasSubmitted(false);
      setIsSubmitting(false);
    };
  }, []);

  if (items.length === 0) return null;

  async function onSubmit(data: CheckoutFormData) {
    if (isNavigating) return;
    if (isSubmitting || hasSubmitted) return;
    setIsSubmitting(true);
    setHasSubmitted(true);

    try {
      let tabId: string | undefined;
      if (data.orderType === 'dine-in' && data.useTab !== 'pay-now') {
        if (data.useTab === 'new-tab') {
          const tabResult = await createTabAction({
            tableNumber: data.tableNumber || '',
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
          });
          if (!tabResult.success || !tabResult.data) {
            setOrderStatus({
              status: 'error',
              title: 'Tab Creation Failed',
              message:
                tabResult.error || 'Failed to create tab. Please try again.',
            });
            setShowStatusDialog(true);
            setIsSubmitting(false);
            setHasSubmitted(false);
            return;
          }
          tabId = tabResult.data.tab._id.toString();
        } else if (data.useTab === 'existing-tab' && existingTab) {
          tabId = existingTab._id.toString();
        }
      }

      const orderResult = await createOrder({
        orderType: data.orderType,
        items,
        customerInfo: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        },
        deliveryInfo:
          data.orderType === 'delivery'
            ? {
                street: data.deliveryStreet || '',
                street2: data.deliveryStreet2,
                city: data.deliveryCity || '',
                state: data.deliveryState || '',
                postalCode: data.deliveryPostalCode || '',
                country: data.deliveryCountry || '',
                landmark: data.deliveryLandmark,
                instructions: data.deliveryInstructions,
              }
            : undefined,
        pickupTime: data.pickupTime,
        tableNumber: data.tableNumber,
        specialInstructions: data.specialInstructions,
        tabId,
        tipAmount: data.tipAmount || 0,
        tipPaymentMethod: data.tipPaymentMethod,
        savePhone: data.savePhone,
        saveAddress: data.saveAddress,
        idempotencyKey,
      });

      if (!orderResult.success || !orderResult.data) {
        setOrderStatus({
          status: 'error',
          title: 'Order Failed',
          message:
            orderResult.message || 'Failed to create order. Please try again.',
        });
        setShowStatusDialog(true);
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }

      const { orderId } = orderResult.data;

      if (tabId) {
        setOrderStatus({
          status: 'success',
          title: 'Order Added to Tab!',
          message:
            'Your order has been successfully added to your tab. You can add more orders or pay when ready.',
          redirectUrl: `/orders/tabs/${tabId}`,
          redirectLabel: 'View Tab',
        });
        setShowStatusDialog(true);
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }

      if (!data.paymentMethod) {
        setOrderStatus({
          status: 'error',
          title: 'Payment Method Required',
          message: 'Please select a payment method to continue.',
        });
        setShowStatusDialog(true);
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }

      const paymentResult = await initializePayment({
        orderId,
        amount: getTotalPrice() + (data.tipAmount || 0),
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        paymentMethods: [data.paymentMethod],
      });

      if (!paymentResult.success || !paymentResult.data) {
        setOrderStatus({
          status: 'error',
          title: 'Payment Initialization Failed',
          message:
            paymentResult.message ||
            'Failed to initialize payment. Please try again.',
        });
        setShowStatusDialog(true);
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }

      const { checkoutUrl } = paymentResult.data;

      if (isAuthenticated && (data.savePhone || data.saveAddress)) {
        toast({
          title: 'Profile Updated',
          description: 'Your information has been saved for future orders.',
        });
      }

      clearCart();
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 500);
    } catch (error) {
      console.error('Checkout error:', error);
      setOrderStatus({
        status: 'error',
        title: 'Unexpected Error',
        message:
          'An unexpected error occurred while processing your order. Please try again.',
      });
      setShowStatusDialog(true);
      setIsSubmitting(false);
      setHasSubmitted(false);
    }
  }

  async function handleNext() {
    if (isNavigating) return;
    setIsNavigating(true);

    let fieldsToValidate: (keyof CheckoutFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['customerName', 'customerEmail', 'customerPhone'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['orderType'];
      const currentOrderType = form.getValues('orderType');
      if (currentOrderType === 'delivery') {
        fieldsToValidate.push(
          'deliveryStreet',
          'deliveryCity',
          'deliveryState',
          'deliveryCountry'
        );
      } else if (currentOrderType === 'pickup') {
        fieldsToValidate.push('pickupTime');
      } else if (currentOrderType === 'dine-in') {
        fieldsToValidate.push('tableNumber');
        if (isTabOccupied) {
          setIsNavigating(false);
          return;
        }
      }
    } else if (currentStep === 3 && orderType === 'dine-in') {
      fieldsToValidate = ['useTab'];
    } else if (currentStep === 4) {
      fieldsToValidate = [];
    } else if (
      currentStep === 5 ||
      (currentStep === 4 && orderType !== 'dine-in')
    ) {
      if (useTab === 'pay-now' || orderType !== 'dine-in') {
        fieldsToValidate = ['paymentMethod'];
      }
    }

    const isValid =
      fieldsToValidate.length === 0 || (await form.trigger(fieldsToValidate));

    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      setTimeout(() => setIsNavigating(false), 300);
    } else {
      setIsNavigating(false);
    }
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Guest Banner */}
      {!isAuthenticated && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <UserCircle2 className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Continuing as Guest
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              You can order without signing in.{' '}
              <Link href="/login" className="underline font-medium">
                Sign in
              </Link>{' '}
              to save your details and track orders.
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border-2 text-sm md:text-base ${
                    currentStep >= step.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground text-muted-foreground'
                  }`}
                >
                  {step.id}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs md:text-sm font-medium truncate max-w-[80px] md:max-w-none">
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden md:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 md:mx-4 h-0.5 flex-1 min-w-[20px] ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              if (isNavigating) return;
              if (currentStep < steps.length) {
                handleNext();
              } else {
                if (!isNavigating) form.handleSubmit(onSubmit)();
              }
            }
          }}
        >
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{steps[currentStep - 1].name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentStep === 1 && isLoadingUser ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (
                    currentStep === 1 && (
                      <CustomerInfoStep form={form} isPreFilled={isPreFilled} />
                    )
                  )}
                  {currentStep === 2 && (
                    <OrderDetailsStep
                      form={form}
                      isTableLocked={isTableLocked}
                      existingTab={existingTab}
                      isTabOccupied={isTabOccupied}
                    />
                  )}
                  {currentStep === 3 && orderType === 'dine-in' && (
                    <TabOptionsStep
                      form={form}
                      existingTab={existingTab}
                      tableNumber={tableNumber || ''}
                    />
                  )}
                  {currentStep === 4 && orderType === 'dine-in' && (
                    <TipInputStep form={form} subtotal={getTotalPrice()} />
                  )}
                  {currentStep === 5 &&
                    orderType === 'dine-in' &&
                    useTab === 'pay-now' && <PaymentMethodStep form={form} />}
                  {currentStep === 3 && orderType !== 'dine-in' && (
                    <TipInputStep form={form} subtotal={getTotalPrice()} />
                  )}
                  {currentStep === 4 && orderType !== 'dine-in' && (
                    <PaymentMethodStep form={form} />
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 1 || isSubmitting}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>

                    {currentStep < steps.length ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={isTabOccupied}
                      >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isSubmitting
                          ? 'Processing...'
                          : orderType === 'dine-in' && useTab !== 'pay-now'
                            ? 'Add to Tab'
                            : 'Proceed to Payment'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <OrderSummary
                orderType={form.watch('orderType')}
                tipAmount={form.watch('tipAmount')}
                tipPaymentMethod={form.watch('tipPaymentMethod')}
              />
            </div>
          </div>
        </form>
      </Form>

      {/* Order Status Dialog */}
      {orderStatus && (
        <OrderStatusDialog
          open={showStatusDialog}
          onOpenChange={(open) => {
            setShowStatusDialog(open);
            if (!open) {
              if (orderStatus?.status === 'success') {
                clearCart();
                router.push('/menu');
              }
              setOrderStatus(null);
            }
          }}
          status={orderStatus.status}
          title={orderStatus.title}
          message={orderStatus.message}
          redirectUrl={orderStatus.redirectUrl}
          redirectLabel={orderStatus.redirectLabel}
        />
      )}
    </div>
  );
}
