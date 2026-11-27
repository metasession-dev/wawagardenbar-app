/**
 * @requirement REQ-BOOK-001 / REQ-BOOK-003 (REQ-129 AC1, AC4, AC5) — booking server actions
 * Customer submit needs a customer session and takes the phone from the
 * account; staff actions are refused on the server for any other role.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('iron-session', () => ({
  getIronSession: async () => session.current,
}));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));

const userFindById = vi.hoisted(() => vi.fn());
vi.mock('@/models', () => ({ UserModel: { findById: userFindById } }));

const createBooking = vi.hoisted(() => vi.fn());
const setStatus = vi.hoisted(() => vi.fn());
const assign = vi.hoisted(() => vi.fn());
const addNote = vi.hoisted(() => vi.fn());
const addStaffReply = vi.hoisted(() => vi.fn());
vi.mock('@/services/booking-service', () => ({
  BookingService: { createBooking, setStatus, assign, addNote, addStaffReply },
}));

import {
  addBookingNoteAction,
  assignBookingAction,
  replyToBookingAction,
  setBookingStatusAction,
  submitBookingAction,
} from '@/app/actions/booking/booking-actions';

const as = (roles: string[], extra: Record<string, unknown> = {}) => {
  session.current = {
    isLoggedIn: true,
    userId: '65a1b2c3d4e5f6a7b8c9d0e4',
    email: 's@example.com',
    role: roles[0],
    roles: roles.filter((r) => r !== 'customer'),
    ...extra,
  };
};

const input = {
  type: 'table',
  name: 'Adaeze Obi',
  date: '2026-12-06',
  startTime: '19:00',
  guests: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  userFindById.mockReturnValue({
    select: () => ({
      lean: async () => ({ phone: '+2348012345678', firstName: 'Adaeze' }),
    }),
  });
  createBooking.mockResolvedValue({
    ok: true,
    booking: { bookingNumber: 'BK-0001', name: 'Adaeze Obi' },
  });
  setStatus.mockResolvedValue({ ok: true });
  assign.mockResolvedValue({ ok: true });
  addNote.mockResolvedValue({ ok: true });
  addStaffReply.mockResolvedValue({ ok: true });
});

describe('[AC1] submitBookingAction', () => {
  it('without a session asks the page to open the PIN form and saves nothing', async () => {
    session.current = { isLoggedIn: false };
    expect(await submitBookingAction(input)).toEqual({
      success: false,
      needsSignIn: true,
    });
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('a guest session is treated as not signed in', async () => {
    as(['customer'], { isGuest: true });
    expect(await submitBookingAction(input)).toMatchObject({
      needsSignIn: true,
    });
  });

  it('a verified customer submits; the phone comes from the account, never the form', async () => {
    as(['customer']);
    const r = await submitBookingAction({ ...input, phone: '+2340000000000' });
    expect(r).toMatchObject({
      success: true,
      bookingNumber: 'BK-0001',
      firstName: 'Adaeze',
    });
    const arg = createBooking.mock.calls[0][0];
    expect(arg.phone).toBe('+2348012345678');
    expect(arg.userId).toBe('65a1b2c3d4e5f6a7b8c9d0e4');
  });

  it('an account with no verified phone is sent to sign in', async () => {
    as(['customer']);
    userFindById.mockReturnValue({
      select: () => ({ lean: async () => ({}) }),
    });
    expect(await submitBookingAction(input)).toMatchObject({
      needsSignIn: true,
    });
  });

  it('a staff session cannot book through the customer form', async () => {
    as(['csr']);
    const r = await submitBookingAction(input);
    expect(r.success).toBe(false);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('returns field errors and the rate-limit message from the service', async () => {
    as(['customer']);
    createBooking.mockResolvedValue({
      ok: false,
      code: 'invalid',
      message: 'Please correct the highlighted fields.',
      fieldErrors: { guests: 'At least 1 guest.' },
    });
    expect(await submitBookingAction(input)).toMatchObject({
      success: false,
      fieldErrors: { guests: 'At least 1 guest.' },
    });
    createBooking.mockResolvedValue({
      ok: false,
      code: 'rate_limited',
      message: 'You have reached the limit',
    });
    expect(await submitBookingAction(input)).toMatchObject({
      success: false,
      error: 'You have reached the limit',
    });
  });
});

const staffCalls = [
  [
    'setBookingStatusAction',
    () => setBookingStatusAction({ id: 'b', status: 'confirmed' }),
  ],
  [
    'assignBookingAction',
    () => assignBookingAction({ id: 'b', assigneeId: 'x' }),
  ],
  ['addBookingNoteAction', () => addBookingNoteAction({ id: 'b', body: 'n' })],
  ['replyToBookingAction', () => replyToBookingAction({ id: 'b', body: 'r' })],
] as const;

describe.each(['kitchen', 'customer'])('[AC4] %s is refused', (role) => {
  beforeEach(() => as([role]));
  it.each(staffCalls)(
    '%s returns Unauthorized and calls nothing',
    async (_n, call) => {
      expect(await call()).toMatchObject({
        success: false,
        error: 'Unauthorized',
      });
      expect(setStatus).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
      expect(addNote).not.toHaveBeenCalled();
      expect(addStaffReply).not.toHaveBeenCalled();
    }
  );
});

it('[AC4] a signed-out visitor is refused', async () => {
  session.current = { isLoggedIn: false };
  expect(
    await setBookingStatusAction({ id: 'b', status: 'confirmed' })
  ).toMatchObject({ success: false, error: 'Unauthorized' });
});

describe.each(['csr', 'manager', 'admin', 'super-admin'])(
  '[AC4] %s may handle bookings',
  (role) => {
    beforeEach(() => as([role]));
    it('passes the actor and the input to the service', async () => {
      expect(
        await setBookingStatusAction({ id: 'b', status: 'confirmed' })
      ).toEqual({ success: true });
      expect(setStatus.mock.calls[0][0]).toMatchObject({
        id: 'b',
        status: 'confirmed',
        actor: { userId: '65a1b2c3d4e5f6a7b8c9d0e4', role },
      });
      await assignBookingAction({ id: 'b', assigneeId: null });
      await addBookingNoteAction({ id: 'b', body: 'n' });
      await replyToBookingAction({ id: 'b', body: 'r' });
      expect(assign).toHaveBeenCalled();
      expect(addNote).toHaveBeenCalled();
      expect(addStaffReply).toHaveBeenCalled();
    });

    it('surfaces a service error', async () => {
      setStatus.mockResolvedValue({ ok: false, error: 'Booking not found.' });
      expect(
        await setBookingStatusAction({ id: 'b', status: 'confirmed' })
      ).toEqual({ success: false, error: 'Booking not found.' });
    });
  }
);
