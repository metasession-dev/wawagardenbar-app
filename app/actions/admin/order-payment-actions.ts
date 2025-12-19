'use server';

import { requireAdmin } from '@/lib/auth-middleware';
import { OrderService } from '@/services/order-service';
import { revalidatePath } from 'next/cache';
import { emitOrderUpdated } from '@/lib/socket-server';

export interface CompleteOrderPaymentManuallyInput {
  orderId: string;
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference: string;
  comments?: string;
}

export async function completeOrderPaymentManuallyAction(
  input: CompleteOrderPaymentManuallyInput
) {
  try {
    const session = await requireAdmin();

    if (!session.userId) {
      return {
        success: false,
        message: 'User session invalid',
      };
    }

    const order = await OrderService.completeOrderPaymentManually({
      orderId: input.orderId,
      paymentType: input.paymentType,
      paymentReference: input.paymentReference,
      comments: input.comments,
      processedByAdminId: session.userId,
    });

    revalidatePath(`/dashboard/orders/${input.orderId}`);
    revalidatePath('/dashboard/orders');

    emitOrderUpdated({
      orderId: order._id.toString(),
      updates: {
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference,
        paidAt: order.paidAt,
      },
      action: 'manual_payment',
      status: order.status,
      updatedBy: session.userId,
    });

    return {
      success: true,
      message: 'Payment processed successfully',
      order: JSON.parse(JSON.stringify(order)),
    };
  } catch (error) {
    console.error('Error processing manual payment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process payment',
    };
  }
}
