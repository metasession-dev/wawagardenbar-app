/**
 * @requirement REQ-BOOK-001 — Table and event booking (REQ-129)
 */
export const BOOKING_TYPES = ['table', 'event'] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const BOOKING_STATUSES = [
  'new',
  'contacted',
  'confirmed',
  'declined',
  'completed',
  'cancelled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingReplyAuthorRole = 'staff' | 'customer';

export interface IBookingReply {
  _id?: unknown;
  authorRole: BookingReplyAuthorRole;
  authorUserId: string | null;
  body: string;
  createdAt: Date;
}

export interface IBookingNote {
  _id?: unknown;
  authorUserId: string;
  body: string;
  createdAt: Date;
}
