/**
 * @requirement REQ-084 - Separate customer and admin checkout paths
 * @requirement REQ-CHECKOUT-001 - Multi-step checkout renders & validates per step
 * @requirement REQ-AUTHC-001 - Checkout requires the WhatsApp PIN sign-in (REQ-117)
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import { requiredError } from '@/lib/validation/zod-errors';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { CustomerInfoStep } from './customer-info-step';
import { OrderDetailsStep } from './order-details-step';
import { PaymentMethodStep } from './payment-method-step';
import { TipInputStep } from './tip-input-step';
import { OrderSummary } from './order-summary';
import { OrderStatusDialog } from './order-status-dialog';
import {
  createOrder,
  initializePayment,
} from '@/app/actions/payment/payment-actions';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

const checkoutSchema = z
  .object({
    customerName: z.string().min(2, 'Name must be at least 2 characters'),
    customerEmail: z.string().email('Invalid email address'),
    customerPhone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits'),
    orderType: z.enum(['dine-in', 'pickup', 'delivery']),
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
    tipAmount: z.number().min(0).optional(),
    tipPaymentMethod: z.enum(['cash', 'transfer', 'card']).optional(),
    paymentMethod: z
      .enum(['CARD', 'ACCOUNT_TRANSFER', 'USSD', 'PHONE_NUMBER'], {
        error: requiredError('Please select a payment method'),
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

// REQ-120 — customers always pay at checkout; there is no tab step.
const steps = [
  { id: 1, name: 'Customer Info', description: 'Your contact details' },
  { id: 2, name: 'Order Details', description: 'Delivery or pickup info' },
  { id: 3, name: 'Tip', description: 'Add a tip (optional)' },
  { id: 4, name: 'Payment', description: 'Choose payment method' },
];

export function CustomerCheckoutForm() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    items,
    getTotalPrice,
    clearCart,
    tableNumber: storeTableNumber,
    hydrated: cartHydrated,
  } = useCartStore();
  const { user, isAuthenticated, isLoading: isLoadingUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
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
      tipAmount: 0,
      savePhone: true,
      saveAddress: true,
    },
  });

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
    }
  }, [storeTableNumber, form]);

  useEffect(() => {
    if (orderStatus?.status === 'success') return;
    if (cartHydrated && items.length === 0) router.push('/menu');
  }, [cartHydrated, items.length, router, orderStatus]);

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
      }
    } else if (currentStep === 3) {
      fieldsToValidate = [];
    } else if (currentStep === 4) {
      fieldsToValidate = ['paymentMethod'];
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
                  {currentStep === 2 && <OrderDetailsStep form={form} />}
                  {currentStep === 3 && (
                    <TipInputStep form={form} subtotal={getTotalPrice()} />
                  )}
                  {currentStep === 4 && <PaymentMethodStep form={form} />}

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
                      <Button type="button" onClick={handleNext}>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
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
