/**
 * @requirement REQ-WA-019 (REQ-128 AC5, AC7) — cancellation and refund messages
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());
const orderFindById = vi.hoisted(() => vi.fn());
const resolveMode = vi.hoisted(() => vi.fn());

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models', () => ({ OrderModel: { findById: orderFindById } }));
vi.mock('@/services/notification-service', () => ({
  NotificationService: { send },
}));
vi.mock('@/services/order-status-notifier', () => ({ resolveMode }));

import {
  cancelledSentence,
  formatNaira,
  notifyOrderCancelled,
  notifyRefundProcessed,
} from '@/services/refund-notifier';
import {
  TEMPLATE_CATEGORIES,
  HELD_UNTIL_APPROVED_TEMPLATES,
} from '@/lib/notification-templates';
import { LOCKED_WHATSAPP_TEMPLATES } from '@/lib/whatsapp-notification-catalogue';

const order = (o: Record<string, unknown> = {}) => ({
  select: () => ({
    lean: async () => ({
      orderNumber: 'WG2611260001',
      origin: 'customer',
      userId: 'u1',
      ...o,
    }),
  }),
});

beforeEach(() => {
  vi.clearAllMocks();
  orderFindById.mockReturnValue(order());
  resolveMode.mockResolvedValue('template');
  send.mockResolvedValue({ success: true, attempts: [] });
});

describe('wording', () => {
  it('formats naira from kobo', () =>
    expect(formatNaira(500000)).toBe('₦5,000'));
  it('says a full refund is on its way, or that we are processing it, or that no payment was taken', () => {
    expect(cancelledSentence('on_its_way', 500000)).toBe(
      'A full refund of ₦5,000 is on its way.'
    );
    expect(cancelledSentence('being_processed', 500000)).toContain(
      'processing your refund of ₦5,000'
    );
    expect(cancelledSentence('none')).toBe('No payment was taken.');
  });
});

describe('[AC5] order_cancelled', () => {
  it('outside the window: the template with number and sentence', async () => {
    const r = await notifyOrderCancelled(
      'o1',
      'A full refund of ₦5,000 is on its way.'
    );
    expect(r.sent).toBe(true);
    const arg = send.mock.calls[0][0];
    expect(arg.templateKey).toBe('order_cancelled');
    expect(arg.whatsapp.params).toEqual([
      'WG2611260001',
      'A full refund of ₦5,000 is on its way.',
    ]);
    expect(arg.whatsapp.freeFormText).toBeUndefined();
  });

  it('inside the window: free-form text', async () => {
    resolveMode.mockResolvedValueOnce('free_form');
    await notifyOrderCancelled('o1', 'No payment was taken.');
    expect(send.mock.calls[0][0].whatsapp.freeFormText).toBe(
      'Your Wawa Garden Bar order #WG2611260001 has been cancelled. No payment was taken.'
    );
  });

  it('sends nothing for a staff order, and never throws', async () => {
    orderFindById.mockReturnValueOnce(order({ origin: 'staff' }));
    expect((await notifyOrderCancelled('o1', 'x')).sent).toBe(false);
    expect(send).not.toHaveBeenCalled();
    send.mockRejectedValueOnce(new Error('boom'));
    await expect(notifyOrderCancelled('o1', 'x')).resolves.toEqual({
      sent: false,
    });
  });
});

describe('[AC5] refund_processed', () => {
  it('template params are the amount and the order number', async () => {
    await notifyRefundProcessed('o1', 200000);
    const arg = send.mock.calls[0][0];
    expect(arg.templateKey).toBe('refund_processed');
    expect(arg.whatsapp.params).toEqual(['₦2,000', 'WG2611260001']);
  });

  it('inside the window: free-form text with the 3-10 days note', async () => {
    resolveMode.mockResolvedValueOnce('free_form');
    await notifyRefundProcessed('o1', 200000);
    expect(send.mock.calls[0][0].whatsapp.freeFormText).toContain(
      '3–10 working days'
    );
  });
});

describe('[AC7] registration', () => {
  it('both templates are transactional, held until approved, and always on', () => {
    for (const name of ['order_cancelled', 'refund_processed']) {
      expect(TEMPLATE_CATEGORIES[name]).toBe('transactional');
      expect(HELD_UNTIL_APPROVED_TEMPLATES.has(name)).toBe(true);
      expect(LOCKED_WHATSAPP_TEMPLATES[name]).toBeTruthy();
    }
  });
});
