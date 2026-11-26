/**
 * @requirement REQ-WA-019 — Cancellation and refund messages (REQ-128, AC5)
 *
 * Customer messages for a cancelled order and a processed refund. Inside the
 * customer's 24-hour window the text is sent free-form, outside it as the
 * `order_cancelled` / `refund_processed` template. Consent gating, the admin
 * gate, `held_template_pending` and the NotificationLog stay in
 * `NotificationService.send`. Never throws: a messaging problem must not undo
 * a cancellation or a refund.
 */
import { connectDB } from '@/lib/mongodb';
import { OrderModel } from '@/models';
import { NotificationService } from '@/services/notification-service';
import { resolveMode } from '@/services/order-status-notifier';
import {
  orderCancelledParams,
  refundProcessedParams,
} from '@/lib/whatsapp-template-params';

export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', {
    maximumFractionDigits: 2,
  })}`;
}

interface OrderForMessage {
  orderNumber: string;
  origin?: string;
  userId?: { toString(): string };
}

async function loadCustomerOrder(
  orderId: string
): Promise<OrderForMessage | null> {
  await connectDB();
  const order = await OrderModel.findById(orderId)
    .select('orderNumber origin userId')
    .lean<OrderForMessage | null>();
  if (!order || order.origin !== 'customer' || !order.userId) return null;
  return order;
}

/** The sentence that goes after "has been cancelled." */
export function cancelledSentence(
  refund: 'on_its_way' | 'being_processed' | 'none',
  amountKobo?: number
): string {
  if (refund === 'on_its_way' && amountKobo) {
    return `A full refund of ${formatNaira(amountKobo)} is on its way.`;
  }
  if (refund === 'being_processed' && amountKobo) {
    return `We are processing your refund of ${formatNaira(amountKobo)} and will confirm it shortly.`;
  }
  return 'No payment was taken.';
}

export async function notifyOrderCancelled(
  orderId: string,
  sentence: string
): Promise<{ sent: boolean }> {
  try {
    const order = await loadCustomerOrder(orderId);
    if (!order) return { sent: false };
    const userId = order.userId!.toString();
    const mode = await resolveMode(userId);
    const params = orderCancelledParams({
      orderNumber: order.orderNumber,
      refundSentence: sentence,
    });
    const result = await NotificationService.send({
      userId,
      templateKey: 'order_cancelled',
      whatsapp: {
        params: params.bodyParams ?? [],
        ...(mode === 'free_form'
          ? {
              freeFormText: `Your Wawa Garden Bar order #${order.orderNumber} has been cancelled. ${sentence}`,
            }
          : {}),
      },
    });
    return { sent: result.success };
  } catch (error) {
    console.error('notifyOrderCancelled failed', orderId, error);
    return { sent: false };
  }
}

export async function notifyRefundProcessed(
  orderId: string,
  amountKobo: number
): Promise<{ sent: boolean }> {
  try {
    const order = await loadCustomerOrder(orderId);
    if (!order) return { sent: false };
    const userId = order.userId!.toString();
    const mode = await resolveMode(userId);
    const amountText = formatNaira(amountKobo);
    const params = refundProcessedParams({
      amountText,
      orderNumber: order.orderNumber,
    });
    const result = await NotificationService.send({
      userId,
      templateKey: 'refund_processed',
      whatsapp: {
        params: params.bodyParams ?? [],
        ...(mode === 'free_form'
          ? {
              freeFormText: `Your refund of ${amountText} for order #${order.orderNumber} has been processed. It can take 3–10 working days to reach your account.`,
            }
          : {}),
      },
    });
    return { sent: result.success };
  } catch (error) {
    console.error('notifyRefundProcessed failed', orderId, error);
    return { sent: false };
  }
}
