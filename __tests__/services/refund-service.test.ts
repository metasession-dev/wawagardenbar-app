/**
 * @requirement REQ-PAY-011..014 (REQ-128 AC1-AC4) — RefundService with stateful
 * in-memory fakes for the Mongoose models (Paystack, messaging and alerts mocked).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const USER_ID = '65a1b2c3d4e5f6a7b8c9d0e2';
const OTHER_USER = '65a1b2c3d4e5f6a7b8c9d0e3';
const MANAGER = '65a1b2c3d4e5f6a7b8c9d0e4';

type Doc = Record<string, any>;
const state = vi.hoisted(() => ({
  orders: new Map<string, Doc>(),
  refunds: [] as Doc[],
  tickets: [] as Doc[],
  seq: 0,
}));

const q = <T>(value: T) => {
  const o: any = {
    select: () => o,
    sort: () => o,
    limit: () => o,
    lean: async () => value,
    then: (res: (v: T) => unknown) => Promise.resolve(value).then(res),
  };
  return o;
};
const sid = (v: unknown) => String(v);

const paystackCreate = vi.hoisted(() => vi.fn());
const cancelOrder = vi.hoisted(() => vi.fn());
const createTicket = vi.hoisted(() => vi.fn());
const addReply = vi.hoisted(() => vi.fn());
const updateStatus = vi.hoisted(() => vi.fn());
const raise = vi.hoisted(() => vi.fn());
const createLog = vi.hoisted(() => vi.fn());
const notifyCancelled = vi.hoisted(() => vi.fn());
const notifyProcessed = vi.hoisted(() => vi.fn());

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models', () => ({
  OrderModel: {
    findById: (id: string) => q(state.orders.get(sid(id)) ?? null),
    findOneAndUpdate: (filter: Doc, update: Doc) => {
      const o = state.orders.get(sid(filter._id));
      if (!o) return q(null);
      if (
        filter.paymentStatus?.$in &&
        !filter.paymentStatus.$in.includes(o.paymentStatus)
      )
        return q(null);
      if (filter.$expr) {
        const add = filter.$expr.$lte[0].$add[1];
        const limit = filter.$expr.$lte[1];
        if ((o.refundReservedKobo ?? 0) + add > limit) return q(null);
      }
      if (update.$inc)
        o.refundReservedKobo =
          (o.refundReservedKobo ?? 0) + update.$inc.refundReservedKobo;
      return q({ ...o });
    },
    updateOne: async (filter: Doc, update: Doc) => {
      const o = state.orders.get(sid(filter._id));
      if (!o) return;
      if (update.$inc)
        o.refundReservedKobo =
          (o.refundReservedKobo ?? 0) + update.$inc.refundReservedKobo;
      if (update.$set) Object.assign(o, update.$set);
      if (update.$push?.statusHistory)
        (o.statusHistory ??= []).push(update.$push.statusHistory);
    },
  },
  UserModel: { findById: () => q({ email: 'c@example.com' }) },
}));
vi.mock('@/models/refund-model', () => ({
  default: {
    create: async (d: Doc) => {
      if (
        d.type === 'full' &&
        state.refunds.some(
          (r) =>
            sid(r.orderId) === sid(d.orderId) &&
            r.type === 'full' &&
            ['pending', 'processed'].includes(r.status)
        )
      ) {
        throw Object.assign(new Error('dup'), { code: 11000 });
      }
      const doc = { _id: `r${++state.seq}`, createdAt: new Date(), ...d };
      state.refunds.push(doc);
      return { toObject: () => ({ ...doc }) };
    },
    findById: (id: string) =>
      q(state.refunds.find((r) => sid(r._id) === sid(id)) ?? null),
    findByIdAndUpdate: (id: string, upd: Doc) => {
      const r = state.refunds.find((x) => sid(x._id) === sid(id));
      if (r && upd.$set) Object.assign(r, upd.$set);
      return q(r ? { ...r } : null);
    },
    findOneAndUpdate: (filter: Doc, upd: Doc) => {
      const r = state.refunds.find(
        (x) =>
          sid(x._id) === sid(filter._id) &&
          (!filter.status || x.status === filter.status)
      );
      if (!r) return q(null);
      Object.assign(r, upd.$set);
      return q({ ...r });
    },
    findOne: (filter: Doc) => {
      const r = state.refunds.find((x) => {
        if (
          filter.paystackRefundId !== undefined &&
          typeof filter.paystackRefundId === 'string'
        )
          return x.paystackRefundId === filter.paystackRefundId;
        if (filter.transactionReference)
          return (
            x.transactionReference === filter.transactionReference &&
            x.status === filter.status &&
            !x.paystackRefundId
          );
        return false;
      });
      return q(r ? { ...r } : null);
    },
    aggregate: async () => {
      const total = state.refunds
        .filter((r) => r.status === 'processed' && sid(r.orderId) === ORDER_ID)
        .reduce((s, r) => s + r.amountKobo, 0);
      return total ? [{ _id: null, total }] : [];
    },
  },
}));
vi.mock('@/models/support-ticket-model', () => ({
  default: {
    findOne: (f: Doc) =>
      q(
        state.tickets.find(
          (t) =>
            t.category === 'refund' &&
            t.orderId === f.orderId &&
            t.refundRequest?.status === 'pending'
        ) ?? null
      ),
    findOneAndUpdate: (f: Doc, u: Doc) => {
      const t = state.tickets.find(
        (x) =>
          sid(x._id) === sid(f._id) &&
          x.category === 'refund' &&
          x.refundRequest?.status === 'pending'
      );
      if (!t) return q(null);
      for (const [k, v] of Object.entries(u.$set))
        t.refundRequest[k.replace('refundRequest.', '')] = v;
      return q({ ...t });
    },
    updateOne: async (f: Doc, u: Doc) => {
      const t = state.tickets.find((x) => sid(x._id) === sid(f._id));
      if (!t) return;
      if (u.$set?.refundRequest) t.refundRequest = u.$set.refundRequest;
      for (const [k, v] of Object.entries(u.$set ?? {}))
        if (k.startsWith('refundRequest.'))
          t.refundRequest[k.replace('refundRequest.', '')] = v;
    },
    exists: async (f: Doc) =>
      state.tickets.some(
        (x) => sid(x._id) === sid(f._id) && x.category === 'refund'
      ),
  },
}));
vi.mock('@/services/paystack-service', () => ({
  PaystackService: { createRefund: paystackCreate },
}));
vi.mock('@/services/order-service', () => ({ OrderService: { cancelOrder } }));
vi.mock('@/services/support-ticket-service', () => ({
  SupportTicketService: { createTicket, addReply, updateStatus },
}));
vi.mock('@/services/staff-notification-service', () => ({
  StaffNotificationService: { raise },
}));
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog },
}));
vi.mock('@/services/refund-notifier', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/refund-notifier')
  >('@/services/refund-notifier');
  return {
    ...actual,
    notifyOrderCancelled: notifyCancelled,
    notifyRefundProcessed: notifyProcessed,
  };
});
vi.mock('@/lib/socket-server', () => ({ emitOrderChange: vi.fn() }));

import {
  RefundService,
  refundEligibility,
  toKobo,
} from '@/services/refund-service';

const manager = { userId: MANAGER, email: 'm@example.com', role: 'manager' };

function seedOrder(over: Doc = {}) {
  state.orders.set(ORDER_ID, {
    _id: ORDER_ID,
    orderNumber: 'WG2611260001',
    origin: 'customer',
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentProvider: 'paystack',
    paymentReference: 'WG-REF-1',
    total: 5000,
    userId: USER_ID,
    refundReservedKobo: 0,
    statusHistory: [],
    ...over,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.orders.clear();
  state.refunds.length = 0;
  state.tickets.length = 0;
  state.seq = 0;
  seedOrder();
  paystackCreate.mockResolvedValue({ refundId: '9001', status: 'pending' });
  cancelOrder.mockImplementation(async () => {
    state.orders.get(ORDER_ID)!.status = 'cancelled';
    return {};
  });
  createTicket.mockImplementation(async () => {
    const t = {
      _id: '65a1b2c3d4e5f6a7b8c9d0f1',
      category: 'refund',
      orderId: ORDER_ID,
      refundRequest: { status: 'pending' },
    };
    state.tickets.push(t);
    return { _id: '65a1b2c3d4e5f6a7b8c9d0f1', ticketNumber: 'TKT-1' };
  });
});

describe('refundEligibility', () => {
  const ok = {
    origin: 'customer',
    paymentStatus: 'paid',
    paymentProvider: 'paystack',
    paymentReference: 'r',
  };
  it('accepts a Paystack-paid customer order', () =>
    expect(refundEligibility(ok)).toBeNull());
  it('refuses staff, tab, non-Paystack, unpaid and fully refunded orders', () => {
    expect(refundEligibility({ ...ok, origin: 'staff' })).toBeTruthy();
    expect(refundEligibility({ ...ok, tabId: 'x' })).toBeTruthy();
    expect(
      refundEligibility({ ...ok, paymentProvider: 'monnify' })
    ).toBeTruthy();
    expect(refundEligibility({ ...ok, paymentStatus: 'pending' })).toBeTruthy();
    expect(
      refundEligibility({ ...ok, paymentStatus: 'refunded' })
    ).toBeTruthy();
  });
});

describe('[AC1] requestRefund', () => {
  it('full: reserves the total, writes the row first and calls Paystack with no amount', async () => {
    const r = await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'full',
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    expect(r.ok).toBe(true);
    expect(state.orders.get(ORDER_ID)!.refundReservedKobo).toBe(500000);
    expect(state.refunds).toHaveLength(1);
    expect(state.refunds[0]).toMatchObject({
      status: 'pending',
      type: 'full',
      amountKobo: 500000,
      paystackRefundId: '9001',
    });
    expect(paystackCreate).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'WG-REF-1', amountKobo: undefined })
    );
    // the order stays paid until the webhook (ADR-015)
    expect(state.orders.get(ORDER_ID)!.paymentStatus).toBe('paid');
  });

  it('a second full refund is refused and Paystack is called once', async () => {
    await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'full',
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    const again = await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'full',
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    expect(again.ok).toBe(false);
    expect(paystackCreate).toHaveBeenCalledTimes(1);
    expect(state.refunds).toHaveLength(1);
  });

  it('partial: sends the kobo amount; an over-cap partial is refused without calling Paystack', async () => {
    const ok = await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'partial',
      amountKobo: toKobo(2000),
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    expect(ok.ok).toBe(true);
    expect(paystackCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ amountKobo: 200000 })
    );
    const over = await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'partial',
      amountKobo: toKobo(3500),
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    expect(over).toMatchObject({ ok: false, code: 'exceeds_balance' });
    expect(paystackCreate).toHaveBeenCalledTimes(1);
    expect(state.orders.get(ORDER_ID)!.refundReservedKobo).toBe(200000);
  });

  it('a full refund after a partial one is refused (use a partial for the rest)', async () => {
    await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'partial',
      amountKobo: toKobo(1000),
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    const full = await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'full',
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    expect(full).toMatchObject({ ok: false, code: 'exceeds_balance' });
  });

  it('refuses invalid amounts and ineligible orders', async () => {
    expect(
      await RefundService.requestRefund({
        orderId: ORDER_ID,
        type: 'partial',
        amountKobo: 0,
        reason: 'x',
        source: 'staff',
      })
    ).toMatchObject({ code: 'invalid_amount' });
    seedOrder({ paymentStatus: 'pending' });
    expect(
      await RefundService.requestRefund({
        orderId: ORDER_ID,
        type: 'full',
        reason: 'x',
        source: 'staff',
      })
    ).toMatchObject({ code: 'not_eligible' });
    expect(paystackCreate).not.toHaveBeenCalled();
  });

  it('Paystack failure: row failed, reservation released, staff alerted', async () => {
    paystackCreate.mockRejectedValueOnce(new Error('Refunds are not enabled'));
    const r = await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'full',
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    expect(r).toMatchObject({ ok: false, code: 'gateway_error' });
    expect(state.refunds[0]).toMatchObject({
      status: 'failed',
      failureReason: 'Refunds are not enabled',
    });
    expect(state.orders.get(ORDER_ID)!.refundReservedKobo).toBe(0);
    expect(raise).toHaveBeenCalledWith(
      'refund',
      expect.objectContaining({ reference: 'WG2611260001' }),
      expect.any(String)
    );
    expect(state.orders.get(ORDER_ID)!.paymentStatus).toBe('paid');
  });
});

describe('[AC2] customer cancel before preparation', () => {
  it('cancels, refunds in full once and tells the customer', async () => {
    const r = await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    expect(r).toMatchObject({ ok: true, outcome: 'cancelled_refund_started' });
    expect(cancelOrder).toHaveBeenCalledTimes(1);
    expect(paystackCreate).toHaveBeenCalledTimes(1);
    expect(state.refunds[0]).toMatchObject({
      source: 'customer_cancel',
      type: 'full',
    });
    expect(notifyCancelled).toHaveBeenCalledWith(
      ORDER_ID,
      expect.stringContaining('full refund of ₦5,000')
    );
  });

  it('a second cancel is a no-op: one refund, one cancellation', async () => {
    await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    state.orders.get(ORDER_ID)!.status = 'confirmed'; // even if status lagged
    const again = await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'whatsapp',
    });
    expect(again.ok).toBe(false);
    expect(cancelOrder).toHaveBeenCalledTimes(1);
    expect(paystackCreate).toHaveBeenCalledTimes(1);
  });

  it('whatsapp channel is recorded as the source', async () => {
    await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'whatsapp',
    });
    expect(state.refunds[0].source).toBe('whatsapp_cancel');
  });

  it("another customer's order cannot be cancelled", async () => {
    const r = await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: OTHER_USER,
      channel: 'web',
    });
    expect(r).toMatchObject({ ok: false, code: 'not_owner' });
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(paystackCreate).not.toHaveBeenCalled();
  });

  it('if the order cannot be cancelled the claim is released and nothing is refunded', async () => {
    cancelOrder.mockRejectedValueOnce(
      new Error('Order cannot be cancelled at this stage')
    );
    const r = await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    expect(r).toMatchObject({ ok: false, code: 'wrong_status' });
    expect(paystackCreate).not.toHaveBeenCalled();
    expect(state.orders.get(ORDER_ID)!.refundReservedKobo).toBe(0);
  });

  it('a Paystack failure still cancels, and the customer is told we are processing the refund', async () => {
    paystackCreate.mockRejectedValueOnce(new Error('down'));
    const r = await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    expect(r).toMatchObject({
      ok: true,
      outcome: 'cancelled_refund_pending_staff',
    });
    expect(notifyCancelled).toHaveBeenCalledWith(
      ORDER_ID,
      expect.stringContaining('processing your refund')
    );
    expect(raise).toHaveBeenCalled();
  });
});

describe('[AC3] after preparation: a refund request, no money moves', () => {
  it('creates one refund-request ticket and no refund row', async () => {
    seedOrder({ status: 'preparing' });
    const r = await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    expect(r).toMatchObject({ ok: true, outcome: 'refund_request_created' });
    expect(createTicket).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'refund', orderId: ORDER_ID })
    );
    expect(state.refunds).toHaveLength(0);
    expect(paystackCreate).not.toHaveBeenCalled();
    expect(cancelOrder).not.toHaveBeenCalled();
    // asking twice does not create a second ticket
    await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    expect(createTicket).toHaveBeenCalledTimes(1);
  });

  it('delivered and completed orders cannot be cancelled', async () => {
    seedOrder({ status: 'delivered' });
    expect(
      await RefundService.cancelPaidOrderForCustomer({
        orderId: ORDER_ID,
        customerUserId: USER_ID,
        channel: 'web',
      })
    ).toMatchObject({ ok: false, code: 'wrong_status' });
  });

  it('a manager approves a partial ₦2,000 refund; the request is decided once', async () => {
    seedOrder({ status: 'preparing' });
    await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    const ok = await RefundService.approveRefundRequest({
      ticketId: '65a1b2c3d4e5f6a7b8c9d0f1',
      actor: manager,
      partialAmountKobo: toKobo(2000),
    });
    expect(ok.ok).toBe(true);
    expect(state.refunds[0]).toMatchObject({
      type: 'partial',
      amountKobo: 200000,
      source: 'request_approval',
      supportTicketId: expect.anything(),
    });
    expect(paystackCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ amountKobo: 200000 })
    );
    expect(updateStatus).toHaveBeenCalledWith(
      '65a1b2c3d4e5f6a7b8c9d0f1',
      'resolved'
    );
    const again = await RefundService.approveRefundRequest({
      ticketId: '65a1b2c3d4e5f6a7b8c9d0f1',
      actor: manager,
    });
    expect(again).toMatchObject({ ok: false, code: 'already_decided' });
    expect(paystackCreate).toHaveBeenCalledTimes(1);
  });

  it('a failed approval puts the request back to pending', async () => {
    seedOrder({ status: 'preparing' });
    await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    paystackCreate.mockRejectedValueOnce(new Error('down'));
    const r = await RefundService.approveRefundRequest({
      ticketId: '65a1b2c3d4e5f6a7b8c9d0f1',
      actor: manager,
    });
    expect(r.ok).toBe(false);
    expect(state.tickets[0].refundRequest.status).toBe('pending');
  });

  it('rejecting tells the customer the reason and closes the request', async () => {
    seedOrder({ status: 'preparing' });
    await RefundService.cancelPaidOrderForCustomer({
      orderId: ORDER_ID,
      customerUserId: USER_ID,
      channel: 'web',
    });
    const r = await RefundService.rejectRefundRequest({
      ticketId: '65a1b2c3d4e5f6a7b8c9d0f1',
      actor: manager,
      reason: 'Already served',
    });
    expect(r.ok).toBe(true);
    expect(addReply).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: '65a1b2c3d4e5f6a7b8c9d0f1',
        authorRole: 'staff',
        body: expect.stringContaining('Already served'),
      })
    );
    expect(state.refunds).toHaveLength(0);
    expect(
      await RefundService.rejectRefundRequest({
        ticketId: '65a1b2c3d4e5f6a7b8c9d0f1',
        actor: manager,
        reason: 'again',
      })
    ).toMatchObject({ code: 'already_decided' });
  });
});

describe('[AC1] Paystack refund webhooks', () => {
  async function openFull() {
    await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'full',
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
  }

  it('refund.processed: row processed, order refunded, customer messaged once', async () => {
    await openFull();
    const a = await RefundService.applyWebhookEvent('refund.processed', {
      id: 9001,
      transaction_reference: 'WG-REF-1',
    });
    expect(a.result).toBe('applied');
    expect(state.refunds[0].status).toBe('processed');
    expect(state.orders.get(ORDER_ID)!.paymentStatus).toBe('refunded');
    expect(notifyProcessed).toHaveBeenCalledWith(ORDER_ID, 500000);
    const replay = await RefundService.applyWebhookEvent('refund.processed', {
      id: 9001,
      transaction_reference: 'WG-REF-1',
    });
    expect(replay.result).toBe('ignored');
    expect(notifyProcessed).toHaveBeenCalledTimes(1);
  });

  it('a partial refund makes the order partially_refunded', async () => {
    await RefundService.requestRefund({
      orderId: ORDER_ID,
      type: 'partial',
      amountKobo: 200000,
      reason: 'x',
      source: 'staff',
      requestedBy: manager,
      approvedBy: manager,
    });
    await RefundService.applyWebhookEvent('refund.processed', { id: 9001 });
    expect(state.orders.get(ORDER_ID)!.paymentStatus).toBe(
      'partially_refunded'
    );
  });

  it('the webhook can arrive before our own write of the Paystack refund id', async () => {
    paystackCreate.mockImplementationOnce(async () => {
      // webhook lands while createRefund is still returning
      return { refundId: '', status: 'pending' };
    });
    await openFull();
    expect(state.refunds[0].paystackRefundId).toBeUndefined();
    const a = await RefundService.applyWebhookEvent('refund.processed', {
      id: 777,
      transaction_reference: 'WG-REF-1',
    });
    expect(a.result).toBe('applied');
    expect(state.refunds[0]).toMatchObject({
      status: 'processed',
      paystackRefundId: '777',
    });
  });

  it('refund.failed: row failed, the order stays paid, the amount is released, staff alerted', async () => {
    await openFull();
    await RefundService.applyWebhookEvent('refund.failed', { id: 9001 });
    expect(state.refunds[0].status).toBe('failed');
    expect(state.orders.get(ORDER_ID)!.paymentStatus).toBe('paid');
    expect(state.orders.get(ORDER_ID)!.refundReservedKobo).toBe(0);
    expect(raise).toHaveBeenCalled();
  });

  it('an unknown refund is not_found so the route answers 404 and Paystack retries', async () => {
    expect(
      (
        await RefundService.applyWebhookEvent('refund.processed', {
          id: 1,
          transaction_reference: 'nope',
        })
      ).result
    ).toBe('not_found');
  });
});
