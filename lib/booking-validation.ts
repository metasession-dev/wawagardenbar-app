/**
 * @requirement REQ-BOOK-001 — Booking form validation (REQ-129, AC1)
 *
 * Pure helpers shared by the form, the server action and the tests so the
 * browser and the server cannot disagree. Dates and times are the business
 * time zone (`lib/business-time`).
 */
import { z } from '@/lib/zod';
import { businessLocalToInstant } from '@/lib/business-time';
import type { BookingStatus } from '@/interfaces/booking.interface';

/** Bookings one verified phone may create per business calendar day. */
export const BOOKING_DAILY_LIMIT = 5;
export const BOOKING_MIN_GUESTS = 1;
export const BOOKING_MAX_GUESTS = 500;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const baseFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(100, 'Keep your name under 100 characters.'),
  date: z.string().regex(DATE_RE, 'Choose a date.'),
  startTime: z.string().regex(TIME_RE, 'Choose a time.'),
  guests: z.coerce
    .number({ error: 'Enter the number of guests.' })
    .int('Guests must be a whole number.')
    .min(BOOKING_MIN_GUESTS, 'At least 1 guest.')
    .max(BOOKING_MAX_GUESTS, `At most ${BOOKING_MAX_GUESTS} guests.`),
  requests: optionalText(1000),
};

export const tableBookingSchema = z.object({
  type: z.literal('table'),
  ...baseFields,
});

export const eventBookingSchema = z.object({
  type: z.literal('event'),
  ...baseFields,
  endTime: z.string().regex(TIME_RE, 'Choose an end time.'),
  purpose: z
    .string()
    .trim()
    .min(1, 'Tell us the purpose of the event.')
    .max(200, 'Keep the purpose under 200 characters.'),
  wantsDj: z.boolean({ error: 'Say whether you want a DJ.' }),
});

export const bookingInputSchema = z.discriminatedUnion('type', [
  tableBookingSchema,
  eventBookingSchema,
]);

export type BookingInput = z.infer<typeof bookingInputSchema>;

/** Messages for one field at a time, so the form can show them inline. */
export type BookingFieldErrors = Partial<Record<string, string>>;

export function parseBookingInput(
  raw: unknown
):
  | { ok: true; data: BookingInput }
  | { ok: false; errors: BookingFieldErrors } {
  const parsed = bookingInputSchema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: BookingFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

function parseDate(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
}

/** The instant a business-local date and time fall on. */
export function bookingInstant(date: string, hhmm: string): Date {
  const [y, m, d] = parseDate(date);
  return businessLocalToInstant(y, m, d, hhmm);
}

/**
 * Date and time rules that need "now": the start is not in the past, and an
 * event ends after it starts. Returns field messages (empty when valid).
 */
export function validateBookingTiming(
  input: {
    type: 'table' | 'event';
    date: string;
    startTime: string;
    endTime?: string | null;
  },
  now: Date = new Date()
): BookingFieldErrors {
  const errors: BookingFieldErrors = {};
  const start = bookingInstant(input.date, input.startTime);
  if (Number.isNaN(start.getTime())) {
    errors.date = 'Choose a valid date.';
    return errors;
  }
  if (start.getTime() < now.getTime()) {
    errors.date = 'Choose a date and time that has not passed.';
  }
  if (input.type === 'event' && input.endTime) {
    const end = bookingInstant(input.date, input.endTime);
    if (end.getTime() <= start.getTime()) {
      errors.endTime = 'The end time must be after the start time.';
    }
  }
  return errors;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/**
 * An event is flagged for staff when it falls on a closed day or starts before
 * opening or ends after closing. It is still accepted (D7).
 */
export function isOutsideBusinessHours(
  input: { date: string; startTime: string; endTime?: string | null },
  businessHours: Record<string, DayHours> | undefined
): boolean {
  if (!businessHours) return false;
  const [y, m, d] = parseDate(input.date);
  const day = DAY_KEYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const hours = businessHours[day];
  if (!hours) return false;
  if (hours.closed) return true;
  const end = input.endTime ?? input.startTime;
  return input.startTime < hours.open || end > hours.close;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** The sentence `booking_update` carries for a status change staff choose to announce. */
export const BOOKING_STATUS_UPDATE_TEXT: Partial<
  Record<BookingStatus, string>
> = {
  confirmed:
    'Good news: your booking is confirmed. We look forward to seeing you.',
  declined:
    'Sorry, we are unable to take this booking. Reply to this message and we will help you find another time.',
};
