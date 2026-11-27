'use client';

/**
 * @requirement REQ-BOOK-001 — Booking form at /book (REQ-129, AC1)
 * @requirement REQ-BOOK-002 — Confirmation screen (REQ-129, AC2)
 *
 * Table or Event. Name and phone are prefilled from the signed-in account and
 * the phone is locked to the verified number. Without a session, submitting
 * opens the WhatsApp PIN form in a dialog and then submits the kept details,
 * so nothing is re-entered. The server action is the authority: it takes the
 * phone from the account and re-validates every field.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoginForm } from '@/components/shared/auth/login-form';
import { useAuth } from '@/hooks/use-auth';
import {
  submitBookingAction,
  type SubmitBookingResult,
} from '@/app/actions/booking/booking-actions';
import {
  BOOKING_MAX_GUESTS,
  BOOKING_MIN_GUESTS,
} from '@/lib/booking-validation';
import type { BookingType } from '@/interfaces/booking.interface';

interface FormState {
  type: BookingType;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: string;
  purpose: string;
  wantsDj: '' | 'yes' | 'no';
  requests: string;
}

const EMPTY: FormState = {
  type: 'table',
  name: '',
  date: '',
  startTime: '',
  endTime: '',
  guests: '',
  purpose: '',
  wantsDj: '',
  requests: '',
};

function toPayload(state: FormState): Record<string, unknown> {
  const base = {
    type: state.type,
    name: state.name,
    date: state.date,
    startTime: state.startTime,
    guests: state.guests,
    requests: state.requests,
  };
  if (state.type === 'table') return base;
  return {
    ...base,
    endTime: state.endTime,
    purpose: state.purpose,
    wantsDj: state.wantsDj === '' ? undefined : state.wantsDj === 'yes',
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={`${id}-error`}
      role="alert"
      className="text-sm text-destructive"
      data-testid={`${id}-error`}
    >
      {message}
    </p>
  );
}

interface BookingFormProps {
  /** Read on the server for a signed-in customer, so the form is prefilled on first paint. */
  initialName?: string;
  initialPhone?: string;
}

