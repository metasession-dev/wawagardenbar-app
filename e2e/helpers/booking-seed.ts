/**
 * @requirement REQ-129 — seed and cleanup helpers for the booking specs.
 *
 * Bookings are written with the raw Mongo driver (the same pattern as
 * `refund-seed.ts`) so a spec can set up "a booking that already exists"
 * without driving the form, and everything a booking leaves behind (alerts,
 * messages, audit rows, support tickets) is removed afterwards.
 */
import { ObjectId } from 'mongodb';
import type { Page } from '@playwright/test';
import { withMongo } from './db-assertions';
import { waitForHydration } from './hydration';

/** A business-local "YYYY-MM-DD" `daysAhead` days from today (at least a week keeps it in the future in any zone). */
export function futureDate(daysAhead = 14): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

let seq = 0;

export interface SeedBookingOptions {
  userId: string;
  phone: string;
  type?: 'table' | 'event';
  name?: string;
  date?: string;
  startTime?: string;
  endTime?: string | null;
  guests?: number;
  purpose?: string | null;
  wantsDj?: boolean | null;
  status?: string;
  outsideBusinessHours?: boolean;
  createdAt?: Date;
}

/** Insert a booking directly; returns its id and number. */
export async function seedBooking(
  opts: SeedBookingOptions
): Promise<{ id: string; bookingNumber: string }> {
  seq += 1;
  const type = opts.type ?? 'table';
  const date = opts.date ?? futureDate(14);
  const startTime = opts.startTime ?? '19:00';
  const bookingNumber = `BK-E2E${Date.now().toString(36).toUpperCase()}${seq}`;
  const now = opts.createdAt ?? new Date();
  const id = await withMongo(async (db) => {
    const result = await db.collection('bookings').insertOne({
      bookingNumber,
      type,
      userId: opts.userId,
      name: opts.name ?? 'E2E Booker',
      phone: opts.phone,
      date,
      startTime,
      endTime: type === 'event' ? (opts.endTime ?? '22:00') : null,
      startAt: new Date(`${date}T${startTime}:00+01:00`),
      guests: opts.guests ?? 4,
      purpose: type === 'event' ? (opts.purpose ?? 'E2E party') : null,
      wantsDj: type === 'event' ? (opts.wantsDj ?? false) : null,
      requests: null,
      outsideBusinessHours: opts.outsideBusinessHours ?? false,
      status: opts.status ?? 'new',
      assignedTo: null,
      internalNotes: [],
      replies: [],
      lastCustomerMessageAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return String(result.insertedId);
  });
  return { id, bookingNumber };
}

export async function bookingsFor(userId: string): Promise<any[]> {
  return withMongo((db) =>
    db.collection('bookings').find({ userId }).sort({ createdAt: 1 }).toArray()
  );
}

export async function readBooking(id: string): Promise<any | null> {
  return withMongo((db) =>
    db.collection('bookings').findOne({ _id: new ObjectId(id) })
  );
}

export async function notificationLogsFor(
  userId: string,
  templateKey: string
): Promise<any[]> {
  return withMongo((db) =>
    db
      .collection('notificationlogs')
      .find({ userId, templateKey })
      .sort({ createdAt: 1 })
      .toArray()
  );
}

export async function staffAlertsFor(refIds: string[]): Promise<any[]> {
  return withMongo((db) =>
    db
      .collection('staffnotifications')
      .find({ refId: { $in: refIds } })
      .toArray()
  );
}

export async function bookingAuditRows(
  bookingId: string,
  action?: string
): Promise<any[]> {
  return withMongo((db) =>
    db
      .collection('auditlogs')
      .find({ resourceId: bookingId, ...(action ? { action } : {}) })
      .toArray()
  );
}

/** Remove bookings of these users and everything they produced. */
export async function cleanupBookings(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await withMongo(async (db) => {
    const bookings = await db
      .collection('bookings')
      .find({ userId: { $in: userIds } })
      .project({ _id: 1 })
      .toArray();
    const ids = bookings.map((b: { _id: ObjectId }) => String(b._id));
    await db.collection('bookings').deleteMany({ userId: { $in: userIds } });
    await db
      .collection('staffnotifications')
      .deleteMany({ refId: { $in: ids } });
    await db.collection('auditlogs').deleteMany({ resourceId: { $in: ids } });
    await db
      .collection('notificationlogs')
      .deleteMany({ userId: { $in: userIds } });
  });
}

/**
 * Open /book and wait for the form to hydrate: a `fill()` before React
 * hydrates the controlled inputs is reset to their initial state.
 */
export async function gotoBookPage(page: Page): Promise<void> {
  await page.goto('/book');
  await waitForHydration(page, '[data-testid="booking-date"]');
}
