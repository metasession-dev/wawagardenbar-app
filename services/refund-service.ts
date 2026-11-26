/**
 * @requirement REQ-PAY-011, REQ-PAY-012, REQ-PAY-013, REQ-PAY-014 — Refunds (REQ-128, ADR-015)
 *
 * The only code that creates refunds. Rules:
 *   - customer-origin, Paystack-paid orders only, never a tab order;
 *   - every refund is a `Refund` ledger row written BEFORE Paystack is called;
 *   - the amount is reserved on the order atomically (`refundReservedKobo`), so
 *     two requests can never refund more than was paid;
 *   - one active full refund per order (unique partial index);
 *   - the order's `paymentStatus` changes only from the Paystack webhook;
 *   - customer and staff entry points both call here; role checks live in the
 *     server actions that call the staff entry points.
 * Customer messages never block a refund: notifier errors are swallowed.
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { OrderModel, UserModel } from '@/models';
import RefundModel from '@/models/refund-model';
import SupportTicketModel from '@/models/support-ticket-model';
import type {
  IRefund,
  RefundSource,
  RefundType,
} from '@/interfaces/refund.interface';
import { PaystackService } from '@/services/paystack-service';
import { OrderService } from '@/services/order-service';
import { SupportTicketService } from '@/services/support-ticket-service';
import { StaffNotificationService } from '@/services/staff-notification-service';
import { AuditLogService } from '@/services/audit-log-service';
import {
  cancelledSentence,
  formatNaira,
  notifyOrderCancelled,
  notifyRefundProcessed,
} from '@/services/refund-notifier';
import type { AuditAction } from '@/interfaces/audit-log.interface';

export type RefundErrorCode =
  | 'order_not_found'
  | 'not_owner'
  | 'not_eligible'
  | 'wrong_status'
  | 'invalid_amount'
  | 'exceeds_balance'
  | 'already_requested'
  | 'gateway_error'
  | 'request_not_found'
  | 'already_decided';

export type Fail = { ok: false; code: RefundErrorCode; error: string };
const fail = (code: RefundErrorCode, error: string): Fail => ({
  ok: false,
  code,
  error,
});

/** Statuses at which a customer cancel is automatic (before preparation). */
export const AUTO_REFUND_STATUSES = ['pending', 'confirmed'] as const;
/** Statuses at which a customer cancel becomes a refund request. */
export const REQUEST_STATUSES = [
  'preparing',
  'ready',
  'out-for-delivery',
] as const;
const REFUNDABLE_PAYMENT = ['paid', 'partially_refunded'];

export interface StaffActor {
  userId: string;
  email: string;
  role: string;
}

interface OrderForRefund {
  _id: Types.ObjectId;
  orderNumber: string;
  origin?: string;
  tabId?: unknown;
  status: string;
  paymentStatus?: string;
  paymentProvider?: string;
  paymentReference?: string;
  total: number;
  userId?: { toString(): string };
  refundReservedKobo?: number;
}

/** Pure: why an order cannot be refunded here, or null when it can. */
export function refundEligibility(
  order: Pick<
    OrderForRefund,
    | 'origin'
    | 'tabId'
    | 'paymentStatus'
    | 'paymentProvider'
    | 'paymentReference'
  >
): string | null {
  if (order.origin !== 'customer') {
    return 'Refunds apply to customer orders paid through Paystack only.';
  }
  if (order.tabId) return 'Tab orders are not refunded here.';
  if (order.paymentProvider !== 'paystack' || !order.paymentReference) {
    return 'Refunds apply to orders paid through Paystack only.';
  }
  if (!REFUNDABLE_PAYMENT.includes(order.paymentStatus ?? '')) {
    return 'This order has not been paid, or is already fully refunded.';
  }
  return null;
}

export const toKobo = (naira: number): number => Math.round(naira * 100);

async function audit(
  action: AuditAction,
  actor: StaffActor | null,
  orderId: string,
  details: Record<string, unknown>
): Promise<void> {
  if (!actor || !Types.ObjectId.isValid(actor.userId)) return;
  try {
    await AuditLogService.createLog({
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role,
      action,
      resource: 'order',
      resourceId: orderId,
      details,
    });
  } catch (error) {
    console.error('[REQ-128] audit log failed', action, error);
  }
}

async function customerActor(userId?: string): Promise<StaffActor | null> {
  if (!userId || !Types.ObjectId.isValid(userId)) return null;
  const user = await UserModel.findById(userId)
    .select('email')
    .lean<{ email?: string } | null>();
  return { userId, email: user?.email ?? '', role: 'customer' };
}

