/**
 * @requirement REQ-BOOK-001 — Booking creation, validation, rate limit (REQ-129, AC1)
 * @requirement REQ-BOOK-003 — Staff handling: status, assignee, notes, replies, audit (REQ-129, AC4, AC5)
 * @requirement REQ-BOOK-004 — Customer reads, owner only (REQ-129, AC6)
 *
 * Every booking read and write goes through here, so the customer form, the
 * staff dashboard and the tests share one persistence and side-effect path.
 * A booking is an enquiry: no payment and no table allocation.
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import BookingModel, {
  BookingCounterModel,
  type IBooking,
} from '@/models/booking-model';
import {
  BOOKING_STATUSES,
  type BookingStatus,
  type BookingType,
} from '@/interfaces/booking.interface';
import {
  BOOKING_DAILY_LIMIT,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_UPDATE_TEXT,
  bookingInstant,
  isOutsideBusinessHours,
  parseBookingInput,
  validateBookingTiming,
  type BookingFieldErrors,
  type BookingInput,
} from '@/lib/booking-validation';
import {
  businessLocalToInstant,
  getCurrentBusinessDateParts,
} from '@/lib/business-time';
import { SettingsService } from '@/services/settings-service';
import { StaffNotificationService } from '@/services/staff-notification-service';
import { AuditLogService } from '@/services/audit-log-service';
import {
  notifyBookingReceived,
  notifyBookingUpdate,
} from '@/services/booking-notifier';

export interface BookingActor {
  userId: string;
  email: string;
  role: string;
}

export type CreateBookingResult =
  | { ok: true; booking: IBooking }
  | {
      ok: false;
      code: 'invalid' | 'rate_limited';
      message: string;
      fieldErrors?: BookingFieldErrors;
    };

export interface ListBookingsFilter {
  type?: BookingType | 'all';
  status?: BookingStatus | 'all';
  /** Business-local "YYYY-MM-DD", inclusive. */
  from?: string;
  to?: string;
  limit?: number;
}

/** Start of the current business calendar day, as an instant. */
export function startOfBusinessDay(now: Date = new Date()): Date {
  const { year, month, day } = getCurrentBusinessDateParts(now);
  return businessLocalToInstant(year, month, day, '00:00');
}

export function formatBookingNumber(seq: number): string {
  return `BK-${String(seq).padStart(4, '0')}`;
}

async function nextBookingNumber(): Promise<string> {
  const counter = await BookingCounterModel.findOneAndUpdate(
    { _id: 'booking' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean<{ seq: number }>();
  return formatBookingNumber(counter?.seq ?? 1);
}

function isObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

async function audit(
  actor: BookingActor,
  action:
    | 'booking.status_changed'
    | 'booking.assigned'
    | 'booking.note_added'
    | 'booking.replied',
  booking: { _id: unknown; bookingNumber: string },
  details: Record<string, unknown>
): Promise<void> {
  try {
    await AuditLogService.createLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role,
      action,
      resource: 'booking',
      resourceId: String(booking._id),
      details: { bookingNumber: booking.bookingNumber, ...details },
    });
  } catch (error) {
    console.error('[BookingService] audit log failed:', error);
  }
}

export class BookingService {
  /**
   * AC1/AC2/AC5 — create a booking for a verified customer. The phone and the
   * user come from the session, never from the form. Refuses invalid input and
   * a sixth booking from one phone in a business day. The staff alert and the
   * customer message are best effort and never fail the booking.
   */
  static async createBooking(opts: {
    userId: string;
    phone: string;
    input: unknown;
    now?: Date;
  }): Promise<CreateBookingResult> {
    const now = opts.now ?? new Date();
    const parsed = parseBookingInput(opts.input);
    if (!parsed.ok) {
      return {
        ok: false,
        code: 'invalid',
        message: 'Please correct the highlighted fields.',
        fieldErrors: parsed.errors,
      };
    }
    const data: BookingInput = parsed.data;
    const timing = validateBookingTiming(
      {
        type: data.type,
        date: data.date,
        startTime: data.startTime,
        endTime: data.type === 'event' ? data.endTime : null,
      },
      now
    );
    if (Object.keys(timing).length > 0) {
      return {
        ok: false,
        code: 'invalid',
        message: 'Please correct the highlighted fields.',
        fieldErrors: timing,
      };
    }

    await connectDB();

    // D1 — counted in the database so it survives restarts and instances.
    const todayCount = await BookingModel.countDocuments({
      phone: opts.phone,
      createdAt: { $gte: startOfBusinessDay(now) },
    });
    if (todayCount >= BOOKING_DAILY_LIMIT) {
      return {
        ok: false,
        code: 'rate_limited',
        message: `You have reached the limit of ${BOOKING_DAILY_LIMIT} booking requests for today. Please contact us on WhatsApp if you need more.`,
      };
    }

    let outsideBusinessHours = false;
    if (data.type === 'event') {
      try {
        const settings = await SettingsService.getSettings();
        outsideBusinessHours = isOutsideBusinessHours(
          {
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
          },
          settings.businessHours as never
        );
      } catch (error) {
        console.error('[BookingService] business hours lookup failed:', error);
      }
    }

    const booking = await BookingModel.create({
      bookingNumber: await nextBookingNumber(),
      type: data.type,
      userId: opts.userId,
      name: data.name,
      phone: opts.phone,
      date: data.date,
      startTime: data.startTime,
      endTime: data.type === 'event' ? data.endTime : null,
      startAt: bookingInstant(data.date, data.startTime),
      guests: data.guests,
      purpose: data.type === 'event' ? data.purpose : null,
      wantsDj: data.type === 'event' ? data.wantsDj : null,
      requests: data.requests ?? null,
      outsideBusinessHours,
    });

    // AC5 — one staff alert per booking. `raise` never throws.
    await StaffNotificationService.raise(
      data.type === 'event' ? 'event' : 'booking',
      {
        refModel: 'Booking',
        refId: String(booking._id),
        reference: booking.bookingNumber,
      }
    );
    // AC2 — customer message. `notifyBookingReceived` never throws.
    await notifyBookingReceived(booking);

    return { ok: true, booking };
  }

