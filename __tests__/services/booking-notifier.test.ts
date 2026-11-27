/**
 * @requirement REQ-BOOK-002 / REQ-WA-020 (REQ-129 AC2, AC7) — booking messages
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());
const resolveMode = vi.hoisted(() => vi.fn());
const userFindById = vi.hoisted(() => vi.fn());

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models', () => ({ UserModel: { findById: userFindById } }));
vi.mock('@/services/notification-service', () => ({
  NotificationService: { send },
}));
vi.mock('@/services/order-status-notifier', () => ({ resolveMode }));

import {
  formatTime12,
  formatWhen,
  guestsText,
  notifyBookingReceived,
  notifyBookingUpdate,
} from '@/services/booking-notifier';
import {
  HELD_UNTIL_APPROVED_TEMPLATES,
  TEMPLATE_CATEGORIES,
} from '@/lib/notification-templates';

const booking = {
  _id: '65f0c0ffee65f0c0ffee0001',
  userId: 'u1',
  type: 'table' as const,
  name: 'Adaeze Obi',
  guests: 4,
  date: '2026-12-06',
  startTime: '19:00',
  bookingNumber: 'BK-0001',
};

beforeEach(() => {
  vi.clearAllMocks();
  userFindById.mockReturnValue({
    select: () => ({ lean: async () => ({ firstName: 'Adaeze' }) }),
  });
  resolveMode.mockResolvedValue('template');
  send.mockResolvedValue({ success: true, attempts: [] });
});

describe('wording', () => {
  it('formats the time, the date and the guests', () => {
    expect(formatTime12('19:00')).toBe('7:00 PM');
    expect(formatTime12('00:30')).toBe('12:30 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatWhen('2026-12-06', '19:00')).toBe('Sun 6 Dec at 7:00 PM');
    expect(guestsText(1)).toBe('1 guest');
    expect(guestsText(4)).toBe('4 guests');
  });
});

describe('[AC2] booking_received', () => {
  it('outside the window: the template with five body variables', async () => {
    const r = await notifyBookingReceived(booking);
    expect(r.sent).toBe(true);
    const arg = send.mock.calls[0][0];
    expect(arg.templateKey).toBe('booking_received');
    expect(arg.userId).toBe('u1');
    expect(arg.whatsapp.params).toEqual([
      'Adaeze',
      'table',
      '4 guests',
      'Sun 6 Dec at 7:00 PM',
      'BK-0001',
    ]);
    expect(arg.whatsapp.freeFormText).toBeUndefined();
  });

  it('inside the window: free-form text with the reference and the promise', async () => {
    resolveMode.mockResolvedValue('free_form');
    await notifyBookingReceived(booking);
    const text = send.mock.calls[0][0].whatsapp.freeFormText as string;
    expect(text).toContain('BK-0001');
    expect(text).toContain("We'll get back to you shortly");
  });

  it('never throws and reports not sent when messaging fails', async () => {
    send.mockRejectedValue(new Error('boom'));
    await expect(notifyBookingReceived(booking)).resolves.toEqual({
      sent: false,
    });
  });
});

describe('[AC4] booking_update', () => {
  it('carries the booking id for the View booking button', async () => {
    await notifyBookingUpdate(booking, 'Good news: your booking is confirmed.');
    const arg = send.mock.calls[0][0];
    expect(arg.templateKey).toBe('booking_update');
    expect(arg.whatsapp.params).toEqual([
      'Adaeze',
      'BK-0001',
      'Good news: your booking is confirmed.',
    ]);
    expect(arg.whatsapp.buttonParams).toEqual([
      { index: 0, params: ['65f0c0ffee65f0c0ffee0001'] },
    ]);
  });

  it('strips newlines from the variable so Meta accepts it', async () => {
    await notifyBookingUpdate(booking, 'Line one\n\nLine two\tend');
    expect(send.mock.calls[0][0].whatsapp.params[2]).toBe(
      'Line one Line two end'
    );
  });
});

describe('[AC7] template wiring', () => {
  it.each(['booking_received', 'booking_update'])(
    '%s is transactional and held until approved',
    (key) => {
      expect(TEMPLATE_CATEGORIES[key]).toBe('transactional');
      expect(HELD_UNTIL_APPROVED_TEMPLATES.has(key)).toBe(true);
    }
  );
});
