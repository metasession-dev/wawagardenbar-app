'use client';

import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Building2, Hash, Smartphone, CheckCircle2 } from 'lucide-react';
import { AdminPaymentOption } from './admin-payment-option';

interface PaymentMethodStepProps {
  form: UseFormReturn<any>;
  isAdmin?: boolean;
  onAdminManualPayment?: (data: {
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
  }) => void;
  onAdminFullCheckout?: () => void;
  isProcessing?: boolean;
}

const paymentMethods = [
  {
    value: 'CARD',
    label: 'Card Payment',
    icon: CreditCard,
    description: 'Pay securely with your debit or credit card',
    instructions: [
      'Supports Visa, Mastercard, and Verve',
      'Secure 3D authentication',
      'Instant confirmation',
    ],
  },
  {
    value: 'ACCOUNT_TRANSFER',
    label: 'Bank Transfer',
    icon: Building2,
    description: 'Transfer from your bank account',
    instructions: [
      'Account details will be provided',
      'Transfer from any Nigerian bank',
      'Confirmation within minutes',
    ],
  },
  {
    value: 'USSD',
    label: 'USSD',
    icon: Hash,
    description: 'Dial USSD code from your mobile phone',
    instructions: [
      'Works on any mobile phone',
      'No internet required',
      'Dial code and follow prompts',
    ],
  },
  {
    value: 'PHONE_NUMBER',
    label: 'Phone Number',
    icon: Smartphone,
    description: 'Enter your phone number to receive payment instructions',
    instructions: [
      'Receive payment link via SMS',
      'Complete payment on your phone',
      'Quick and convenient',
    ],
  },
];

export function PaymentMethodStep({ 
  form, 
  isAdmin = false, 
  onAdminManualPayment, 
  onAdminFullCheckout,
  isProcessing = false 
}: PaymentMethodStepProps) {
  // Show admin payment option for admins
  if (isAdmin && onAdminManualPayment && onAdminFullCheckout) {
    return (
      <AdminPaymentOption
        onManualPayment={onAdminManualPayment}
        onFullCheckout={onAdminFullCheckout}
        isProcessing={isProcessing}
      />
    );
  }

  // Show standard payment gateway options for customers
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Select Payment Method</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="space-y-3"
              >
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = field.value === method.value;

                  return (
                    <Label
                      key={method.value}
                      htmlFor={method.value}
                      className="cursor-pointer"
                    >
                      <Card
                        className={`transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary ring-offset-2'
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <RadioGroupItem
                              value={method.value}
                              id={method.value}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-semibold">{method.label}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {method.description}
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                                  <p className="text-sm font-medium mb-2">
                                    How it works:
                                  </p>
                                  <ul className="space-y-1">
                                    {method.instructions.map((instruction, index) => (
                                      <li
                                        key={index}
                                        className="flex items-start gap-2 text-sm text-muted-foreground"
                                      >
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                        <span>{instruction}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Label>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormDescription>
              Choose your preferred payment method. You'll be redirected to complete the payment securely.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Security Notice */}
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Secure Payment
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                All payments are processed securely through Monnify. Your payment information is encrypted and never stored on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