  static async listBookings(
    filter: ListBookingsFilter = {}
  ): Promise<IBooking[]> {
    await connectDB();
    const query: Record<string, unknown> = {};
    if (filter.type && filter.type !== 'all') query.type = filter.type;
    if (filter.status && filter.status !== 'all') query.status = filter.status;
    if (filter.from || filter.to) {
      const range: Record<string, string> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      query.date = range;
    }
    return BookingModel.find(query)
      .sort({ startAt: 1 })
      .limit(Math.min(filter.limit ?? 200, 500))
      .lean<IBooking[]>();
  }

  static async getBookingById(id: string): Promise<IBooking | null> {
    if (!isObjectId(id)) return null;
    await connectDB();
    return BookingModel.findById(id).lean<IBooking>();
  }

  /** AC6 — owner-scoped read: another customer's id is "not found". */
  static async getBookingForCustomer(
    id: string,
    userId: string
  ): Promise<IBooking | null> {
    if (!isObjectId(id) || !userId) return null;
    await connectDB();
    return BookingModel.findOne({ _id: id, userId }).lean<IBooking>();
  }

  static async listForCustomer(userId: string): Promise<IBooking[]> {
    if (!userId) return [];
    await connectDB();
    return BookingModel.find({ userId })
      .sort({ startAt: -1 })
      .limit(100)
      .lean<IBooking[]>();
  }

  /** AC4 — change status; confirm and decline tell the customer. */
  static async setStatus(opts: {
    id: string;
    status: string;
    actor: BookingActor;
  }): Promise<{ ok: true; booking: IBooking } | { ok: false; error: string }> {
    if (!(BOOKING_STATUSES as readonly string[]).includes(opts.status)) {
      return { ok: false, error: 'Unknown status.' };
    }
    if (!isObjectId(opts.id)) return { ok: false, error: 'Booking not found.' };
    await connectDB();
    const before = await BookingModel.findById(opts.id).lean<IBooking>();
    if (!before) return { ok: false, error: 'Booking not found.' };
    const status = opts.status as BookingStatus;
    if (before.status === status) return { ok: true, booking: before };

    const updated = await BookingModel.findByIdAndUpdate(
      opts.id,
      { $set: { status } },
      { new: true }
    ).lean<IBooking>();
    if (!updated) return { ok: false, error: 'Booking not found.' };

    await audit(opts.actor, 'booking.status_changed', updated, {
      from: before.status,
      to: status,
    });
    const text = BOOKING_STATUS_UPDATE_TEXT[status];
    if (text) await notifyBookingUpdate(updated, text);
    return { ok: true, booking: updated };
  }

  static async assign(opts: {
    id: string;
    assigneeId: string | null;
    actor: BookingActor;
  }): Promise<{ ok: true; booking: IBooking } | { ok: false; error: string }> {
    if (!isObjectId(opts.id)) return { ok: false, error: 'Booking not found.' };
    await connectDB();
    const updated = await BookingModel.findByIdAndUpdate(
      opts.id,
      { $set: { assignedTo: opts.assigneeId || null } },
      { new: true }
    ).lean<IBooking>();
    if (!updated) return { ok: false, error: 'Booking not found.' };
    await audit(opts.actor, 'booking.assigned', updated, {
      assignedTo: opts.assigneeId || null,
    });
    return { ok: true, booking: updated };
  }

  static async addNote(opts: {
    id: string;
    body: string;
    actor: BookingActor;
  }): Promise<{ ok: true; booking: IBooking } | { ok: false; error: string }> {
    const body = opts.body.trim();
    if (!body) return { ok: false, error: 'Write a note first.' };
    if (body.length > 2000) {
      return { ok: false, error: 'Keep the note under 2000 characters.' };
    }
    if (!isObjectId(opts.id)) return { ok: false, error: 'Booking not found.' };
    await connectDB();
    const updated = await BookingModel.findByIdAndUpdate(
      opts.id,
      {
        $push: {
          internalNotes: {
            authorUserId: opts.actor.userId,
            body,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean<IBooking>();
    if (!updated) return { ok: false, error: 'Booking not found.' };
    await audit(opts.actor, 'booking.note_added', updated, {});
    return { ok: true, booking: updated };
  }

  /** AC4 — a staff reply is saved, audit-logged and sent window-aware. */
  static async addStaffReply(opts: {
    id: string;
    body: string;
    actor: BookingActor;
  }): Promise<{ ok: true; booking: IBooking } | { ok: false; error: string }> {
    const body = opts.body.trim();
    if (!body) return { ok: false, error: 'Write a reply first.' };
    if (body.length > 1000) {
      return { ok: false, error: 'Keep the reply under 1000 characters.' };
    }
    if (!isObjectId(opts.id)) return { ok: false, error: 'Booking not found.' };
    await connectDB();
    const updated = await BookingModel.findByIdAndUpdate(
      opts.id,
      {
        $push: {
          replies: {
            authorRole: 'staff',
            authorUserId: opts.actor.userId,
            body,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean<IBooking>();
    if (!updated) return { ok: false, error: 'Booking not found.' };
    await audit(opts.actor, 'booking.replied', updated, {});
    await notifyBookingUpdate(updated, body);
    return { ok: true, booking: updated };
  }
}

export { BOOKING_STATUS_LABELS };
