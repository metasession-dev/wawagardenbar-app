'use server';

/**
 * @requirement REQ-BOOK-001 — Customer submit (REQ-129, AC1, AC2)
 * @requirement REQ-BOOK-003 — Staff actions are role-gated on the server (REQ-129, AC4)
 * @requirement REQ-BOOK-004 — Customer reads are owner-scoped (REQ-129, AC6)
 *
 * Two processes, never mixed: the customer submit action needs a customer
 * session and takes the phone from the account; the staff actions need
 * `csr`, `manager`, `admin` or `super-admin` and are refused for anyone else
 * whatever the page shows.
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData, hasAnyRole } from '@/lib/session';
import { getPrimaryRole, isCustomerSession } from '@/lib/roles';
import { BOOKING_ROLES } from '@/lib/dashboard-section-roles';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { BookingService, type BookingActor } from '@/services/booking-service';
import type { BookingFieldErrors } from '@/lib/booking-validation';

export interface SubmitBookingResult {
  success: boolean;
  /** No customer session: the page opens the PIN form and submits again. */
  needsSignIn?: boolean;
  error?: string;
  fieldErrors?: BookingFieldErrors;
  bookingNumber?: string;
  firstName?: string;
}

export interface BookingActionResult {
  success: boolean;
  error?: string;
}

async function readSession(): Promise<SessionData> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** AC1 — a verified customer submits a booking; the phone is never read from the form. */
export async function submitBookingAction(
  input: unknown
): Promise<SubmitBookingResult> {
  const session = await readSession();
  if (!session.isLoggedIn || !session.userId || session.isGuest) {
    return { success: false, needsSignIn: true };
  }
  // Staff may not create a booking for a customer through this form.
  if (!isCustomerSession(session)) {
    return {
      success: false,
      error: 'Bookings are made from a customer account.',
    };
  }
  await connectDB();
  const user = await UserModel.findById(session.userId)
    .select('phone firstName name')
    .lean<{ phone?: string; firstName?: string; name?: string } | null>();
  if (!user?.phone) {
    return { success: false, needsSignIn: true };
  }

  const result = await BookingService.createBooking({
    userId: session.userId,
    phone: user.phone,
    input,
  });
  if (!result.ok) {
    return {
      success: false,
      error: result.message,
      fieldErrors: result.fieldErrors,
    };
  }
  revalidatePath('/profile/bookings');
  revalidatePath('/dashboard/bookings');
  const name = String(result.booking.name || user.firstName || user.name || '');
  return {
    success: true,
    bookingNumber: result.booking.bookingNumber,
    firstName: name.trim().split(/\s+/)[0] || 'there',
  };
}

async function requireBookingStaff(): Promise<
  { ok: true; actor: BookingActor } | { ok: false; error: string }
> {
  const session = await readSession();
  if (
    !session.isLoggedIn ||
    !session.userId ||
    !hasAnyRole(session, [...BOOKING_ROLES])
  ) {
    return { ok: false, error: 'Unauthorized' };
  }
  return {
    ok: true,
    actor: {
      userId: session.userId,
      email: session.email || '',
      role: getPrimaryRole(session) ?? 'unknown',
    },
  };
}

function done(id: string, result: { ok: boolean; error?: string }) {
  revalidatePath('/dashboard/bookings');
  revalidatePath(`/dashboard/bookings/${id}`);
  return result.ok
    ? { success: true }
    : { success: false, error: result.error ?? 'Something went wrong.' };
}

export async function setBookingStatusAction(input: {
  id: string;
  status: string;
}): Promise<BookingActionResult> {
  const auth = await requireBookingStaff();
  if (!auth.ok) return { success: false, error: auth.error };
  return done(
    input.id,
    await BookingService.setStatus({ ...input, actor: auth.actor })
  );
}

export async function assignBookingAction(input: {
  id: string;
  assigneeId: string | null;
}): Promise<BookingActionResult> {
  const auth = await requireBookingStaff();
  if (!auth.ok) return { success: false, error: auth.error };
  return done(
    input.id,
    await BookingService.assign({ ...input, actor: auth.actor })
  );
}

export async function addBookingNoteAction(input: {
  id: string;
  body: string;
}): Promise<BookingActionResult> {
  const auth = await requireBookingStaff();
  if (!auth.ok) return { success: false, error: auth.error };
  return done(
    input.id,
    await BookingService.addNote({ ...input, actor: auth.actor })
  );
}

export async function replyToBookingAction(input: {
  id: string;
  body: string;
}): Promise<BookingActionResult> {
  const auth = await requireBookingStaff();
  if (!auth.ok) return { success: false, error: auth.error };
  return done(
    input.id,
    await BookingService.addStaffReply({ ...input, actor: auth.actor })
  );
}
