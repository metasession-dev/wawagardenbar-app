/**
 * @requirement REQ-126 (AC1, AC2, AC5) — order and status intents, precedence,
 * and the menu link.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));
vi.mock('@/models', () => ({ UserModel: {}, OrderModel: {} }));

import {
  WhatsAppInboundService,
  buildMenuUrl,
  orderLinkReplyText,
} from '@/services/whatsapp-inbound-service';

const text = (body: string) =>
  ({
    from: '2348012345678',
    id: 'wamid.x',
    type: 'text',
    text: { body },
  }) as never;
const quickReply = (title: string, id = 'x') =>
  ({
    from: '2348012345678',
    id: 'wamid.y',
    type: 'interactive',
    interactive: { type: 'button_reply', button_reply: { id, title } },
  }) as never;

const intent = (m: never) => WhatsAppInboundService.classifyMessageIntent(m);

describe('classifyMessageIntent — order and status (REQ-126)', () => {
  it.each([
    'order',
    'Menu',
    'food',
    'drinks',
    'I want to order please',
    'ORDER',
  ])('"%s" is an order request', (body) =>
    expect(intent(text(body))).toBe('order_start')
  );

  it('treats the welcome "Order" quick reply as an order request', () => {
    expect(intent(quickReply('Order'))).toBe('order_start');
  });

  it.each([
    'status',
    'Status of my order?',
    'where is my order',
    "where's my order",
    'track my order',
    'my order WG2611250001 has not arrived',
    'WG2611250001',
  ])('"%s" is a status enquiry', (body) =>
    expect(intent(text(body))).toBe('order_status')
  );

  it('"where is my order" is a status enquiry, not an order request', () => {
    expect(intent(text('where is my order'))).toBe('order_status');
  });

  it('keeps opt-out, opt-in and chat-with-staff ahead of order and status', () => {
    expect(intent(text('STOP'))).toBe('opt_out');
    expect(intent(text('start'))).toBe('opt_in');
    expect(intent(text('💬 Chat with Staff'))).toBe('chat_with_staff');
    expect(intent(quickReply('anything', 'chat_with_staff'))).toBe(
      'chat_with_staff'
    );
  });

  it('leaves ordinary support text alone', () => {
    expect(intent(text('My delivery was cold'))).toBe('support_text');
    expect(intent(text('hello'))).toBe('support_text');
  });

  it.each([
    'my order is late',
    'I want to cancel my order',
    'wrong order delivered to me',
    'hi can I get a menu with the prices of every single drink you sell',
  ])(
    '"%s" mentions an order but is support text, not an order request',
    (body) => {
      expect(intent(text(body))).toBe('support_text');
    }
  );
});

describe('menu link', () => {
  it('builds the environment /menu URL without a double slash', () => {
    expect(buildMenuUrl('https://app.wawagardenbar.com/')).toBe(
      'https://app.wawagardenbar.com/menu'
    );
    expect(buildMenuUrl('https://wawagardenbar-uat.ostendo.io')).toBe(
      'https://wawagardenbar-uat.ostendo.io/menu'
    );
  });

  it('puts the link in the reply text', () => {
    expect(orderLinkReplyText('https://app.wawagardenbar.com')).toContain(
      'https://app.wawagardenbar.com/menu'
    );
  });
});
