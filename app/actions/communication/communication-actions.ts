'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { OrderService, SystemSettingsService } from '@/services';
import { UserModel } from '@/models';
import { sessionOptions, SessionData } from '@/lib/session';
import {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendOrderCancellationEmail,
  sendSupportTicketEmail,
} from '@/lib/email';
import { SMSService } from '@/lib/sms';
import { emitOrderStatusUpdate, emitOrderChange } from '@/lib/socket-server';
import { NotificationService } from '@/services/notification-service';

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Send order confirmation email (called after order creation)
 */
export async function sendOrderConfirmationAction(
  orderId: string
): Promise<ActionResult> {
  try {
    const order = await OrderService.getOrderById(orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Check notification preferences
    const settings = await SystemSettingsService.getNotificationSettings();

    // Get phone number
    let phone = order.guestPhone;
    if (!phone && order.userId) {
      const user = await UserModel.findById(order.userId).select('phone');
      if (user) phone = user.phone;
    }

    // Send SMS if enabled
    if (
      settings.smsEnabled &&
      (settings.channels.orders === 'sms' ||
        settings.channels.orders === 'both') &&
      phone
    ) {
      const smsResult = await SMSService.sendOrderConfirmationSMS(
        phone,
        order.orderNumber,
        order.total,
        order.estimatedWaitTime
      );

      if (!smsResult.success) {
        console.error('Failed to send order confirmation SMS:', smsResult);
      }
    }

    // Send Email if enabled/fallback
    if (
      settings.channels.orders === 'email' ||
      settings.channels.orders === 'both' ||
      !settings.smsEnabled
    ) {
      const email = order.userId
        ? order.guestEmail || ''
        : order.guestEmail || '';

      if (!email) {
        // Only fail if email was strictly required or no phone was available for SMS
        if (!phone || settings.channels.orders === 'email') {
          return { success: false, error: 'No email address found' };
        }
      } else {
        // REQ-054 — route through NotificationService so WhatsApp can
        // fire first (when the user is signed in, their
        // whatsappTransactional consent is on, and the order_confirmation
        // template is approved). Falls back to email otherwise — same
        // UX as today when ENABLE_WHATSAPP_NOTIFICATIONS is off or the
        // template isn't approved yet. Caller still owns the email
        // content shape via the closure.
        await NotificationService.send({
          userId: order.userId ? String(order.userId) : null,
          templateKey: 'order_confirmation',
          whatsapp:
            order.userId && phone
              ? {
                  params: [
                    order.orderNumber,
                    `₦${order.total.toLocaleString()}`,
                    order.estimatedWaitTime
                      ? `${order.estimatedWaitTime} minutes`
                      : 'Soon',
                  ],
                }
              : undefined,
          email: () =>
            sendOrderConfirmationEmail(email, {
              orderNumber: order.orderNumber,
              orderType: order.orderType,
              items: order.items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.subtotal,
              })),
              total: order.total,
              estimatedWaitTime: order.estimatedWaitTime,
            }),
        });
      }
    }

    return {
      success: true,
      message: 'Confirmation notification sent',
    };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return {
      success: false,
      error: 'Failed to send confirmation email',
    };
  }
}

/**
 * Send order status update notification (email + WebSocket)
 */
export async function sendOrderStatusNotificationAction(
  orderId: string,
  newStatus: string,
  note?: string
): Promise<ActionResult> {
  try {
    const order = await OrderService.getOrderById(orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Send WebSocket notification
    emitOrderStatusUpdate(
      orderId,
      newStatus as any,
      order.estimatedWaitTime,
      note
    );

    // Check notification preferences
    const settings = await SystemSettingsService.getNotificationSettings();

    // Get phone number
    let phone = order.guestPhone;
    if (!phone && order.userId) {
      const user = await UserModel.findById(order.userId).select('phone');
      if (user) phone = user.phone;
    }

    // Send SMS if enabled
    if (
      settings.smsEnabled &&
      (settings.channels.orders === 'sms' ||
        settings.channels.orders === 'both') &&
      phone
    ) {
      const smsResult = await SMSService.sendOrderStatusSMS(
        phone,
        order.orderNumber,
        newStatus
      );

      if (!smsResult.success) {
        console.error('Failed to send status update SMS:', smsResult);
      }
    }

    // Send email notification
    if (
      settings.channels.orders === 'email' ||
      settings.channels.orders === 'both' ||
      !settings.smsEnabled
    ) {
      const email = order.userId
        ? order.guestEmail || ''
        : order.guestEmail || '';

      if (email) {
        const statusMessages: Record<string, string> = {
          confirmed: 'Your order has been confirmed and is being prepared.',
          preparing: 'Our kitchen is preparing your order.',
          ready: 'Your order is ready!',
          'out-for-delivery': 'Your order is on the way!',
          delivered: 'Your order has been delivered. Enjoy!',
          completed: 'Your order is complete. Thank you!',
        };

        await sendOrderStatusUpdateEmail(
          email,
          order.orderNumber,
          newStatus,
          note ||
            statusMessages[newStatus] ||
            'Your order status has been updated.'
        );
      }
    }

    return {
      success: true,
      message: 'Status notification sent',
    };
  } catch (error) {
    console.error('Error sending status notification:', error);
    return {
      success: false,
      error: 'Failed to send status notification',
    };
  }
}

/**
 * Request order modification
 */
export async function requestOrderModificationAction(input: {
  orderId: string;
  modificationType:
    | 'add-items'
    | 'remove-items'
    | 'change-time'
    | 'change-address'
    | 'other';
  details: string;
}): Promise<ActionResult<{ requestId: string }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    const order = await OrderService.getOrderById(input.orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Verify ownership
    if (order.userId && session.userId) {
      if (order.userId.toString() !== session.userId) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    // Check if order can be modified
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      return {
        success: false,
        error: 'Order cannot be modified at this stage',
      };
    }

    // Generate request ID
    const requestId = `MOD-${Date.now()}`;

    // In a real app, save modification request to database
    // For now, we'll just emit to kitchen
    emitOrderChange({
      orderId: input.orderId,
      status: order.status,
      action: 'updated',
    });

    return {
      success: true,
      message:
        'Modification request submitted. Our team will contact you shortly.',
      data: { requestId },
    };
  } catch (error) {
    console.error('Error requesting order modification:', error);
    return {
      success: false,
      error: 'Failed to submit modification request',
    };
  }
}

