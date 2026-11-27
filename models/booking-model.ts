/**
 * @requirement REQ-BOOK-001 — Table and event booking (REQ-129)
 *
 * A booking is an enquiry: no payment, no table allocation. Replies and
 * internal notes are embedded arrays (one booking = one document), the same
 * shape as `SupportTicket`. `date` is the business-local calendar day
 * ("YYYY-MM-DD"), `startTime`/`endTime` are business-local "HH:mm", and
 * `startAt` is the matching instant so lists sort and filter on one field.
 */
import { Schema, model, models, type Model, type Document } from 'mongoose';
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  type BookingStatus,
  type BookingType,
  type IBookingNote,
  type IBookingReply,
} from '@/interfaces/booking.interface';

export interface IBooking extends Document {
  bookingNumber: string;
  type: BookingType;
  userId: string;
  name: string;
  phone: string;
  /** Business-local calendar day, "YYYY-MM-DD". */
  date: string;
  startTime: string;
  endTime: string | null;
  startAt: Date;
  guests: number;
  purpose: string | null;
  wantsDj: boolean | null;
  requests: string | null;
  /** Event outside the business's opening hours (allowed, flagged for staff). */
  outsideBusinessHours: boolean;
  status: BookingStatus;
  assignedTo: string | null;
  internalNotes: IBookingNote[];
  replies: IBookingReply[];
  /** When the customer last wrote on WhatsApp about this booking (reply window fallback). */
  lastCustomerMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IBookingReply>(
  {
    authorRole: { type: String, enum: ['staff', 'customer'], required: true },
    authorUserId: { type: String, default: null },
    body: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const noteSchema = new Schema<IBookingNote>(
  {
    authorUserId: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: BOOKING_TYPES, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, default: null },
    startAt: { type: Date, required: true, index: true },
    guests: { type: Number, required: true, min: 1, max: 500 },
    purpose: { type: String, default: null },
    wantsDj: { type: Boolean, default: null },
    requests: { type: String, default: null },
    outsideBusinessHours: { type: Boolean, default: false },
    status: { type: String, enum: BOOKING_STATUSES, default: 'new' },
    assignedTo: { type: String, default: null },
    internalNotes: { type: [noteSchema], default: [] },
    replies: { type: [replySchema], default: [] },
    lastCustomerMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ status: 1, startAt: 1 });
bookingSchema.index({ type: 1, startAt: 1 });
bookingSchema.index({ phone: 1, createdAt: -1 });

const BookingModel: Model<IBooking> =
  (models.Booking as Model<IBooking> | undefined) ||
  model<IBooking>('Booking', bookingSchema);

export default BookingModel;

/** Atomic per-system sequence behind `BK-0001`. `_id` is the sequence name. */
interface IBookingCounter {
  _id: string;
  seq: number;
}

const bookingCounterSchema = new Schema<IBookingCounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

export const BookingCounterModel: Model<IBookingCounter> =
  (models.BookingCounter as Model<IBookingCounter> | undefined) ||
  model<IBookingCounter>('BookingCounter', bookingCounterSchema);
