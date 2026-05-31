'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Smartphone,
  Mail,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  sendPinAction,
  verifyPinAction,
  sendEmailPinAction,
  verifyEmailPinAction,
  sendWhatsAppPinAction,
  verifyWhatsAppPinAction,
} from '@/app/actions/auth';
import { sanitizePhone } from '@/lib/auth-utils';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number too long')
    .regex(/^[\d+\s-]+$/, 'Invalid phone format'),
});

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const pinSchema = z.object({
  pin: z
    .string()
    .length(4, 'PIN must be 4 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type EmailFormData = z.infer<typeof emailSchema>;
type PinFormData = z.infer<typeof pinSchema>;

interface LoginFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function LoginForm({ redirectTo = '/', onSuccess }: LoginFormProps) {
  const [step, setStep] = useState<'method' | 'phone' | 'email' | 'pin'>(
    'method'
  );
  const [authMethod, setAuthMethod] = useState<'sms' | 'email' | 'whatsapp'>(
    'whatsapp'
  );
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<{
    message: string;
    canRetryWithSMS?: boolean;
    canRetryWithEmail?: boolean;
  } | null>(null);
  const [countdown, setCountdown] = useState(0);
  // REQ-053 — Tracked from the send-pin response so the PIN-entry step
  // can decide whether to render the WhatsApp opt-in checkbox. Only new
  // users see the consent surface; returning users skip it.
  const [isNewUser, setIsNewUser] = useState(false);
  // REQ-053 — The single PIN-verification checkbox is wired to both
  // WhatsApp consent fields per AC3. Default checked: opt-in for order
  // updates + offers; unchecking opts out of both.
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { refreshSession } = useAuth();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: '',
    },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const pinForm = useForm<PinFormData>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      pin: '',
    },
  });

  async function handlePhoneSubmit(data: PhoneFormData) {
    setIsLoading(true);
    setDeliveryError(null);
    setCountdown(60);
    try {
      let result;

      if (authMethod === 'whatsapp') {
        result = await sendWhatsAppPinAction(data.phone);
      } else {
        result = await sendPinAction(data.phone);
      }

      if (result.success) {
        setPhone(sanitizePhone(data.phone));
        // REQ-053 — capture the new-user flag for the PIN-entry checkbox.
        setIsNewUser(result.isNewUser === true);
        setStep('pin');
        toast({
          title: 'PIN Sent',
          description: result.message,
        });
      } else {
        // Check if we can retry with other methods
        if (result.canRetryWithSMS || result.canRetryWithEmail) {
          setPhone(sanitizePhone(data.phone));

          setDeliveryError({
            message: result.message,
            canRetryWithSMS: result.canRetryWithSMS,
            canRetryWithEmail: result.canRetryWithEmail,
          });
        } else {
          toast({
            title: 'Error',
            description: result.message,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmailSubmit(data: EmailFormData) {
    setIsLoading(true);
    try {
      const result = await sendEmailPinAction(data.email, phone);

      if (result.success) {
        setEmail(data.email);
        setAuthMethod('email');
        // REQ-053 — capture the new-user flag for the PIN-entry checkbox.
        setIsNewUser(result.isNewUser === true);
        setStep('pin');
        toast({
          title: 'PIN Sent',
          description: result.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleTrySMS() {
    setDeliveryError(null);
    setAuthMethod('sms');
  }

  function handleTryEmail() {
    setDeliveryError(null);
    setStep('email');
  }

  async function handlePinSubmit(data: PinFormData) {
    setIsLoading(true);
    try {
      let result;
      // REQ-053 — Send the WhatsApp opt-in payload only for new users;
      // the backend further gates persistence on `!phoneVerified &&
      // !emailVerified`, so a stale payload from a returning user is a
      // no-op even if it slips through.
      const optInPayload = isNewUser
        ? {
            whatsappTransactional: whatsappOptIn,
            whatsappMarketing: whatsappOptIn,
          }
        : undefined;

      if (authMethod === 'whatsapp') {
        result = await verifyWhatsAppPinAction(phone, data.pin, optInPayload);
      } else if (authMethod === 'sms') {
        result = await verifyPinAction(phone, data.pin, optInPayload);
      } else {
        result = await verifyEmailPinAction(email, data.pin, optInPayload);
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });

        // Refresh session to update auth state
        refreshSession();

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(redirectTo);
          router.refresh();
        }
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendPin() {
    setCountdown(60);
    setIsLoading(true);
    try {
      let result;

      if (authMethod === 'whatsapp') {
        result = await sendWhatsAppPinAction(phone);
      } else if (authMethod === 'sms') {
        result = await sendPinAction(phone);
      } else {
        result = await sendEmailPinAction(email, phone);
      }

      if (result.success) {
        const methodText =
          authMethod === 'whatsapp'
            ? 'WhatsApp'
            : authMethod === 'sms'
              ? 'phone'
              : 'email';
        toast({
          title: 'PIN Resent',
          description: `A new PIN has been sent to your ${methodText}.`,
        });
        pinForm.reset();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
        setCountdown(0); // Reset countdown on error so user can try again if needed
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend PIN. Please try again.',
        variant: 'destructive',
      });
      setCountdown(0);
    } finally {
      setIsLoading(false);
    }
  }

  // Method selection step
  if (step === 'method') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Choose delivery method</h3>
          <p className="text-sm text-muted-foreground">
            How would you like to receive your verification PIN?
          </p>
        </div>

        <div className="grid gap-3">
          <Card
            className={`p-4 cursor-pointer transition-all hover:border-primary ${
              authMethod === 'whatsapp' ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => {
              setAuthMethod('whatsapp');
              setStep('phone');
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">WhatsApp</h4>
                <p className="text-sm text-muted-foreground">
                  Instant delivery via WhatsApp message
                </p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 cursor-pointer transition-all hover:border-primary ${
              authMethod === 'sms' ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => {
              setAuthMethod('sms');
              setStep('phone');
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">SMS</h4>
                <p className="text-sm text-muted-foreground">
                  Traditional text message to your phone
                </p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 cursor-pointer transition-all hover:border-primary ${
              authMethod === 'email' ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => {
              setAuthMethod('email');
              setStep('email');
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Email</h4>
                <p className="text-sm text-muted-foreground">
                  PIN sent to your email address
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'phone') {
    return (
      <form
        onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}
        className="space-y-4"
      >
        {deliveryError &&
          (deliveryError.canRetryWithSMS ||
            deliveryError.canRetryWithEmail) && (
            <Alert
              variant="destructive"
              className="border-destructive/50 bg-destructive/10"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <p className="mb-3 font-medium">{deliveryError.message}</p>
                <div className="flex gap-2">
                  {deliveryError.canRetryWithSMS &&
                    authMethod === 'whatsapp' && (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleTrySMS}
                        className="flex-1"
                      >
                        <Smartphone className="mr-2 h-4 w-4" />
                        Try SMS
                      </Button>
                    )}
                  {deliveryError.canRetryWithEmail && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleTryEmail}
                      className="flex-1"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Try Email
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+234 800 000 0000"
              className="pl-10"
              {...phoneForm.register('phone')}
              disabled={isLoading}
            />
          </div>
          {phoneForm.formState.errors.phone && (
            <p className="text-sm text-red-500">
              {phoneForm.formState.errors.phone.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || countdown > 0}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {countdown > 0 ? `Wait ${countdown}s` : 'Continue'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          We'll send a 4-digit PIN via{' '}
          {authMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}
        </p>

        <button
          type="button"
          onClick={() => setStep('method')}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          ← Change delivery method
        </button>
      </form>
    );
  }

  if (step === 'email') {
    return (
      <form
        onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
        className="space-y-4"
      >
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription className="ml-2">
            We'll send a verification PIN to your email address instead.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              className="pl-10"
              {...emailForm.register('email')}
              disabled={isLoading}
              autoFocus
            />
          </div>
          {emailForm.formState.errors.email && (
            <p className="text-sm text-red-500">
              {emailForm.formState.errors.email.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send PIN to Email
        </Button>

        <button
          type="button"
          onClick={() => {
            setStep('method');
            setDeliveryError(null);
          }}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          ← Change delivery method
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={pinForm.handleSubmit(handlePinSubmit)}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="pin">Verification PIN</Label>
        <Input
          id="pin"
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="0000"
          className="text-center text-2xl tracking-widest"
          {...pinForm.register('pin')}
          disabled={isLoading}
          autoFocus
        />
        {pinForm.formState.errors.pin && (
          <p className="text-sm text-red-500">
            {pinForm.formState.errors.pin.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Enter the 4-digit PIN sent via{' '}
          {authMethod === 'whatsapp'
            ? 'WhatsApp'
            : authMethod === 'sms'
              ? 'SMS'
              : 'Email'}{' '}
          to {authMethod === 'email' ? email : phone}
        </p>
      </div>

      {/* REQ-053 — WhatsApp opt-in checkbox; only rendered for new users
          (send-pin reported isNewUser === true). Default checked: consent
          for both transactional + marketing. Unchecking opts out of both
          per AC3. Returning users skip this surface entirely. */}
      {isNewUser && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3">
          <Checkbox
            id="whatsapp-opt-in"
            checked={whatsappOptIn}
            onCheckedChange={(checked) => setWhatsappOptIn(checked === true)}
            disabled={isLoading}
          />
          <Label
            htmlFor="whatsapp-opt-in"
            className="text-sm leading-tight cursor-pointer"
          >
            Get order updates and offers via WhatsApp — recommended
          </Label>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Verify & Login
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setStep(authMethod === 'email' ? 'email' : 'phone');
            setDeliveryError(null);
          }}
          className="text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          Change {authMethod === 'email' ? 'email' : 'phone number'}
        </button>
        <button
          type="button"
          onClick={handleResendPin}
          className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
          disabled={isLoading || countdown > 0}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend PIN'}
        </button>
      </div>

      {(authMethod === 'sms' || authMethod === 'whatsapp') && (
        <div className="mt-6">
          <Alert className="bg-amber-50 border-amber-200 shadow-sm">
            <Mail className="h-5 w-5 text-amber-600" />
            <AlertDescription className="ml-3 text-base text-amber-900">
              Having trouble receiving the{' '}
              {authMethod === 'whatsapp' ? 'WhatsApp message' : 'SMS'}? You can{' '}
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setDeliveryError(null);
                }}
                className="font-semibold text-amber-700 hover:text-amber-900 underline decoration-amber-700/30 underline-offset-4 hover:decoration-amber-900"
                disabled={isLoading}
              >
                verify via email
              </button>{' '}
              instead.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </form>
  );
}
