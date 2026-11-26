/**
 * @requirement REQ-ORDER-007 — Customer WhatsApp status notifications (REQ-124, AC1, AC2)
 *
 * `notifyOrderStatus` is the single entry point for telling a customer that
 * staff moved their order to a new status. It is called from exactly one
 * place — `updateOrderStatusAction` (batch updates reach it through that
 * action). Rules:
 *   - customer-origin orders only; staff orders never message anyone;
 *   - one message per status per order (atomic claim on `notifiedStatuses`);
 *   - inside the 24-hour window the message is free-form text, outside it the
 *     `order_status_update_v2` template with the signed Track order button;
 *   - consent gating, fallback and the NotificationLog stay in
 *     `NotificationService.send`;
 *   - never throws: a messaging problem must not fail the staff action.
 */
import { connectDB } from '@/lib/mongodb';
import { OrderModel, UserModel } from '@/models';
import IncomingMessageModel from '@/models/incoming-message-model';
import { phoneLookupVariants } from '@/lib/auth-utils';
import { getReplyMode } from '@/lib/support-reply-mode';
import {
  buildTrackingUrl,
  buildTrackingButtonSuffix,
} from '@/lib/order-tracking-token';
import { orderStatusUpdateV2Params } from '@/lib/whatsapp-template-params';
import { NotificationService } from '@/services/notification-service';

export const ORDER_STATUS_TEMPLATE = 'order_status_update_v2';

/**
 * The status phrase the customer reads, or null when no message is sent for
 * that status (`completed`: nothing; `cancelled`: WA-11; `pending`: not a staff step).
 */
export function orderStatusPhrase(
  status: string,
  orderType: string | undefined
): string | null {
  switch (status) {
    case 'confirmed':
      return 'confirmed';
    case 'preparing':
      return 'being prepared';
    case 'ready':
      // #1071 (REQ-128 AC8) — a delivery order is never "ready for pickup".
      if (orderType === 'dine-in') return 'ready and on its way to your table';
      if (orderType === 'delivery') return 'ready and waiting for a rider';
      return 'ready for pickup';
    case 'out-for-delivery':
      return 'out for delivery';
    case 'delivered':
      return 'delivered';
    default:
      return null;
  }
}

export interface NotifyOrderStatusResult {
  sent: boolean;
  reason?:
    | 'no_message_for_status'
    | 'order_not_found'
    | 'not_customer_order'
    | 'no_recipient'
    | 'already_notified'
    | 'send_failed'
    | 'error';
  mode?: 'free_form' | 'template';
}

interface OrderLite {
  _id: { toString(): string };
  orderNumber: string;
  orderType?: string;
  origin?: string;
  userId?: { toString(): string };
}

export async function resolveMode(
  userId: string
): Promise<'free_form' | 'template'> {
  const user = await UserModel.findById(userId)
    .select('phone')
    .lean<{ phone?: string } | null>();
  if (!user?.phone) return 'template';
  const last = await IncomingMessageModel.findOne({
    from: { $in: phoneLookupVariants(user.phone) },
  })
    .sort({ receivedAt: -1 })
    .select('receivedAt')
    .lean<{ receivedAt?: Date } | null>();
  return getReplyMode(last?.receivedAt ?? null);
}

export async function notifyOrderStatus(
  orderId: string,
  newStatus: string
): Promise<NotifyOrderStatusResult> {
  try {
    await connectDB();

    const order = await OrderModel.findById(orderId)
      .select('orderNumber orderType origin userId')
      .lean<OrderLite | null>();
    if (!order) return { sent: false, reason: 'order_not_found' };

    const phrase = orderStatusPhrase(newStatus, order.orderType);
    if (!phrase) return { sent: false, reason: 'no_message_for_status' };

    if (order.origin !== 'customer') {
      return { sent: false, reason: 'not_customer_order' };
    }
    if (!order.userId) return { sent: false, reason: 'no_recipient' };

    // Claim the status atomically so a repeat save (or two staff at once)
    // cannot send it twice.
    const claimed = await OrderModel.findOneAndUpdate(
      { _id: orderId, notifiedStatuses: { $ne: newStatus } },
      { $addToSet: { notifiedStatuses: newStatus } },
      { new: false }
    ).select('_id');
    if (!claimed) return { sent: false, reason: 'already_notified' };

    const userId = order.userId.toString();
    const id = order._id.toString();
    const mode = await resolveMode(userId);
    const params = orderStatusUpdateV2Params({
      orderNumber: order.orderNumber,
      statusText: phrase,
      trackingSuffix: buildTrackingButtonSuffix(id),
    });

    const result = await NotificationService.send({
      userId,
      templateKey: ORDER_STATUS_TEMPLATE,
      whatsapp: {
        params: params.bodyParams ?? [],
        buttonParams: params.buttonParams,
        ...(mode === 'free_form'
          ? {
              freeFormText: `Your Wawa Garden Bar order #${order.orderNumber} is ${phrase}. Track it: ${buildTrackingUrl(id)}`,
            }
          : {}),
      },
    });
    return result.success
      ? { sent: true, mode }
      : { sent: false, reason: 'send_failed', mode };
  } catch (error) {
    console.error('notifyOrderStatus failed', orderId, newStatus, error);
    return { sent: false, reason: 'error' };
  }
}
