'use client';

import { useState, useEffect, useRef } from 'react';
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
import { AdminCheckoutIndicator } from './admin-checkout-indicator';
import { createOrder, initializePayment } from '@/app/actions/payment/payment-actions';
import { completeOrderPaymentManuallyAction } from '@/app/actions/admin/order-payment-actions';
import { createTabAction, getOpenTabForTableAction } from '@/app/actions/tabs/tab-actions';
import { checkUserTabRestrictionsAction } from '@/app/actions/tabs/tab-restriction-actions';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { ITab } from '@/interfaces';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

const checkoutSchema = z.object({
  // Customer Info
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  
  // Order Details (conditional based on order type)
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
  
  // Tab options (for dine-in only)
  useTab: z.enum(['pay-now', 'new-tab', 'existing-tab']).optional(),
  
  // Tip
  tipAmount: z.number().min(0).optional(),
  
  // Payment
  paymentMethod: z.enum(['CARD', 'ACCOUNT_TRANSFER', 'USSD', 'PHONE_NUMBER'], {
    required_error: 'Please select a payment method',
  }).optional(),
  
  // Save preferences
  savePhone: z.boolean().optional(),
  saveAddress: z.boolean().optional(),
}).refine((data) => {
  // Table number is required for dine-in orders
  if (data.orderType === 'dine-in' && !data.tableNumber) {
    return false;
  }
  return true;
}, {
  message: 'Table number is required for dine-in orders',
  path: ['tableNumber'],
}).refine((data) => {
  // Pickup time is required for pickup orders
  if (data.orderType === 'pickup' && !data.pickupTime) {
    return false;
  }
  return true;
}, {
  message: 'Pickup time is required for pickup orders',
  path: ['pickupTime'],
}).refine((data) => {
  // Delivery street is required for delivery orders
  if (data.orderType === 'delivery' && !data.deliveryStreet) {
    return false;
  }
  return true;
}, {
  message: 'Street address is required for delivery orders',
  path: ['deliveryStreet'],
}).refine((data) => {
  // Delivery city is required for delivery orders
  if (data.orderType === 'delivery' && !data.deliveryCity) {
    return false;
  }
  return true;
}, {
  message: 'City is required for delivery orders',
  path: ['deliveryCity'],
}).refine((data) => {
  // Delivery state is required for delivery orders
  if (data.orderType === 'delivery' && !data.deliveryState) {
    return false;
  }
  return true;
}, {
  message: 'State is required for delivery orders',
  path: ['deliveryState'],
}).refine((data) => {
  // Delivery country is required for delivery orders
  if (data.orderType === 'delivery' && !data.deliveryCountry) {
    return false;
  }
  return true;
}, {
  message: 'Country is required for delivery orders',
  path: ['deliveryCountry'],
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const baseSteps = [
  { id: 1, name: 'Customer Info', description: 'Your contact details' },
  { id: 2, name: 'Order Details', description: 'Delivery or pickup info' },
  { id: 3, name: 'Payment Options', description: 'Tab or pay now' },
  { id: 4, name: 'Tip', description: 'Add a tip (optional)' },
  { id: 5, name: 'Payment', description: 'Choose payment method' },
];

export function CheckoutForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { items, getTotalPrice, clearCart, tableNumber: storeTableNumber } = useCartStore();
  const { user, isAuthenticated, role, isLoading: isLoadingUser } = useAuth();
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
  const [adminPaymentData, setAdminPaymentData] = useState<{
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
  } | null>(null);
  const [useAdminFullCheckout, setUseAdminFullCheckout] = useState(false);
  
  // Use ref to avoid race condition with state updates
  const adminPaymentDataRef = useRef<{
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
  } | null>(null);

  const isAdmin = role === 'csr' || role === 'admin' || role === 'super-admin';

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

  // Pre-populate form with user data
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

  // Initialize order type and table number from store
  useEffect(() => {
    if (storeTableNumber) {
      form.setValue('orderType', 'dine-in');
      form.setValue('tableNumber', storeTableNumber);
      // We don't lock the table here, allowing admin/staff to change it if needed
      setIsTableLocked(false);
    }
  }, [storeTableNumber, form]);

  // Fetch existing tab for user when dine-in is selected (Initial load)
  useEffect(() => {
    async function fetchExistingTab() {
      if (orderType === 'dine-in') {
        // Admins are never restricted
        if (isAdmin) {
          setIsTableLocked(false);
          setExistingTab(null);
          
          // If admin has a table number from store, check for existing tab at that table
          if (storeTableNumber) {
            const result = await getOpenTabForTableAction(storeTableNumber);
            if (result.success && result.data?.tab) {
              setExistingTab(result.data.tab);
              form.setValue('tableNumber', storeTableNumber);
              form.setValue('useTab', 'existing-tab');
            }
          }
          return;
        }

        // Customers: Check restrictions using server action
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType, storeTableNumber, isAdmin]);

  // Watch table number input and check for existing tabs (Debounced)
  useEffect(() => {
    // If table is locked, we don't need to search as it's already set
    if (isTableLocked || !tableNumber) return;

    // Reset occupied status when input changes (before search)
    setIsTabOccupied(false);

    const timer = setTimeout(async () => {
      // Only search if table number has content
      if (tableNumber.length < 1) return;

      try {
        const result = await getOpenTabForTableAction(tableNumber);
        if (result.success && result.data?.tab) {
          const tab = result.data.tab;
          console.log('Found existing tab for table', tableNumber);
          
          // Check permissions: Admin OR Owner
          // user.id comes from useAuth hook which fetches from /api/auth/user
          const isAdmin = role === 'csr' || role === 'admin' || role === 'super-admin';
          // Note: tab.userId is likely a string from JSON serialization, user.id is string
          // Cast to string for comparison to avoid TS error with ObjectId
          const isMyTab = user?.id && tab.userId?.toString() === user.id;

          if (isAdmin || isMyTab) {
            setExistingTab(tab);
            form.setValue('useTab', 'existing-tab');
            setIsTabOccupied(false);
          } else {
            // Tab exists but not authorized to join
            setExistingTab(null);
            form.setValue('useTab', 'new-tab'); 
            setIsTabOccupied(true);
          }
        } else {
          // No tab found
          setExistingTab(null);
          form.setValue('useTab', 'new-tab');
          setIsTabOccupied(false);
        }
      } catch (error) {
        console.error('Error checking table:', error);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [tableNumber, isTableLocked, form, role, user]);

  // Adjust steps based on order type and tab choice
  useEffect(() => {
    if (orderType === 'dine-in') {
      if (useTab === 'new-tab' || useTab === 'existing-tab') {
        // If using a tab, skip Tip and Payment steps
        setSteps([
          baseSteps[0], // Customer Info
          baseSteps[1], // Order Details
          baseSteps[2], // Tab Options
        ]);
      } else {
        // For Pay Now, include all steps
        setSteps(baseSteps);
      }
    } else {
      // For pickup/delivery, skip tab options step
      setSteps([
        baseSteps[0], // Customer Info
        baseSteps[1], // Order Details
        baseSteps[3], // Tip
        baseSteps[4], // Payment
      ]);
    }
  }, [orderType, useTab]);

  // Redirect if cart is empty, unless we're showing the success dialog
  useEffect(() => {
    // Don't redirect if we have a success status (meaning order just completed)
    if (orderStatus?.status === 'success') {
      return;
    }

    if (items.length === 0) {
      router.push('/menu');
    }
  }, [items.length, router, orderStatus]);

  // Generate idempotency key when component mounts
  useEffect(() => {
    // Generate a unique key for this checkout session
    const key = `checkout-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    setIdempotencyKey(key);
  }, []);

  // Reset submission state when component unmounts
  useEffect(() => {
    return () => {
      setHasSubmitted(false);
      setIsSubmitting(false);
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  async function onSubmit(data: CheckoutFormData) {
    // Prevent submission during navigation or double submission
    if (isNavigating) {
      console.log('Preventing submission during navigation');
      return;
    }
    
    if (isSubmitting || hasSubmitted) {
      console.log('Preventing duplicate submission:', { isSubmitting, hasSubmitted });
      return;
    }
    
    console.log('Starting order submission');
    setIsSubmitting(true);
    setHasSubmitted(true);

    try {
      // Handle tab creation if needed
      let tabId: string | undefined;
      
      if (data.orderType === 'dine-in' && data.useTab !== 'pay-now') {
        if (data.useTab === 'new-tab') {
          // Create new tab with customer details
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
              message: tabResult.error || 'Failed to create tab. Please try again.',
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

      // Step 1: Create order
      const orderResult = await createOrder({
        orderType: data.orderType,
        items,
        customerInfo: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        },
        deliveryInfo: data.orderType === 'delivery' ? {
          street: data.deliveryStreet || '',
          street2: data.deliveryStreet2,
          city: data.deliveryCity || '',
          state: data.deliveryState || '',
          postalCode: data.deliveryPostalCode || '',
          country: data.deliveryCountry || '',
          landmark: data.deliveryLandmark,
          instructions: data.deliveryInstructions,
        } : undefined,
        pickupTime: data.pickupTime,
        tableNumber: data.tableNumber,
        specialInstructions: data.specialInstructions,
        tabId,
        tipAmount: data.tipAmount || 0,
        savePhone: data.savePhone,
        saveAddress: data.saveAddress,
        idempotencyKey,
      });

      if (!orderResult.success || !orderResult.data) {
        setOrderStatus({
          status: 'error',
          title: 'Order Failed',
          message: orderResult.message || 'Failed to create order. Please try again.',
        });
        setShowStatusDialog(true);
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }

      const { orderId } = orderResult.data;

      // If using a tab, don't initialize payment yet
      if (tabId) {
        // Redirect admins to dashboard, customers to customer view
        const tabRedirectUrl = (role === 'csr' || role === 'admin' || role === 'super-admin')
          ? `/dashboard/orders/tabs/${tabId}`
          : `/orders/tabs/${tabId}`;
        
        setOrderStatus({
          status: 'success',
          title: 'Order Added to Tab!',
          message: 'Your order has been successfully added to your tab. You can add more orders or pay when ready.',
          redirectUrl: tabRedirectUrl,
          redirectLabel: 'View Tab',
        });
        setShowStatusDialog(true);
        // Don't clear cart here - let the dialog handle it when user navigates
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }

      // Step 2: Handle admin manual payment if selected
      const paymentData = adminPaymentDataRef.current || adminPaymentData;
      if (isAdmin && paymentData && !useAdminFullCheckout) {
        const paymentResult = await completeOrderPaymentManuallyAction({
          orderId,
          paymentType: paymentData.paymentType,
          paymentReference: paymentData.paymentReference,
          comments: paymentData.comments,
        });

        if (!paymentResult.success) {
          setOrderStatus({
            status: 'error',
            title: 'Payment Failed',
            message: paymentResult.message || 'Failed to process manual payment. Please try again.',
          });
          setShowStatusDialog(true);
          setIsSubmitting(false);
          setHasSubmitted(false);
          return;
        }

        // Success - redirect to order details
        setOrderStatus({
          status: 'success',
          title: 'Order Paid Successfully!',
          message: 'The order has been created and marked as paid.',
          redirectUrl: `/dashboard/orders/${orderId}`,
          redirectLabel: 'View Order',
        });
        setShowStatusDialog(true);
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }

      // Step 3: Initialize payment gateway (for customers or admin full checkout)
      if (!data.paymentMethod && !adminPaymentData) {
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
        paymentMethods: data.paymentMethod ? [data.paymentMethod] : ['CARD'],
      });

      if (!paymentResult.success || !paymentResult.data) {
        setOrderStatus({
          status: 'error',
          title: 'Payment Initialization Failed',
          message: paymentResult.message || 'Failed to initialize payment. Please try again.',
        });
        setShowStatusDialog(true);
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }

      // Step 3: Redirect to Monnify checkout
      const { checkoutUrl } = paymentResult.data;
      
      // Show profile update success if applicable
      if (isAuthenticated && (data.savePhone || data.saveAddress)) {
        toast({
          title: 'Profile Updated',
          description: 'Your information has been saved for future orders.',
        });
      }
      
      // Clear cart
      clearCart();

      // Small delay to show toast before redirect
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 500);
    } catch (error) {
      console.error('Checkout error:', error);
      setOrderStatus({
        status: 'error',
        title: 'Unexpected Error',
        message: 'An unexpected error occurred while processing your order. Please try again.',
      });
      setShowStatusDialog(true);
      setIsSubmitting(false);
      setHasSubmitted(false);
    }
  }

  async function handleNext() {
    console.log('handleNext called', { currentStep, stepsLength: steps.length, isNavigating });
    
    // Prevent rapid consecutive navigation
    if (isNavigating) {
      console.log('Navigation already in progress, ignoring');
      return;
    }

    setIsNavigating(true);

    // Validate current step before proceeding
    let fieldsToValidate: (keyof CheckoutFormData)[] = [];
    
    if (currentStep === 1) {
      // Customer Info step
      fieldsToValidate = ['customerName', 'customerEmail', 'customerPhone'];
    } else if (currentStep === 2) {
      // Order Details step
      fieldsToValidate = ['orderType'];
      const currentOrderType = form.getValues('orderType');
      
      if (currentOrderType === 'delivery') {
        fieldsToValidate.push('deliveryStreet', 'deliveryCity', 'deliveryState', 'deliveryCountry');
      } else if (currentOrderType === 'pickup') {
        fieldsToValidate.push('pickupTime');
      } else if (currentOrderType === 'dine-in') {
        fieldsToValidate.push('tableNumber');
        
        // Check if table is occupied (and not ours)
        if (isTabOccupied) {
          console.log('Table occupied, preventing next step');
          setIsNavigating(false);
          return;
        }
      }
    } else if (currentStep === 3 && orderType === 'dine-in') {
      // Tab options step for dine-in
      fieldsToValidate = ['useTab'];
    } else if (currentStep === 4) {
      // Tip step - optional, no validation needed
      fieldsToValidate = [];
    } else if (currentStep === 5 || (currentStep === 4 && orderType !== 'dine-in')) {
      // Payment method step - only validate if paying now
      if (useTab === 'pay-now' || orderType !== 'dine-in') {
        fieldsToValidate = ['paymentMethod'];
      }
    }
    
    // Trigger validation for current step fields
    const isValid = fieldsToValidate.length === 0 || await form.trigger(fieldsToValidate);
    
    console.log('Validation result', { isValid, currentStep, stepsLength: steps.length });
    
    if (isValid && currentStep < steps.length) {
      console.log('Advancing to next step', { from: currentStep, to: currentStep + 1 });
      setCurrentStep(currentStep + 1);
      // Reset navigation flag after a brief delay to ensure state update completes
      setTimeout(() => {
        console.log('Navigation lock released');
        setIsNavigating(false);
      }, 300);
    } else {
      console.log('Not advancing - validation failed or at last step');
      // Reset immediately if validation failed or at last step
      setIsNavigating(false);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Admin Indicator */}
      {isAdmin && <AdminCheckoutIndicator currentStep={steps[currentStep - 1]?.name} />}
      
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
              console.log('Enter key pressed', { currentStep, stepsLength: steps.length, isNavigating });
              
              // IMMEDIATELY stop propagation to prevent Enter from reaching buttons
              e.preventDefault();
              e.stopPropagation();
              
              // If navigation is in progress, ignore this key press
              if (isNavigating) {
                console.log('Navigation in progress, ignoring Enter key');
                return;
              }
              
              // If not on the last step, advance to next
              if (currentStep < steps.length) {
                console.log('Calling handleNext to advance step');
                handleNext();
              } else {
                console.log('On last step, manually triggering form submission');
                // Manually trigger form submission only if not navigating
                if (!isNavigating) {
                  form.handleSubmit(onSubmit)();
                }
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
                    currentStep === 1 && <CustomerInfoStep form={form} isPreFilled={isPreFilled} />
                  )}
                  {currentStep === 2 && <OrderDetailsStep form={form} isTableLocked={isTableLocked} existingTab={existingTab} isTabOccupied={isTabOccupied} />}
                  {currentStep === 3 && orderType === 'dine-in' && (
                    <TabOptionsStep
                      form={form}
                      existingTab={existingTab}
                      tableNumber={tableNumber || ''}
                    />
                  )}
                  {currentStep === 4 && orderType === 'dine-in' && <TipInputStep form={form} subtotal={getTotalPrice()} />}
                  {currentStep === 5 && orderType === 'dine-in' && useTab === 'pay-now' && (
                    <PaymentMethodStep 
                      form={form} 
                      isAdmin={isAdmin}
                      onAdminManualPayment={(data) => {
                        // Set both ref and state - ref is used immediately, state for UI
                        adminPaymentDataRef.current = data;
                        setAdminPaymentData(data);
                        setUseAdminFullCheckout(false);
                        form.handleSubmit(onSubmit)();
                      }}
                      onAdminFullCheckout={() => {
                        adminPaymentDataRef.current = null;
                        setUseAdminFullCheckout(true);
                        setAdminPaymentData(null);
                        handleNext();
                      }}
                      isProcessing={isSubmitting}
                    />
                  )}
                  {currentStep === 3 && orderType !== 'dine-in' && <TipInputStep form={form} subtotal={getTotalPrice()} />}
                  {currentStep === 4 && orderType !== 'dine-in' && (
                    <PaymentMethodStep 
                      form={form} 
                      isAdmin={isAdmin}
                      onAdminManualPayment={(data) => {
                        // Set both ref and state - ref is used immediately, state for UI
                        adminPaymentDataRef.current = data;
                        setAdminPaymentData(data);
                        setUseAdminFullCheckout(false);
                        form.handleSubmit(onSubmit)();
                      }}
                      onAdminFullCheckout={() => {
                        adminPaymentDataRef.current = null;
                        setUseAdminFullCheckout(true);
                        setAdminPaymentData(null);
                        handleNext();
                      }}
                      isProcessing={isSubmitting}
                    />
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
                      <Button type="button" onClick={handleNext} disabled={isTabOccupied}>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Processing...' : (orderType === 'dine-in' && useTab !== 'pay-now' ? 'Add to Tab' : 'Proceed to Payment')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <OrderSummary orderType={form.watch('orderType')} />
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
              // If user closes success dialog, clear cart and go to menu
              if (orderStatus?.status === 'success') {
                clearCart();
                router.push('/menu');
              }
              // Reset order status when dialog closes
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
