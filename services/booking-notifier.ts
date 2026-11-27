/**
 * @requirement REQ-BOOK-002 — Booking received message (REQ-129, AC2)
 * @requirement REQ-WA-020 — `booking_received` / `booking_update` (REQ-129, AC7)
 *
 * Customer messages for a booking. Inside the customer's 24-hour window the
 * text goes free-form, outside it as the template. Consent gating, the admin
 * gate, `held_template_pending` and the NotificationLog stay in
 * `NotificationService.send`. Never throws: a messaging problem must not undo
 * or fail a booking.
 */
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { NotificationService } from '@/services/notification-service';
import { resolveMode } from '@/services/order-status-notifier';
import {
  bookingReceivedParams,
  bookingUpdateParams,
} from '@/lib/whatsapp-template-params';
import type { IBooking } from '@/models/booking-model';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "7:00 PM" from "19:00". */
export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "Sat 6 Dec at 7:00 PM" from "2026-12-06" and "19:00". */
export function formatWhen(date: string, startTime: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]} at ${formatTime12(startTime)}`;
}

export function guestsText(guests: number): string {
  return guests === 1 ? '1 guest' : `${guests} guests`;
}

function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '');
}

export function bookingUrl(bookingId: string): string {
  return `${appBase()}/profile/bookings/${bookingId}`;
}

type BookingForMessage = Pick<
  IBooking,
  'userId' | 'type' | 'name' | 'guests' | 'date' | 'startTime' | 'bookingNumber'
> & { _id: unknown };

async function customerFirstName(
  userId: string,
  fallback: string
): Promise<string> {
  try {
    await connectDB();
    const user = await UserModel.findById(userId)
      .select('firstName name')
      .lean<{ firstName?: string; name?: string } | null>();
    return user?.firstName ?? user?.name ?? fallback;
  } catch {
    return fallback;
  }
}

export async function notifyBookingReceived(
  booking: BookingForMessage
): Promise<{ sent: boolean }> {
  try {
    const first = await customerFirstName(booking.userId, booking.name);
    const mode = await resolveMode(booking.userId);
    const when = formatWhen(booking.date, booking.startTime);
    const params = bookingReceivedParams({
      customerName: first,
      typeLabel: booking.type,
      guestsText: guestsText(booking.guests),
      whenText: when,
      bookingNumber: booking.bookingNumber,
    });
    const result = await NotificationService.send({
      userId: booking.userId,
      templateKey: 'booking_received',
      whatsapp: {
        params: params.bodyParams,
        ...(mode === 'free_form'
          ? {
              freeFormText: `Hi ${params.bodyParams[0]}, thanks for your ${booking.type} request for ${guestsText(booking.guests)} on ${when} (ref ${booking.bookingNumber}). We'll get back to you shortly to discuss your needs.`,
            }
          : {}),
      },
    });
    return { sent: result.success };
  } catch (error) {
    console.error('notifyBookingReceived failed', error);
    return { sent: false };
  }
}

export async function notifyBookingUpdate(
  booking: BookingForMessage,
  updateText: string
): Promise<{ sent: boolean }> {
  try {
    const bookingId = String(booking._id);
    const first = await customerFirstName(booking.userId, booking.name);
    const mode = await resolveMode(booking.userId);
    const params = bookingUpdateParams({
      customerName: first,
      bookingNumber: booking.bookingNumber,
      bookingId,
      updateText,
    });
    const result = await NotificationService.send({
      userId: booking.userId,
      templateKey: 'booking_update',
      whatsapp: {
        params: params.bodyParams,
        buttonParams: params.buttonParams,
        ...(mode === 'free_form'
          ? {
              freeFormText: `Hi ${params.bodyParams[0]}, an update on your booking ${booking.bookingNumber}: ${updateText}\nView it: ${bookingUrl(bookingId)}`,
            }
          : {}),
      },
    });
    return { sent: result.success };
  } catch (error) {
    console.error('notifyBookingUpdate failed', error);
    return { sent: false };
  }
}
