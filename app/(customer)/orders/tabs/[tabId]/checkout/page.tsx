'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { TipInputStep } from '@/components/features/checkout/tip-input-step';
import { PaymentMethodStep } from '@/components/features/checkout/payment-method-step';
import { RewardSelector } from '@/components/features/rewards/reward-selector';
import { getTabDetailsAction } from '@/app/actions/tabs/tab-actions';
import { initializeTabPayment } from '@/app/actions/payment/payment-actions';
import { redeemRewardAction } from '@/app/actions/rewards/rewards-actions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { IReward } from '@/interfaces';

const checkoutSchema = z.object({
  tipAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(['CARD', 'ACCOUNT_TRANSFER', 'USSD', 'PHONE_NUMBER'], {
    required_error: 'Please select a payment method',
  }),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface TabCheckoutPageProps {
  params: Promise<{ tabId: string }>;
}

export default function TabCheckoutPage({ params }: TabCheckoutPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabDetails, setTabDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRewards, setSelectedRewards] = useState<IReward[]>([]);
  const [rewardDiscount, setRewardDiscount] = useState(0);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      tipAmount: 0,
      customerName: '',
      customerEmail: '',
    },
  });

  useEffect(() => {
    async function loadTabDetails() {
      const result = await getTabDetailsAction(resolvedParams.tabId);
      if (result.success && result.data) {
        setTabDetails(result.data);

        // Prepopulate form with customer data from tab or user profile
        const { tab } = result.data;
        const customerName = tab.customerName || user?.name || '';
        const customerEmail = tab.customerEmail || user?.email || '';

        form.setValue('customerName', customerName);
        form.setValue('customerEmail', customerEmail);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load tab details',
          variant: 'destructive',
        });
        router.push('/orders/tabs');
      }
      setIsLoading(false);
    }
    loadTabDetails();
  }, [resolvedParams.tabId, router, toast, user, form]);

  async function onSubmit(data: CheckoutFormData) {
    setIsSubmitting(true);

    try {
      // Redeem all selected rewards
      if (selectedRewards.length > 0) {
        for (const reward of selectedRewards) {
          const redeemResult = await redeemRewardAction(
            reward._id.toString(),
            resolvedParams.tabId
          );

          if (!redeemResult.success) {
            toast({
              title: 'Warning',
              description: `Failed to apply reward ${reward.code}, continuing with payment`,
              variant: 'destructive',
            });
          }
        }
      }

      const paymentResult = await initializeTabPayment({
        tabId: resolvedParams.tabId,
        tipAmount: data.tipAmount || 0,
        rewardDiscount: rewardDiscount,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        paymentMethods: [data.paymentMethod],
      });

      if (!paymentResult.success || !paymentResult.data) {
        toast({
          title: 'Error',
          description: paymentResult.message || 'Failed to initialize payment',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Redirect to Monnify checkout
      const { checkoutUrl } = paymentResult.data;
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!tabDetails) {
    return null;
  }

  const { tab } = tabDetails;
  const tipAmount = form.watch('tipAmount') || 0;
  const subtotalWithTip = tab.total + tipAmount;
  const finalTotal = Math.max(0, subtotalWithTip - rewardDiscount);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link href={`/orders/tabs/${resolvedParams.tabId}`}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tab
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-8">Pay Tab</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <RewardSelector
                subtotal={tab.subtotal}
                onRewardSelect={(rewards, discount) => {
                  setSelectedRewards(rewards);
                  setRewardDiscount(discount);
                }}
                selectedRewardIds={selectedRewards.map((r) => r._id.toString())}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Add a Tip (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <TipInputStep form={form} subtotal={tab.subtotal} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentMethodStep form={form} />
                </CardContent>
              </Card>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Processing...'
                  : `Pay ₦${finalTotal.toLocaleString()}`}
              </Button>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Tab Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>₦{tab.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Service Fee:
                      </span>
                      <span>₦{tab.serviceFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>₦{tab.tax.toLocaleString()}</span>
                    </div>
                    {tab.discountTotal > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-₦{tab.discountTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {tipAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tip:</span>
                        <span>₦{tipAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {rewardDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Reward Discount:</span>
                        <span>-₦{rewardDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>₦{finalTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Table {tab.tableNumber}</p>
                    <p>• {tab.orders.length} order(s)</p>
                    <p>• Tab #{tab.tabNumber}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