export function BookingForm({
  initialName = '',
  initialPhone = '',
}: BookingFormProps) {
  const { user, isLoading: authLoading, refreshSession } = useAuth();
  const [state, setState] = useState<FormState>({
    ...EMPTY,
    name: initialName,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [done, setDone] = useState<{
    bookingNumber: string;
    firstName: string;
  } | null>(null);
  const [today, setToday] = useState('');

  // Prefill the name once, without overwriting what the visitor typed.
  useEffect(() => {
    if (user?.name && user.hasName !== false) {
      setState((s) => (s.name ? s : { ...s, name: user.name ?? '' }));
    }
  }, [user?.name, user?.hasName]);

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit(current: FormState) {
    setSubmitting(true);
    setFormError(null);
    try {
      const result: SubmitBookingResult = await submitBookingAction(
        toPayload(current)
      );
      if (result.needsSignIn) {
        setSignInOpen(true);
        return;
      }
      if (!result.success) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone({
        bookingNumber: result.bookingNumber ?? '',
        firstName: result.firstName ?? 'there',
      });
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void submit(state);
  }

  if (done) {
    return (
      <div
        className="rounded-lg border bg-card p-6 text-center space-y-3"
        data-testid="booking-confirmation"
      >
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        <h2 className="text-2xl font-semibold">Request received</h2>
        <p data-testid="booking-confirmation-text">
          Thanks, {done.firstName}. We&apos;ve received your request and will
          get back to you shortly to discuss your needs.
        </p>
        <p className="text-sm text-muted-foreground">
          Your reference is{' '}
          <span className="font-mono" data-testid="booking-number">
            {done.bookingNumber}
          </span>
          .
        </p>
        <Button asChild variant="outline">
          <Link href="/profile/bookings">View my bookings</Link>
        </Button>
      </div>
    );
  }

  const isEvent = state.type === 'event';
  const phoneShown = user?.phone || initialPhone;

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What would you like?</legend>
          <div
            className="flex gap-2"
            role="radiogroup"
            aria-label="Booking type"
          >
            {(['table', 'event'] as const).map((type) => (
              <Button
                key={type}
                type="button"
                role="radio"
                aria-checked={state.type === type}
                variant={state.type === type ? 'default' : 'outline'}
                data-testid={`booking-type-${type}`}
                onClick={() => set('type', type)}
              >
                {type === 'table' ? 'Book a table' : 'Plan an event'}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="booking-name">Name</Label>
            <Input
              id="booking-name"
              data-testid="booking-name"
              value={state.name}
              onChange={(e) => set('name', e.target.value)}
              autoComplete="name"
            />
            <FieldError id="booking-name" message={errors.name} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="booking-phone">Phone (WhatsApp)</Label>
            <Input
              id="booking-phone"
              data-testid="booking-phone"
              value={phoneShown}
              placeholder="Shown after you sign in"
              readOnly
              disabled
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="booking-date">Date</Label>
            <Input
              id="booking-date"
              data-testid="booking-date"
              type="date"
              min={today || undefined}
              value={state.date}
              onChange={(e) => set('date', e.target.value)}
            />
            <FieldError id="booking-date" message={errors.date} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="booking-start">
              {isEvent ? 'Start time' : 'Time'}
            </Label>
            <Input
              id="booking-start"
              data-testid="booking-start-time"
              type="time"
              value={state.startTime}
              onChange={(e) => set('startTime', e.target.value)}
            />
            <FieldError id="booking-start" message={errors.startTime} />
          </div>
          {isEvent && (
            <div className="space-y-1">
              <Label htmlFor="booking-end">End time</Label>
              <Input
                id="booking-end"
                data-testid="booking-end-time"
                type="time"
                value={state.endTime}
                onChange={(e) => set('endTime', e.target.value)}
              />
              <FieldError id="booking-end" message={errors.endTime} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="booking-guests">
              {isEvent ? 'Guests expected' : 'Number of guests'}
            </Label>
            <Input
              id="booking-guests"
              data-testid="booking-guests"
              type="number"
              inputMode="numeric"
              min={BOOKING_MIN_GUESTS}
              max={BOOKING_MAX_GUESTS}
              value={state.guests}
              onChange={(e) => set('guests', e.target.value)}
            />
            <FieldError id="booking-guests" message={errors.guests} />
          </div>
        </div>

        {isEvent && (
          <div className="space-y-4" data-testid="booking-event-fields">
            <div className="space-y-1">
              <Label htmlFor="booking-purpose">Purpose of the event</Label>
              <Input
                id="booking-purpose"
                data-testid="booking-purpose"
                value={state.purpose}
                onChange={(e) => set('purpose', e.target.value)}
                placeholder="Birthday, anniversary, corporate…"
              />
              <FieldError id="booking-purpose" message={errors.purpose} />
            </div>
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">Do you want a DJ?</legend>
              <div className="flex gap-4">
                {(['yes', 'no'] as const).map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="booking-dj"
                      data-testid={`booking-dj-${value}`}
                      checked={state.wantsDj === value}
                      onChange={() => set('wantsDj', value)}
                    />
                    {value === 'yes' ? 'Yes' : 'No'}
                  </label>
                ))}
              </div>
              <FieldError id="booking-dj" message={errors.wantsDj} />
            </fieldset>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="booking-requests">
            {isEvent ? 'Specific requests' : 'Special requests'} (optional)
          </Label>
          <Textarea
            id="booking-requests"
            data-testid="booking-requests"
            value={state.requests}
            onChange={(e) => set('requests', e.target.value)}
            rows={3}
          />
          <FieldError id="booking-requests" message={errors.requests} />
        </div>

        {formError && (
          <p
            role="alert"
            className="text-sm text-destructive"
            data-testid="booking-form-error"
          >
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting || authLoading}
          data-testid="booking-submit"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send request
        </Button>
        <p className="text-sm text-muted-foreground">
          This is an enquiry, not a confirmed booking and no payment is taken.
          We&apos;ll reply on WhatsApp.
        </p>
      </form>

      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent data-testid="booking-signin-dialog">
          <DialogHeader>
            <DialogTitle>Verify your WhatsApp number</DialogTitle>
            <DialogDescription>
              We&apos;ll send a PIN on WhatsApp. Your booking details are kept
              and sent as soon as you are verified.
            </DialogDescription>
          </DialogHeader>
          <LoginForm
            onSuccess={() => {
              setSignInOpen(false);
              refreshSession();
              void submit(state);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
