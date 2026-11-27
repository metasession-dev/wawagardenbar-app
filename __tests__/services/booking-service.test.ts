/**
 * @requirement REQ-BOOK-001/002/003/004 (REQ-129 AC1, AC2, AC4, AC5, AC6) — BookingService
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const count = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const findById = vi.hoisted(() => vi.fn());
const findOne = vi.hoisted(() => vi.fn());
const findByIdAndUpdate = vi.hoisted(() => vi.fn());
const find = vi.hoisted(() => vi.fn());
const counterUpdate = vi.hoisted(() => vi.fn());
const raise = vi.hoisted(() => vi.fn());
const createLog = vi.hoisted(() => vi.fn());
const notifyReceived = vi.hoisted(() => vi.fn());
const notifyUpdate = vi.hoisted(() => vi.fn());
const getSettings = vi.hoisted(() => vi.fn());

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models/booking-model', () => ({
  default: {
    countDocuments: count,
    create,
    findById,
    findOne,
    findByIdAndUpdate,
    find,
  },
  BookingCounterModel: { findOneAndUpdate: counterUpdate },
}));
vi.mock('@/services/settings-service', () => ({
  SettingsService: { getSettings },
}));
vi.mock('@/services/staff-notification-service', () => ({
  StaffNotificationService: { raise },
}));
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog },
}));
vi.mock('@/services/booking-notifier', () => ({
  notifyBookingReceived: notifyReceived,
  notifyBookingUpdate: notifyUpdate,
}));

import {
  BookingService,
  formatBookingNumber,
} from '@/services/booking-service';

const NOW = new Date('2026-12-01T10:00:00Z');
const OID = '65f0c0ffee65f0c0ffee0001';
const actor = { userId: 'staff1', email: 's@x.com', role: 'csr' };

const lean = <T>(v: T) => ({ lean: async () => v });

const tableInput = (o: Record<string, unknown> = {}) => ({
  type: 'table',
  name: 'Adaeze Obi',
  date: '2026-12-06',
  startTime: '19:00',
  guests: 4,
  ...o,
});
const eventInput = (o: Record<string, unknown> = {}) => ({
  type: 'event',
  name: 'Adaeze Obi',
  date: '2026-12-20',
  startTime: '16:00',
  endTime: '22:00',
  guests: 60,
  purpose: 'Birthday',
  wantsDj: true,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  count.mockResolvedValue(0);
  counterUpdate.mockReturnValue(lean({ seq: 1 }));
  create.mockImplementation(async (doc: Record<string, unknown>) => ({
    _id: OID,
    ...doc,
  }));
  getSettings.mockResolvedValue({
    businessHours: {
      saturday: { open: '11:00', close: '23:00', closed: false },
    },
  });
  raise.mockResolvedValue(null);
  notifyReceived.mockResolvedValue({ sent: true });
  notifyUpdate.mockResolvedValue({ sent: true });
  createLog.mockResolvedValue({});
});

describe('formatBookingNumber', () => {
  it('pads to four digits and grows beyond', () => {
    expect(formatBookingNumber(1)).toBe('BK-0001');
    expect(formatBookingNumber(12345)).toBe('BK-12345');
  });
});

describe('[AC1] createBooking', () => {
  it('saves a table with the phone from the account, not the form', async () => {
    const r = await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: tableInput({ phone: '+2340000000000' }),
      now: NOW,
    });
    expect(r.ok).toBe(true);
    const saved = create.mock.calls[0][0];
    expect(saved.phone).toBe('+2348012345678');
    expect(saved.userId).toBe('u1');
    expect(saved.bookingNumber).toBe('BK-0001');
    expect(saved.type).toBe('table');
    expect(saved.endTime).toBeNull();
    expect(saved.purpose).toBeNull();
    expect(saved.startAt).toBeInstanceOf(Date);
  });

  it('saves an event with its extra fields', async () => {
    const r = await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: eventInput(),
      now: NOW,
    });
    expect(r.ok).toBe(true);
    const saved = create.mock.calls[0][0];
    expect(saved).toMatchObject({
      type: 'event',
      endTime: '22:00',
      purpose: 'Birthday',
      wantsDj: true,
    });
  });

  it('refuses invalid input with field messages and saves nothing', async () => {
    const r = await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: tableInput({ guests: 0 }),
      now: NOW,
    });
    expect(r).toMatchObject({ ok: false, code: 'invalid' });
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a date that has passed', async () => {
    const r = await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: tableInput({ date: '2026-11-30' }),
      now: NOW,
    });
    expect(r).toMatchObject({ ok: false, code: 'invalid' });
    if (!r.ok) expect(r.fieldErrors?.date).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses an event ending before it starts', async () => {
    const r = await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: eventInput({ endTime: '15:00' }),
      now: NOW,
    });
    expect(r).toMatchObject({ ok: false, code: 'invalid' });
    if (!r.ok) expect(r.fieldErrors?.endTime).toBeTruthy();
  });

  it('allows five a day and refuses the sixth, counting in the database', async () => {
    count.mockResolvedValue(4);
    expect(
      (
        await BookingService.createBooking({
          userId: 'u1',
          phone: '+2348012345678',
          input: tableInput(),
          now: NOW,
        })
      ).ok
    ).toBe(true);
    count.mockResolvedValue(5);
    const r = await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: tableInput(),
      now: NOW,
    });
    expect(r).toMatchObject({ ok: false, code: 'rate_limited' });
    expect(count.mock.calls[0][0].phone).toBe('+2348012345678');
    expect(count.mock.calls[0][0].createdAt.$gte).toBeInstanceOf(Date);
  });

  it('flags an event outside business hours but still saves it', async () => {
    const r = await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: eventInput({
        date: '2026-12-19',
        startTime: '20:00',
        endTime: '23:59',
      }),
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect(create.mock.calls[0][0].outsideBusinessHours).toBe(true);
  });
});

describe('[AC2][AC5] side effects never fail the booking', () => {
  it('raises a booking alert for a table and an event alert for an event, and messages the customer', async () => {
    await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: tableInput(),
      now: NOW,
    });
    expect(raise).toHaveBeenCalledWith('booking', {
      refModel: 'Booking',
      refId: OID,
      reference: 'BK-0001',
    });
    expect(notifyReceived).toHaveBeenCalledTimes(1);

    await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: eventInput(),
      now: NOW,
    });
    expect(raise.mock.calls[1][0]).toBe('event');
  });

  it('still returns ok when the alert returns nothing (it swallows its own errors)', async () => {
    raise.mockResolvedValue(null);
    const r = await BookingService.createBooking({
      userId: 'u1',
      phone: '+2348012345678',
      input: tableInput(),
      now: NOW,
    });
    expect(r.ok).toBe(true);
  });
});

describe('[AC4] staff handling', () => {
  const booking = (o: Record<string, unknown> = {}) => ({
    _id: OID,
    bookingNumber: 'BK-0001',
    userId: 'u1',
    status: 'new',
    ...o,
  });

  it('confirming sets the status, audit-logs it and tells the customer', async () => {
    findById.mockReturnValue(lean(booking()));
    findByIdAndUpdate.mockReturnValue(lean(booking({ status: 'confirmed' })));
    const r = await BookingService.setStatus({
      id: OID,
      status: 'confirmed',
      actor,
    });
    expect(r.ok).toBe(true);
    expect(createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'booking.status_changed',
        resource: 'booking',
        resourceId: OID,
        details: expect.objectContaining({ from: 'new', to: 'confirmed' }),
      })
    );
    expect(notifyUpdate).toHaveBeenCalledTimes(1);
    expect(notifyUpdate.mock.calls[0][1]).toMatch(/confirmed/);
  });

  it('declining tells the customer too', async () => {
    findById.mockReturnValue(lean(booking()));
    findByIdAndUpdate.mockReturnValue(lean(booking({ status: 'declined' })));
    await BookingService.setStatus({ id: OID, status: 'declined', actor });
    expect(notifyUpdate.mock.calls[0][1]).toMatch(/unable/);
  });

  it('a quiet status change (contacted) is logged but sends nothing', async () => {
    findById.mockReturnValue(lean(booking()));
    findByIdAndUpdate.mockReturnValue(lean(booking({ status: 'contacted' })));
    await BookingService.setStatus({ id: OID, status: 'contacted', actor });
    expect(createLog).toHaveBeenCalled();
    expect(notifyUpdate).not.toHaveBeenCalled();
  });

  it('the same status again changes nothing and logs nothing', async () => {
    findById.mockReturnValue(lean(booking({ status: 'confirmed' })));
    const r = await BookingService.setStatus({
      id: OID,
      status: 'confirmed',
      actor,
    });
    expect(r.ok).toBe(true);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
    expect(createLog).not.toHaveBeenCalled();
  });

  it('refuses an unknown status and a bad id', async () => {
    expect(
      await BookingService.setStatus({ id: OID, status: 'maybe', actor })
    ).toMatchObject({ ok: false });
    expect(
      await BookingService.setStatus({ id: 'nope', status: 'new', actor })
    ).toMatchObject({ ok: false, error: 'Booking not found.' });
  });

  it('assigning is audit-logged', async () => {
    findByIdAndUpdate.mockReturnValue(lean(booking({ assignedTo: 'staff2' })));
    await BookingService.assign({ id: OID, assigneeId: 'staff2', actor });
    expect(createLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'booking.assigned' })
    );
  });

  it('a note needs text, is capped, and is audit-logged without its text', async () => {
    expect(
      await BookingService.addNote({ id: OID, body: '  ', actor })
    ).toMatchObject({ ok: false });
    expect(
      await BookingService.addNote({ id: OID, body: 'x'.repeat(2001), actor })
    ).toMatchObject({ ok: false });
    findByIdAndUpdate.mockReturnValue(lean(booking()));
    await BookingService.addNote({ id: OID, body: 'Call after 5pm', actor });
    const log = createLog.mock.calls[0][0];
    expect(log.action).toBe('booking.note_added');
    expect(JSON.stringify(log.details)).not.toContain('Call after');
  });

  it('a reply is saved, audit-logged and sent to the customer', async () => {
    findByIdAndUpdate.mockReturnValue(lean(booking()));
    const r = await BookingService.addStaffReply({
      id: OID,
      body: 'We have a table at 7pm.',
      actor,
    });
    expect(r.ok).toBe(true);
    expect(createLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'booking.replied' })
    );
    expect(notifyUpdate.mock.calls[0][1]).toBe('We have a table at 7pm.');
    expect(
      await BookingService.addStaffReply({ id: OID, body: ' ', actor })
    ).toMatchObject({ ok: false });
  });
});

describe('[AC6] customer reads are owner-scoped', () => {
  it('queries by id AND owner together', async () => {
    findOne.mockReturnValue(lean(null));
    expect(await BookingService.getBookingForCustomer(OID, 'u2')).toBeNull();
    expect(findOne).toHaveBeenCalledWith({ _id: OID, userId: 'u2' });
  });

  it('a malformed id or empty user never queries', async () => {
    expect(await BookingService.getBookingForCustomer('nope', 'u1')).toBeNull();
    expect(await BookingService.getBookingForCustomer(OID, '')).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it("lists only the signed-in customer's bookings", async () => {
    const limit = vi.fn().mockReturnValue(lean([{ _id: OID }]));
    find.mockReturnValue({ sort: () => ({ limit }) });
    const rows = await BookingService.listForCustomer('u1');
    expect(find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(rows).toHaveLength(1);
    expect(await BookingService.listForCustomer('')).toEqual([]);
  });
});
