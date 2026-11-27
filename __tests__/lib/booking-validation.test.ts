/**
 * @requirement REQ-BOOK-001 (REQ-129 AC1) — booking form validation
 */
import { describe, expect, it } from 'vitest';
import {
  BOOKING_DAILY_LIMIT,
  isOutsideBusinessHours,
  parseBookingInput,
  validateBookingTiming,
} from '@/lib/booking-validation';

const NOW = new Date('2026-12-01T10:00:00Z'); // 11:00 in Africa/Lagos

const table = (o: Record<string, unknown> = {}) => ({
  type: 'table',
  name: 'Adaeze Obi',
  date: '2026-12-06',
  startTime: '19:00',
  guests: '4',
  requests: '',
  ...o,
});

const event = (o: Record<string, unknown> = {}) => ({
  type: 'event',
  name: 'Adaeze Obi',
  date: '2026-12-20',
  startTime: '16:00',
  endTime: '22:00',
  guests: 60,
  purpose: 'Birthday',
  wantsDj: true,
  requests: 'Balloons',
  ...o,
});

describe('[AC1] parseBookingInput', () => {
  it('accepts a table with only the table fields (guests coerced from text)', () => {
    const r = parseBookingInput(table());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.type).toBe('table');
      expect(r.data.guests).toBe(4);
    }
  });

  it('accepts an event with purpose, DJ, end time and requests', () => {
    const r = parseBookingInput(event());
    expect(r.ok).toBe(true);
    if (r.ok && r.data.type === 'event') {
      expect(r.data.purpose).toBe('Birthday');
      expect(r.data.wantsDj).toBe(true);
      expect(r.data.endTime).toBe('22:00');
    }
  });

  it('requires the event-only fields for an event', () => {
    const r = parseBookingInput(
      event({ purpose: '', endTime: undefined, wantsDj: undefined })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors)).toEqual(
        expect.arrayContaining(['purpose', 'endTime', 'wantsDj'])
      );
    }
  });

  it('does not require them for a table', () => {
    expect(parseBookingInput(table({ purpose: undefined })).ok).toBe(true);
  });

  it.each([0, -3, 501, 'abc', 2.5])('refuses guests = %s', (guests) => {
    const r = parseBookingInput(table({ guests }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.guests).toBeTruthy();
  });

  it.each([1, 500])('accepts the limits (guests = %s)', (guests) => {
    expect(parseBookingInput(table({ guests })).ok).toBe(true);
  });

  it('refuses an empty name and an unknown type', () => {
    expect(parseBookingInput(table({ name: '  ' })).ok).toBe(false);
    expect(parseBookingInput(table({ type: 'wedding' })).ok).toBe(false);
  });

  it('caps free text', () => {
    expect(parseBookingInput(table({ requests: 'x'.repeat(1001) })).ok).toBe(
      false
    );
  });
});

describe('[AC1] validateBookingTiming', () => {
  it('refuses a start in the past, in business time', () => {
    const errors = validateBookingTiming(
      { type: 'table', date: '2026-12-01', startTime: '10:30' },
      NOW
    );
    expect(errors.date).toMatch(/not passed/);
  });

  it('accepts a start later today and any future day', () => {
    expect(
      validateBookingTiming(
        { type: 'table', date: '2026-12-01', startTime: '12:00' },
        NOW
      )
    ).toEqual({});
    expect(
      validateBookingTiming(
        { type: 'table', date: '2027-01-15', startTime: '08:00' },
        NOW
      )
    ).toEqual({});
  });

  it('refuses an event that ends before or when it starts', () => {
    expect(
      validateBookingTiming(
        {
          type: 'event',
          date: '2026-12-20',
          startTime: '16:00',
          endTime: '15:00',
        },
        NOW
      ).endTime
    ).toBeTruthy();
    expect(
      validateBookingTiming(
        {
          type: 'event',
          date: '2026-12-20',
          startTime: '16:00',
          endTime: '16:00',
        },
        NOW
      ).endTime
    ).toBeTruthy();
  });

  it('does not check an end time for a table', () => {
    expect(
      validateBookingTiming(
        {
          type: 'table',
          date: '2026-12-20',
          startTime: '16:00',
          endTime: '10:00',
        },
        NOW
      )
    ).toEqual({});
  });
});

describe('[AC1] isOutsideBusinessHours (flag, never a refusal)', () => {
  const hours = {
    saturday: { open: '11:00', close: '23:00', closed: false },
    sunday: { open: '11:00', close: '23:00', closed: true },
  };
  it('is false inside the opening hours', () => {
    expect(
      isOutsideBusinessHours(
        { date: '2026-12-05', startTime: '14:00', endTime: '20:00' },
        hours
      )
    ).toBe(false);
  });
  it('is true when it ends after closing or starts before opening', () => {
    expect(
      isOutsideBusinessHours(
        { date: '2026-12-05', startTime: '14:00', endTime: '23:30' },
        hours
      )
    ).toBe(true);
    expect(
      isOutsideBusinessHours({ date: '2026-12-05', startTime: '09:00' }, hours)
    ).toBe(true);
  });
  it('is true on a closed day and false when hours are unknown', () => {
    expect(
      isOutsideBusinessHours({ date: '2026-12-06', startTime: '14:00' }, hours)
    ).toBe(true);
    expect(
      isOutsideBusinessHours(
        { date: '2026-12-06', startTime: '14:00' },
        undefined
      )
    ).toBe(false);
  });
});

it('[AC1] the daily limit is five', () => {
  expect(BOOKING_DAILY_LIMIT).toBe(5);
});
