/**
 * @requirement REQ-WA-020 (REQ-129 AC3) — booking intent replies with the /book link
 * Order, cancel, status and opt-out keep priority; a long message that merely
 * mentions a table or an event stays support text.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));
vi.mock('@/models', () => ({
  UserModel: { findOne: vi.fn(), create: vi.fn(), updateOne: vi.fn() },
  OrderModel: { find: vi.fn(), findOne: vi.fn() },
}));
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: { sendTextMessage: vi.fn(), sendMessage: vi.fn() },
}));

import {
  WhatsAppInboundService,
  bookingLinkReplyText,
  buildBookingUrl,
  isBookingRequest,
} from '@/services/whatsapp-inbound-service';

const text = (body: string) =>
  ({ id: 'm1', from: '2348012345678', type: 'text', text: { body } }) as never;
const intent = (body: string) =>
  WhatsAppInboundService.classifyMessageIntent(text(body));

describe('[AC3] booking intent', () => {
  it.each([
    'book',
    'I want to book a table',
    'Reservation please',
    'do you take event bookings',
    'planning a birthday party',
    'table for 4 on saturday',
    'Hi, can I reserve a table?',
  ])('"%s" gets the booking reply', (body) => {
    expect(intent(body)).toBe('booking');
  });

  it('a long message that mentions a table is support text, not a link', () => {
    expect(
      intent(
        'The table we were given yesterday was wobbly and the waiter ignored us for most of the evening'
      )
    ).toBe('support_text');
  });

  it('keeps cancel, status, order and opt-out ahead of booking', () => {
    expect(intent('cancel my order')).toBe('order_cancel');
    expect(intent('where is my order')).toBe('order_status');
    expect(intent('order')).toBe('order_start');
    expect(intent('stop')).toBe('opt_out');
  });

  it('an ordinary message is still support text', () => {
    expect(intent('my food was cold')).toBe('support_text');
  });

  it('is not triggered by words that only contain a booking word', () => {
    expect(isBookingRequest('notable events')).toBe(false);
    expect(isBookingRequest('')).toBe(false);
  });
});

describe('[AC3] reply text', () => {
  it('contains the environment /book link', () => {
    expect(buildBookingUrl('https://app.example.com/')).toBe(
      'https://app.example.com/book'
    );
    expect(bookingLinkReplyText('https://app.example.com')).toContain(
      'https://app.example.com/book'
    );
  });
});
