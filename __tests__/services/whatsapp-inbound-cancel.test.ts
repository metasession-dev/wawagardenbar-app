/**
 * @requirement REQ-WA-019 (REQ-128 AC2, AC5) — cancel by WhatsApp
 * Only a short imperative cancels; orders come from the sender's own user
 * only; a supplied order number can never reach someone else's order.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderFind = vi.hoisted(() => vi.fn());
const sendText = vi.hoisted(() => vi.fn());
const cancelPaid = vi.hoisted(() => vi.fn());

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));
vi.mock('@/models', () => ({
  UserModel: { findOne: vi.fn(), create: vi.fn(), updateOne: vi.fn() },
  OrderModel: { find: (...a: unknown[]) => orderFind(...a), findOne: vi.fn() },
}));
vi.mock('@/lib/whatsapp', () => ({
  WhatsAppService: { sendTextMessage: sendText, sendMessage: vi.fn() },
}));
vi.mock('@/services/refund-service', () => ({
  RefundService: { cancelPaidOrderForCustomer: cancelPaid },
}));

import {
  WhatsAppInboundService,
  CANCEL_NO_ORDER_TEXT,
  CANCEL_REQUEST_TEXT,
} from '@/services/whatsapp-inbound-service';

const text = (body: string) =>
  ({ id: 'm1', from: '2348012345678', type: 'text', text: { body } }) as never;
const intent = (body: string) =>
  WhatsAppInboundService.classifyMessageIntent(text(body));

const USER = '65a1b2c3d4e5f6a7b8c9d0e2';
const candidates = (rows: Array<[string, string]>) => ({
  sort: () => ({
    limit: () => ({
      select: () => ({
        lean: async () => rows.map(([id, n]) => ({ _id: id, orderNumber: n })),
      }),
    }),
  }),
});
const handle = (body: string | null, userId: string | null = USER) =>
  (
    WhatsAppInboundService as unknown as {
      handleCancel: (
        f: string,
        b: string | null,
        u: string | null
      ) => Promise<string>;
    }
  ).handleCancel('2348012345678', body, userId);

beforeEach(() => {
  vi.clearAllMocks();
  sendText.mockResolvedValue({ success: true });
  cancelPaid.mockResolvedValue({
    ok: true,
    outcome: 'cancelled_refund_started',
    refund: {},
  });
});

describe('classification', () => {
  it.each([
    'cancel',
    'Cancel',
    'cancel my order',
    'please cancel order',
    'cancel WG2611260001',
    'Cancel.',
    'cancel #WG2611260001',
  ])('"%s" is a cancel', (t) => expect(intent(t)).toBe('order_cancel'));

  it.each([
    'can I cancel?',
    'how do I cancel my order',
    "don't cancel it",
    'I want to cancel but wait',
    'when will my order arrive',
  ])('"%s" is not a cancel', (t) => expect(intent(t)).not.toBe('order_cancel'));

  it('STOP still opts out and a status enquiry is still a status enquiry', () => {
    expect(intent('stop')).toBe('opt_out');
    expect(intent('where is my order')).toBe('order_status');
  });
});

describe('handleCancel', () => {
  it('[AC2] one active paid order: cancels it for the sender', async () => {
    orderFind.mockReturnValue(candidates([['o1', 'WG2611260001']]));
    const tag = await handle('cancel');
    expect(cancelPaid).toHaveBeenCalledWith({
      orderId: 'o1',
      customerUserId: USER,
      channel: 'whatsapp',
    });
    expect(tag).toBe('cancelled_refund_started');
    // the confirmation is the order_cancelled message sent by the refund flow
    expect(sendText).not.toHaveBeenCalled();
  });

  it("orders are looked up for the sender's user only", async () => {
    orderFind.mockReturnValue(candidates([['o1', 'WG2611260001']]));
    await handle('cancel');
    expect(orderFind.mock.calls[0][0]).toMatchObject({
      userId: USER,
      origin: 'customer',
      paymentStatus: 'paid',
    });
  });

  it("[AC2] another customer's order number reveals nothing and cancels nothing", async () => {
    orderFind.mockReturnValue(candidates([['o1', 'WG2611260001']]));
    const tag = await handle('cancel WG2611269999');
    expect(cancelPaid).not.toHaveBeenCalled();
    expect(sendText).toHaveBeenCalledWith(
      '2348012345678',
      CANCEL_NO_ORDER_TEXT
    );
    expect(tag).toBe('cancel_no_order');
  });

  it('several active orders: asks which one and cancels none', async () => {
    orderFind.mockReturnValue(
      candidates([
        ['o1', 'WG2611260001'],
        ['o2', 'WG2611260002'],
      ])
    );
    const tag = await handle('cancel');
    expect(cancelPaid).not.toHaveBeenCalled();
    expect(sendText.mock.calls[0][1]).toContain('WG2611260001');
    expect(sendText.mock.calls[0][1]).toContain('WG2611260002');
    expect(tag).toBe('cancel_choose_order');
  });

  it('several active orders and a number: cancels that one', async () => {
    orderFind.mockReturnValue(
      candidates([
        ['o1', 'WG2611260001'],
        ['o2', 'WG2611260002'],
      ])
    );
    await handle('cancel WG2611260002');
    expect(cancelPaid).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'o2' })
    );
  });

  it('no account or no active paid order: the same neutral reply', async () => {
    expect(await handle('cancel', null)).toBe('cancel_no_order');
    orderFind.mockReturnValue(candidates([]));
    expect(await handle('cancel')).toBe('cancel_no_order');
    expect(cancelPaid).not.toHaveBeenCalled();
  });

  it('[AC3] after preparation the customer is told it went to the manager', async () => {
    orderFind.mockReturnValue(candidates([['o1', 'WG2611260001']]));
    cancelPaid.mockResolvedValueOnce({
      ok: true,
      outcome: 'refund_request_created',
      ticketId: 't',
    });
    const tag = await handle('cancel');
    expect(sendText).toHaveBeenCalledWith('2348012345678', CANCEL_REQUEST_TEXT);
    expect(tag).toBe('cancel_request_created');
  });

  it('a refused cancel gets a short helpful reply', async () => {
    orderFind.mockReturnValue(candidates([['o1', 'WG2611260001']]));
    cancelPaid.mockResolvedValueOnce({
      ok: false,
      code: 'wrong_status',
      error: 'x',
    });
    expect(await handle('cancel')).toBe('cancel_wrong_status');
    expect(sendText).toHaveBeenCalled();
  });
});
