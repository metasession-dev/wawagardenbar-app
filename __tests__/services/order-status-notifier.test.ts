/**
 * @requirement REQ-ORDER-007 (REQ-124 AC1) — notifyOrderStatus rules.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());
const orderFindById = vi.hoisted(() => vi.fn());
const orderClaim = vi.hoisted(() => vi.fn());
const userFindById = vi.hoisted(() => vi.fn());
const inboundFindOne = vi.hoisted(() => vi.fn());

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models', () => ({
  OrderModel: {
    findById: (...a: unknown[]) => orderFindById(...a),
    findOneAndUpdate: (...a: unknown[]) => orderClaim(...a),
  },
  UserModel: { findById: (...a: unknown[]) => userFindById(...a) },
}));
vi.mock('@/models/incoming-message-model', () => ({
  default: { findOne: (...a: unknown[]) => inboundFindOne(...a) },
}));
vi.mock('@/lib/auth-utils', () => ({ phoneLookupVariants: (p: string) => [p] }));
vi.mock('@/services/notification-service', () => ({
  NotificationService: { send },
}));

import {
  notifyOrderStatus,
  orderStatusPhrase,
} from '@/services/order-status-notifier';

const ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const chain = <T,>(value: T) => ({
  select: () => ({ lean: async () => value, then: undefined }),
});
const order = (o: Record<string, unknown> = {}) => ({
  _id: ID,
  orderNumber: 'WG1',
  orderType: 'pickup',
  origin: 'customer',
  userId: 'user-1',
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ORDER_TRACKING_SECRET = 's'.repeat(40);
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  orderFindById.mockReturnValue(chain(order()));
  orderClaim.mockReturnValue({ select: async () => ({ _id: ID }) });
  userFindById.mockReturnValue(chain({ phone: '2348000000000' }));
  inboundFindOne.mockReturnValue({ sort: () => chain(null) });
  send.mockResolvedValue({ sentVia: 'whatsapp', success: true, attempts: [] });
});

describe('orderStatusPhrase', () => {
  it('maps each notifiable status and none for completed / cancelled / pending', () => {
    expect(orderStatusPhrase('confirmed', 'pickup')).toBe('confirmed');
    expect(orderStatusPhrase('preparing', 'pickup')).toBe('being prepared');
    expect(orderStatusPhrase('ready', 'pickup')).toBe('ready for pickup');
    expect(orderStatusPhrase('ready', 'delivery')).toBe('ready for pickup');
    expect(orderStatusPhrase('ready', 'dine-in')).toBe(
      'ready and on its way to your table'
    );
    expect(orderStatusPhrase('out-for-delivery', 'delivery')).toBe('out for delivery');
    expect(orderStatusPhrase('delivered', 'delivery')).toBe('delivered');
    for (const s of ['completed', 'cancelled', 'pending', 'nope']) {
      expect(orderStatusPhrase(s, 'pickup')).toBeNull();
    }
  });
});

describe('notifyOrderStatus', () => {
  it('[US-A4.1] sends order_status_update_v2 "ready for pickup" with a token button outside the window', async () => {
    const r = await notifyOrderStatus(ID, 'ready');
    expect(r).toEqual({ sent: true, mode: 'template' });
    const arg = send.mock.calls[0][0];
    expect(arg.userId).toBe('user-1');
    expect(arg.templateKey).toBe('order_status_update_v2');
    expect(arg.whatsapp.params).toEqual(['WG1', 'ready for pickup']);
    expect(arg.whatsapp.freeFormText).toBeUndefined();
    expect(arg.whatsapp.buttonParams[0].params[0]).toMatch(new RegExp(`^${ID}\\?t=\\d+\\.`));
  });

  it('[US-A4.2] a delivery order set out-for-delivery says "out for delivery"', async () => {
    orderFindById.mockReturnValue(chain(order({ orderType: 'delivery' })));
    await notifyOrderStatus(ID, 'out-for-delivery');
    expect(send.mock.calls[0][0].whatsapp.params).toEqual(['WG1', 'out for delivery']);
  });

  it('uses free-form text with the tracking link inside the 24-hour window', async () => {
    inboundFindOne.mockReturnValue({
      sort: () => chain({ receivedAt: new Date(Date.now() - 60 * 60 * 1000) }),
    });
    const r = await notifyOrderStatus(ID, 'preparing');
    expect(r.mode).toBe('free_form');
    const text = send.mock.calls[0][0].whatsapp.freeFormText as string;
    expect(text).toContain('order #WG1 is being prepared');
    expect(text).toContain(`https://app.example.com/orders/${ID}?t=`);
  });

  it('uses the template when the last inbound message is older than 24 hours', async () => {
    inboundFindOne.mockReturnValue({
      sort: () => chain({ receivedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }),
    });
    expect((await notifyOrderStatus(ID, 'preparing')).mode).toBe('template');
  });

  it('[US-A4.3] never messages for a staff-origin order', async () => {
    orderFindById.mockReturnValue(chain(order({ origin: 'staff' })));
    expect(await notifyOrderStatus(ID, 'ready')).toEqual({
      sent: false,
      reason: 'not_customer_order',
    });
    expect(send).not.toHaveBeenCalled();
    expect(orderClaim).not.toHaveBeenCalled();
  });

  it('sends nothing for completed, cancelled or an unknown order', async () => {
    expect((await notifyOrderStatus(ID, 'completed')).reason).toBe('no_message_for_status');
    expect((await notifyOrderStatus(ID, 'cancelled')).reason).toBe('no_message_for_status');
    orderFindById.mockReturnValue(chain(null));
    expect((await notifyOrderStatus(ID, 'ready')).reason).toBe('order_not_found');
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing when the order has no account to message', async () => {
    orderFindById.mockReturnValue(chain(order({ userId: undefined })));
    expect((await notifyOrderStatus(ID, 'ready')).reason).toBe('no_recipient');
  });

  it('does not send a status twice: a lost claim sends nothing', async () => {
    orderClaim.mockReturnValue({ select: async () => null });
    expect(await notifyOrderStatus(ID, 'ready')).toEqual({
      sent: false,
      reason: 'already_notified',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('claims atomically on the status with $addToSet and a $ne filter', async () => {
    await notifyOrderStatus(ID, 'ready');
    const [filter, update] = orderClaim.mock.calls[0];
    expect(filter).toEqual({ _id: ID, notifiedStatuses: { $ne: 'ready' } });
    expect(update).toEqual({ $addToSet: { notifiedStatuses: 'ready' } });
  });

  it('concurrent calls: only the claim winner sends', async () => {
    let first = true;
    orderClaim.mockImplementation(() => ({
      select: async () => {
        const won = first;
        first = false;
        return won ? { _id: ID } : null;
      },
    }));
    const [a, b] = await Promise.all([
      notifyOrderStatus(ID, 'ready'),
      notifyOrderStatus(ID, 'ready'),
    ]);
    expect([a.sent, b.sent].sort()).toEqual([false, true]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('reports send_failed without throwing when no channel delivers', async () => {
    send.mockResolvedValue({ sentVia: 'none', success: false, attempts: [] });
    expect((await notifyOrderStatus(ID, 'ready')).reason).toBe('send_failed');
  });

  it('never throws when the database or service blows up', async () => {
    orderFindById.mockImplementation(() => {
      throw new Error('db down');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await notifyOrderStatus(ID, 'ready')).toEqual({
      sent: false,
      reason: 'error',
    });
    spy.mockRestore();
  });
});
