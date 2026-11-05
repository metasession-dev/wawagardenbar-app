'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import { Loader2, Smartphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  sendWhatsAppPinAction,
  verifyWhatsAppPinAction,
} from '@/app/actions/auth';
import { sanitizePhone } from '@/lib/auth-utils';

/**
 * @requirement REQ-AUTHC-001 - Passwordless PIN login (WhatsApp only, REQ-117)
 * @requirement REQ-AUTHC-004 - Consent display and not-on-WhatsApp message
 * @requirement REQ-AUTHC-007 - WhatsApp-unavailable notice
 *
 * Customers enter a phone number and a PIN delivered over WhatsApp. There is
 * no method step: SMS, email and guest sign-in do not exist for customers.
 */

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number too long')
    .regex(/^[\d+\s-]+$/, 'Invalid phone format'),
});

const pinSchema = z.object({
  pin: z
    .string()
    .length(6, 'PIN must be 6 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type PinFormData = z.infer<typeof pinSchema>;

interface LoginFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

type Notice = { kind: 'not-on-whatsapp' | 'unavailable'; message: string };

export function LoginForm({ redirectTo = '/', onSuccess }: LoginFormProps) {
  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [countdown, setCountdown] = useState(0);
  // REQ-053 — only new users see the consent surface.
  const [isNewUser, setIsNewUser] = useState(false);
  // REQ-117 (AC2) — order and booking messages are part of the service, so
  // that consent is always on; marketing stays opt-in and unchecked.
  const [waMarketing, setWaMarketing] = useState(false);
  const [emailMarketingOptIn, setEmailMarketingOptIn] = useState(false);
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
    defaultValues: { phone: '' },
  });

  const pinForm = useForm<PinFormData>({
    resolver: zodResolver(pinSchema),
    defaultValues: { pin: '' },
  });

  async function handlePhoneSubmit(data: PhoneFormData) {
    setIsLoading(true);
    setNotice(null);
    setCountdown(60);
    try {
      const result = await sendWhatsAppPinAction(data.phone);

      if (result.success) {
        setPhone(sanitizePhone(data.phone));
        setIsNewUser(result.isNewUser === true);
        setStep('pin');
        toast({ title: 'PIN Sent', description: result.message });
      } else if (result.notOnWhatsApp) {
        // REQ-117 (AC3) — terminal: no retry through another channel.
        setCountdown(0);
        setNotice({ kind: 'not-on-whatsapp', message: result.message });
      } else if (result.serviceUnavailable) {
        // REQ-117 (AC9)
        setCountdown(0);
        setNotice({ kind: 'unavailable', message: result.message });
      } else {
        setCountdown(0);
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch {
      setCountdown(0);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePinSubmit(data: PinFormData) {
    setIsLoading(true);
    try {
      // The backend only persists consent for a brand-new account, so a stale
      // payload from a returning user is a no-op.
      const optInPayload = isNewUser
        ? {
            whatsappTransactional: true,
            whatsappMarketing: waMarketing,
            emailMarketing: emailMarketingOptIn,
          }
        : undefined;

      const result = await verifyWhatsAppPinAction(
        phone,
        data.pin,
        optInPayload
      );

      if (result.success) {
        toast({ title: 'Success', description: result.message });
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
    } catch {
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
      const result = await sendWhatsAppPinAction(phone);
      if (result.success) {
        toast({
          title: 'PIN Resent',
          description: 'A new PIN has been sent to your WhatsApp.',
        });
        pinForm.reset();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
        setCountdown(0);
      }
    } catch {
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

  if (step === 'phone') {
    return (
      <form
        onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}
        className="space-y-4"
      >
        {notice && (
          <Alert
            variant="destructive"
            className="border-destructive/50 bg-destructive/10"
            data-testid={`signin-notice-${notice.kind}`}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2 font-medium">
              {notice.message}
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
          We&apos;ll send a 6-digit PIN on WhatsApp
        </p>
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
          maxLength={6}
          placeholder="000000"
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
          Enter the 6-digit PIN sent on WhatsApp to {phone}
        </p>
      </div>

      {/* REQ-117 (AC2) — order and booking messages are part of the service
          and cannot be switched off here; marketing is opt-in and unchecked.
          Only new users see this surface. */}
      {isNewUser && (
        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Communication preferences
          </p>

          <div className="flex items-start gap-2">
            <Checkbox
              id="wa-transactional"
              checked
              disabled
              aria-readonly="true"
            />
            <Label htmlFor="wa-transactional" className="text-sm leading-tight">
              WhatsApp messages about my orders and bookings (part of the
              service)
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="wa-marketing"
              checked={waMarketing}
              onCheckedChange={(checked) => setWaMarketing(checked === true)}
              disabled={isLoading}
            />
            <Label
              htmlFor="wa-marketing"
              className="text-sm leading-tight cursor-pointer"
            >
              Offers and promotions via WhatsApp
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="email-marketing"
              checked={emailMarketingOptIn}
              onCheckedChange={(checked) =>
                setEmailMarketingOptIn(checked === true)
              }
              disabled={isLoading}
            />
            <Label
              htmlFor="email-marketing"
              className="text-sm leading-tight cursor-pointer"
            >
              Offers and promotions by email
            </Label>
          </div>
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
            setStep('phone');
            setNotice(null);
          }}
          className="text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          Change phone number
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
    </form>
  );
}