async function releaseReservation(orderId: Types.ObjectId, kobo: number) {
  await OrderModel.updateOne(
    { _id: orderId },
    { $inc: { refundReservedKobo: -kobo } }
  );
}

async function alertStaff(refund: IRefund, title: string): Promise<void> {
  await StaffNotificationService.raise(
    'refund',
    {
      refModel: 'Refund',
      refId: String(refund._id),
      reference: refund.orderNumber,
    },
    title
  );
}

export interface OpenRefundInput {
  orderId: string;
  type: RefundType;
  /** Required for a partial refund, in kobo. */
  amountKobo?: number;
  reason: string;
  source: RefundSource;
  requestedBy?: StaffActor | null;
  approvedBy?: StaffActor | null;
  supportTicketId?: string | null;
}

export class RefundService {
  /** Reserve the amount and write the ledger row. Does not call Paystack. */
  static async openRefund(
    input: OpenRefundInput
  ): Promise<{ ok: true; refund: IRefund; order: OrderForRefund } | Fail> {
    await connectDB();
    if (!Types.ObjectId.isValid(input.orderId)) {
      return fail('order_not_found', 'Order not found');
    }
    const order = await OrderModel.findById(
      input.orderId
    ).lean<OrderForRefund | null>();
    if (!order) return fail('order_not_found', 'Order not found');

    const why = refundEligibility(order);
    if (why) return fail('not_eligible', why);

    const totalKobo = toKobo(order.total);
    let amountKobo = totalKobo;
    if (input.type === 'partial') {
      amountKobo = input.amountKobo ?? 0;
      if (
        !Number.isInteger(amountKobo) ||
        amountKobo <= 0 ||
        amountKobo > totalKobo
      ) {
        return fail('invalid_amount', 'Enter a valid refund amount.');
      }
    } else if ((order.refundReservedKobo ?? 0) > 0) {
      return fail(
        'exceeds_balance',
        'Part of this order is already refunded; refund the remaining amount as a partial refund.'
      );
    }

    // Atomic cap: reserved + this refund must not exceed what was paid.
    const reserved = await OrderModel.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: { $in: REFUNDABLE_PAYMENT },
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$refundReservedKobo', 0] }, amountKobo] },
            totalKobo,
          ],
        },
      },
      { $inc: { refundReservedKobo: amountKobo } },
      { new: true }
    ).lean<OrderForRefund | null>();
    if (!reserved) {
      return fail(
        'exceeds_balance',
        'The refund is larger than the amount still refundable on this order.'
      );
    }

    try {
      const doc = await RefundModel.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        amountKobo,
        type: input.type,
        status: 'pending',
        source: input.source,
        requestedBy: input.requestedBy
          ? new Types.ObjectId(input.requestedBy.userId)
          : null,
        approvedBy: input.approvedBy
          ? new Types.ObjectId(input.approvedBy.userId)
          : null,
        reason: input.reason,
        transactionReference: order.paymentReference,
        supportTicketId: input.supportTicketId
          ? new Types.ObjectId(input.supportTicketId)
          : null,
      });
      return { ok: true, refund: doc.toObject() as IRefund, order };
    } catch (error) {
      await releaseReservation(order._id, amountKobo);
      if ((error as { code?: number }).code === 11000) {
        return fail(
          'already_requested',
          'A full refund is already in progress.'
        );
      }
      throw error;
    }
  }

  /** Mark a refund failed and give the reserved amount back. Idempotent. */
  static async failRefund(
    refundId: string,
    failureReason: string,
    alertTitle?: string
  ): Promise<void> {
    const refund = await RefundModel.findOneAndUpdate(
      { _id: refundId, status: 'pending' },
      { $set: { status: 'failed', failureReason } },
      { new: true }
    ).lean<IRefund | null>();
    if (!refund) return;
    await releaseReservation(refund.orderId, refund.amountKobo);
    await alertStaff(
      refund,
      alertTitle ?? `Refund failed for order ${refund.orderNumber}`
    );
    await audit('refund.failed', null, String(refund.orderId), {
      refundId: String(refund._id),
      failureReason,
    });
  }

  /** Call Paystack for a pending refund. Safe to call twice. */
  static async sendRefund(
    refundId: string
  ): Promise<{ ok: true; refund: IRefund } | Fail> {
    await connectDB();
    const refund = await RefundModel.findById(refundId).lean<IRefund | null>();
    if (!refund) return fail('request_not_found', 'Refund not found');
    if (refund.status !== 'pending' || refund.paystackRefundId) {
      return { ok: true, refund };
    }
    try {
      const res = await PaystackService.createRefund({
        reference: refund.transactionReference ?? '',
        amountKobo: refund.type === 'partial' ? refund.amountKobo : undefined,
        reason: refund.reason,
      });
      const updated = await RefundModel.findByIdAndUpdate(
        refund._id,
        res.refundId ? { $set: { paystackRefundId: res.refundId } } : {},
        { new: true }
      ).lean<IRefund | null>();
      return { ok: true, refund: updated ?? refund };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.failRefund(String(refund._id), message);
      return fail(
        'gateway_error',
        'Paystack could not start the refund. Staff have been alerted.'
      );
    }
  }

  /** Open + send. Used by staff refunds and approved requests. */
  static async requestRefund(
    input: OpenRefundInput
  ): Promise<{ ok: true; refund: IRefund } | Fail> {
    const opened = await this.openRefund(input);
    if (!opened.ok) return opened;
    const sent = await this.sendRefund(String(opened.refund._id));
    if (!sent.ok) return sent;
    await audit(
      'refund.requested',
      input.approvedBy ?? input.requestedBy ?? null,
      input.orderId,
      {
        refundId: String(opened.refund._id),
        type: input.type,
        amountKobo: opened.refund.amountKobo,
        reason: input.reason,
        source: input.source,
      }
    );
    return sent;
  }

  /**
   * AC2 / AC3 — the customer cancels a paid order.
   * pending or confirmed: cancel + automatic full refund (once).
   * preparing and later: create a refund-request ticket, no money moves.
   */
  static async cancelPaidOrderForCustomer(input: {
    orderId: string;
    customerUserId: string;
    channel: 'web' | 'whatsapp';
  }): Promise<
    | { ok: true; outcome: 'cancelled_refund_started'; refund: IRefund }
    | { ok: true; outcome: 'cancelled_refund_pending_staff'; refund: IRefund }
    | { ok: true; outcome: 'refund_request_created'; ticketId: string }
    | Fail
  > {
    await connectDB();
    if (!Types.ObjectId.isValid(input.orderId)) {
      return fail('order_not_found', 'Order not found');
    }
    const order = await OrderModel.findById(
      input.orderId
    ).lean<OrderForRefund | null>();
    if (!order) return fail('order_not_found', 'Order not found');
    if (!order.userId || order.userId.toString() !== input.customerUserId) {
      return fail('not_owner', 'Order not found');
    }
    const why = refundEligibility(order);
    if (why) return fail('not_eligible', why);

    if ((AUTO_REFUND_STATUSES as readonly string[]).includes(order.status)) {
      const source: RefundSource =
        input.channel === 'whatsapp' ? 'whatsapp_cancel' : 'customer_cancel';
      // Claim first: the ledger row and the reservation make a second tap a no-op.
      const opened = await this.openRefund({
        orderId: input.orderId,
        type: 'full',
        reason: 'Cancelled by customer before preparation',
        source,
      });
      if (!opened.ok) return opened;
      try {
        await OrderService.cancelOrder(
          input.orderId,
          'Cancelled by customer — full refund requested'
        );
      } catch {
        await this.failRefund(
          String(opened.refund._id),
          'order could not be cancelled'
        ).catch(() => undefined);
        return fail('wrong_status', 'This order can no longer be cancelled.');
      }
      try {
        const { emitOrderChange } = await import('@/lib/socket-server');
        emitOrderChange({
          orderId: input.orderId,
          status: 'cancelled',
          action: 'cancelled',
        });
      } catch {
        // live update only
      }
      const sent = await this.sendRefund(String(opened.refund._id));
      const actor = await customerActor(input.customerUserId);
      await audit('refund.requested', actor, input.orderId, {
        refundId: String(opened.refund._id),
        type: 'full',
        amountKobo: opened.refund.amountKobo,
        source,
      });
      await notifyOrderCancelled(
        input.orderId,
        cancelledSentence(
          sent.ok ? 'on_its_way' : 'being_processed',
          opened.refund.amountKobo
        )
      );
      return sent.ok
        ? { ok: true, outcome: 'cancelled_refund_started', refund: sent.refund }
        : {
            ok: true,
            outcome: 'cancelled_refund_pending_staff',
            refund: opened.refund,
          };
    }

    if ((REQUEST_STATUSES as readonly string[]).includes(order.status)) {
      const created = await this.createRefundRequest({
        order,
        customerUserId: input.customerUserId,
        channel: input.channel,
      });
      return created;
    }
    return fail('wrong_status', 'This order can no longer be cancelled.');
  }

  /** AC3 — a refund-request ticket for an order already being prepared. */
  static async createRefundRequest(input: {
    order: OrderForRefund;
    customerUserId: string;
    channel: 'web' | 'whatsapp';
  }): Promise<
    { ok: true; outcome: 'refund_request_created'; ticketId: string } | Fail
  > {
    const orderId = String(input.order._id);
    const existing = await SupportTicketModel.findOne({
      category: 'refund',
      orderId,
      'refundRequest.status': 'pending',
    })
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>();
    if (existing) {
      return {
        ok: true,
        outcome: 'refund_request_created',
        ticketId: String(existing._id),
      };
    }
    const ticket = await SupportTicketService.createTicket({
      userId: input.customerUserId,
      source: input.channel === 'whatsapp' ? 'whatsapp' : 'web',
      category: 'refund',
      subject: `Refund request for order #${input.order.orderNumber}`,
      message: `The customer asked to cancel order #${input.order.orderNumber} (${formatNaira(toKobo(input.order.total))}) after preparation began. A manager or admin decides whether to refund it.`,
      orderId,
      priority: 'high',
      alertTitle: 'Refund request',
    });
    await SupportTicketModel.updateOne(
      { _id: ticket._id },
      { $set: { refundRequest: { status: 'pending' } } }
    );
    const actor = await customerActor(input.customerUserId);
    await audit('refund.requested', actor, orderId, {
      kind: 'request',
      ticketId: String(ticket._id),
    });
    return {
      ok: true,
      outcome: 'refund_request_created',
      ticketId: String(ticket._id),
    };
  }

  /** AC3/AC4 — manager, admin or super-admin approves a request (full, or a partial amount). */
  static async approveRefundRequest(input: {
    ticketId: string;
    actor: StaffActor;
    /** Omit for a full refund. */
    partialAmountKobo?: number;
    note?: string;
  }): Promise<{ ok: true; refund: IRefund } | Fail> {
    await connectDB();
    if (!Types.ObjectId.isValid(input.ticketId)) {
      return fail('request_not_found', 'Refund request not found');
    }
    // Atomic decision: only one approver wins.
    const ticket = await SupportTicketModel.findOneAndUpdate(
      {
        _id: input.ticketId,
        category: 'refund',
        'refundRequest.status': 'pending',
      },
      {
        $set: {
          'refundRequest.status': 'approved',
          'refundRequest.decidedBy': input.actor.userId,
          'refundRequest.decidedAt': new Date(),
        },
      },
      { new: true }
    ).lean<{ _id: Types.ObjectId; orderId: string | null } | null>();
    if (!ticket || !ticket.orderId) {
      const exists = await SupportTicketModel.exists({
        _id: input.ticketId,
        category: 'refund',
      });
      return exists
        ? fail('already_decided', 'This request has already been decided.')
        : fail('request_not_found', 'Refund request not found');
    }
    const result = await this.requestRefund({
      orderId: ticket.orderId,
      type: input.partialAmountKobo ? 'partial' : 'full',
      amountKobo: input.partialAmountKobo,
      reason: input.note?.trim() || 'Approved refund request',
      source: 'request_approval',
      approvedBy: input.actor,
      supportTicketId: String(ticket._id),
    });
    if (!result.ok) {
      // Put the request back so another attempt (or a different amount) is possible.
      await SupportTicketModel.updateOne(
        { _id: ticket._id },
        {
          $set: {
            'refundRequest.status': 'pending',
            'refundRequest.decidedBy': null,
            'refundRequest.decidedAt': null,
          },
        }
      );
      return result;
    }
    await SupportTicketModel.updateOne(
      { _id: ticket._id },
      { $set: { 'refundRequest.refundId': String(result.refund._id) } }
    );
    await SupportTicketService.updateStatus(String(ticket._id), 'resolved');
    await audit('refund.approved', input.actor, ticket.orderId, {
      ticketId: String(ticket._id),
      refundId: String(result.refund._id),
      type: result.refund.type,
      amountKobo: result.refund.amountKobo,
    });
    return result;
  }

  /** AC3 — reject a request; the customer is told why. */
  static async rejectRefundRequest(input: {
    ticketId: string;
    actor: StaffActor;
    reason: string;
  }): Promise<{ ok: true } | Fail> {
    await connectDB();
    if (!Types.ObjectId.isValid(input.ticketId)) {
      return fail('request_not_found', 'Refund request not found');
    }
    const ticket = await SupportTicketModel.findOneAndUpdate(
      {
        _id: input.ticketId,
        category: 'refund',
        'refundRequest.status': 'pending',
      },
      {
        $set: {
          'refundRequest.status': 'rejected',
          'refundRequest.decidedBy': input.actor.userId,
          'refundRequest.decidedAt': new Date(),
          'refundRequest.rejectionReason': input.reason,
        },
      },
      { new: true }
    ).lean<{ _id: Types.ObjectId; orderId: string | null } | null>();
    if (!ticket) {
      const exists = await SupportTicketModel.exists({
        _id: input.ticketId,
        category: 'refund',
      });
      return exists
        ? fail('already_decided', 'This request has already been decided.')
        : fail('request_not_found', 'Refund request not found');
    }
    // The reply goes to the customer (free-form in the window, support_reply outside).
    await SupportTicketService.addReply({
      ticketId: String(ticket._id),
      body: `We could not refund this order: ${input.reason}`,
      authorRole: 'staff',
      authorUserId: input.actor.userId,
    });
    await SupportTicketService.updateStatus(String(ticket._id), 'resolved');
    await audit('refund.rejected', input.actor, ticket.orderId ?? '', {
      ticketId: String(ticket._id),
      reason: input.reason,
    });
    return { ok: true };
  }

  /**
   * AC1 — apply a Paystack refund webhook. Called after signature check and the
   * de-duplication row. `not_found` lets the route answer 404 so Paystack retries.
   */
  static async locateForWebhook(
    data: Record<string, unknown>
  ): Promise<IRefund | null> {
    await connectDB();
    const refundId = data.id !== undefined ? String(data.id) : '';
    const txRef = String(data.transaction_reference ?? data.reference ?? '');

    let refund: IRefund | null = refundId
      ? await RefundModel.findOne({
          paystackRefundId: refundId,
        }).lean<IRefund | null>()
      : null;
    if (!refund && txRef) {
      // The webhook can beat our own write of the Paystack refund id.
      refund = await RefundModel.findOne({
        transactionReference: txRef,
        status: 'pending',
        paystackRefundId: { $exists: false },
      })
        .sort({ createdAt: -1 })
        .lean<IRefund | null>();
    }
    return refund;
  }

  static async applyWebhookEvent(
    event: 'refund.processed' | 'refund.failed' | 'refund.pending',
    data: Record<string, unknown>
  ): Promise<{ result: 'applied' | 'ignored' | 'not_found' }> {
    const refund = await this.locateForWebhook(data);
    const refundId = data.id !== undefined ? String(data.id) : '';
    if (!refund) return { result: 'not_found' };
    if (event === 'refund.pending') return { result: 'ignored' };

    if (event === 'refund.failed') {
      await this.failRefund(
        String(refund._id),
        String(
          data.failure_reason ??
            data.message ??
            'Paystack reported the refund failed'
        ),
        `Paystack failed the refund for order ${refund.orderNumber}`
      );
      return { result: 'applied' };
    }

    // refund.processed — a pending refund becomes processed exactly once.
    const processed = await RefundModel.findOneAndUpdate(
      { _id: refund._id, status: 'pending' },
      {
        $set: {
          status: 'processed',
          processedAt: new Date(),
          ...(refundId ? { paystackRefundId: refundId } : {}),
        },
      },
      { new: true }
    ).lean<IRefund | null>();
    if (!processed) return { result: 'ignored' };

    const order = await OrderModel.findById(processed.orderId)
      .select('total userId status')
      .lean<{
        total: number;
        status?: string;
        userId?: { toString(): string };
      } | null>();
    const sum = await RefundModel.aggregate<{ _id: null; total: number }>([
      { $match: { orderId: processed.orderId, status: 'processed' } },
      { $group: { _id: null, total: { $sum: '$amountKobo' } } },
    ]);
    const refundedKobo = sum[0]?.total ?? processed.amountKobo;
    const fully = order
      ? refundedKobo >= toKobo(order.total)
      : processed.type === 'full';
    await OrderModel.updateOne(
      { _id: processed.orderId },
      {
        $set: { paymentStatus: fully ? 'refunded' : 'partially_refunded' },
        $push: {
          statusHistory: {
            status: order?.status ?? 'cancelled',
            timestamp: new Date(),
            note: `Refund of ${formatNaira(processed.amountKobo)} processed by Paystack`,
          },
        },
      }
    );
    await audit(
      'refund.processed',
      await customerActor(order?.userId?.toString()),
      String(processed.orderId),
      {
        refundId: String(processed._id),
        amountKobo: processed.amountKobo,
      }
    );
    await notifyRefundProcessed(
      String(processed.orderId),
      processed.amountKobo
    );
    return { result: 'applied' };
  }
}