/**
 * Cancel order with refund logic
 */
export async function cancelOrderWithRefundAction(input: {
  orderId: string;
  reason: string;
}): Promise<ActionResult<{ refundAmount: number }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    const order = await OrderService.getOrderById(input.orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Verify ownership
    if (order.userId && session.userId) {
      if (order.userId.toString() !== session.userId) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    // Check if order can be cancelled
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      return {
        success: false,
        error: 'Order cannot be cancelled at this stage',
      };
    }

    // Calculate refund amount based on order status
    let refundAmount = 0;
    if (order.paymentStatus === 'paid') {
      if (order.status === 'pending' || order.status === 'confirmed') {
        refundAmount = order.total; // Full refund
      } else if (order.status === 'preparing') {
        refundAmount = Math.floor(order.total * 0.5); // 50% refund
      }
      // No refund if ready or out for delivery
    }

    // Cancel the order
    const cancelResult = await OrderService.cancelOrder(
      input.orderId,
      input.reason
    );

    if (!cancelResult) {
      return { success: false, error: 'Failed to cancel order' };
    }

    // Process refund if applicable
    if (refundAmount > 0 && order.paymentReference) {
      try {
        // TODO: Implement PaymentService.initiateRefund when Monnify refund API is available
        // For now, just update payment status to refunded

        // Update payment status
        await OrderService.updatePaymentStatus(input.orderId, {
          paymentStatus: 'refunded',
        });
      } catch (refundError) {
        console.error('Refund processing error:', refundError);
        // Continue even if refund fails - will be handled manually
      }
    }

    // Send notifications
    const email = order.userId
      ? order.guestEmail || ''
      : order.guestEmail || '';

    if (email) {
      await sendOrderCancellationEmail(
        email,
        order.orderNumber,
        refundAmount,
        input.reason
      );
    }

    // Emit to kitchen
    emitOrderChange({
      orderId: input.orderId,
      status: 'cancelled',
      action: 'cancelled',
    });

    revalidatePath('/orders');
    revalidatePath(`/orders/${input.orderId}`);

    return {
      success: true,
      message:
        refundAmount > 0
          ? `Order cancelled. Refund of ₦${refundAmount.toLocaleString()} will be processed within 5-7 business days.`
          : 'Order cancelled successfully.',
      data: { refundAmount },
    };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      error: 'Failed to cancel order',
    };
  }
}

/**
 * Submit support ticket
 */
export async function submitSupportTicketAction(input: {
  category:
    | 'order-issue'
    | 'payment-issue'
    | 'delivery-issue'
    | 'account-issue'
    | 'feedback'
    | 'other';
  subject: string;
  message: string;
  orderId?: string;
}): Promise<ActionResult<{ ticketNumber: string }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}`;

    // Get user email
    let email = '';
    if (session.userId) {
      // Get from user model
      email = session.email || '';
    }

    if (!email) {
      return { success: false, error: 'Email address required' };
    }

    // In a real app, save ticket to database
    // For now, send email confirmation
    await sendSupportTicketEmail(email, {
      ticketNumber,
      category: input.category,
      subject: input.subject,
      message: input.message,
    });

    return {
      success: true,
      message:
        'Support ticket submitted successfully. We will respond within 24 hours.',
      data: { ticketNumber },
    };
  } catch (error) {
    console.error('Error submitting support ticket:', error);
    return {
      success: false,
      error: 'Failed to submit support ticket',
    };
  }
}

/**
 * Submit order rating and review
 */
export async function submitOrderReviewAction(input: {
  orderId: string;
  rating: number;
  review?: string;
}): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId) {
      return { success: false, error: 'User must be logged in' };
    }

    const order = await OrderService.getOrderById(input.orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Verify ownership
    if (order.userId && order.userId.toString() !== session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if order is completed
    if (order.status !== 'completed' && order.status !== 'delivered') {
      return {
        success: false,
        error: 'Order must be completed before reviewing',
      };
    }

    // Check if already reviewed
    if (order.rating) {
      return {
        success: false,
        error: 'Order has already been reviewed',
      };
    }

    // Validate rating
    if (input.rating < 1 || input.rating > 5) {
      return {
        success: false,
        error: 'Rating must be between 1 and 5',
      };
    }

    // Add review
    await OrderService.addReview(input.orderId, input.rating, input.review);

    revalidatePath(`/orders/${input.orderId}`);
    revalidatePath('/orders/history');

    return {
      success: true,
      message: 'Thank you for your feedback!',
    };
  } catch (error) {
    console.error('Error submitting review:', error);
    return {
      success: false,
      error: 'Failed to submit review',
    };
  }
}
