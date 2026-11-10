'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { OrderService } from '@/services';
import { OrderStatus, OrderType, IOrder } from '@/interfaces';
import { sessionOptions, SessionData } from '@/lib/session';
import { emitOrderStatusUpdate, emitOrderChange } from '@/lib/socket-server';

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Update order status (admin/kitchen use)
 */
export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<ActionResult<IOrder>> {
  try {
    // TODO: Add admin/kitchen authentication check
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );
    if (!session.userId) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    const order = await OrderService.updateOrderStatus(orderId, status, note);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    // Emit status update via WebSocket
    emitOrderStatusUpdate(orderId, status, order.estimatedWaitTime, note);

    // Emit update to kitchen
    emitOrderChange({
      orderId,
      status,
      action: 'updated',
    });

    // Revalidate paths
    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/admin/orders');

    // Serialize Mongoose document
    const serializedOrder = JSON.parse(JSON.stringify(order));

    return {
      success: true,
      message: 'Order status updated successfully',
      data: serializedOrder,
    };
  } catch (error) {
    console.error('Error updating order status:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update order status',
    };
  }
}

/**
 * Cancel order
 */
export async function cancelOrderAction(
  orderId: string,
  reason?: string
): Promise<ActionResult<IOrder>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Get order to verify ownership
    const existingOrder = await OrderService.getOrderById(orderId);
    if (!existingOrder) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    // Verify user owns the order (if logged in)
    if (session.userId && existingOrder.userId?.toString() !== session.userId) {
      return {
        success: false,
        error: 'Unauthorized to cancel this order',
      };
    }

    const order = await OrderService.cancelOrder(orderId, reason);

    if (!order) {
      return {
        success: false,
        error: 'Failed to cancel order',
      };
    }

    // Emit cancellation via WebSocket
    emitOrderStatusUpdate(
      orderId,
      'cancelled',
      undefined,
      reason || 'Order cancelled by customer'
    );

    // Emit update to kitchen
    emitOrderChange({
      orderId,
      status: 'cancelled',
      action: 'cancelled',
    });

    // Revalidate paths
    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    if (session.userId) {
      revalidatePath('/orders/history');
    }

    // Serialize Mongoose document
    const serializedOrder = JSON.parse(JSON.stringify(order));

    return {
      success: true,
      message: 'Order cancelled successfully',
      data: serializedOrder,
    };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order',
    };
  }
}

/**
 * Add review to order
 */
export async function addOrderReviewAction(
  orderId: string,
  rating: number,
  review?: string
): Promise<ActionResult<IOrder>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Get order to verify ownership
    const existingOrder = await OrderService.getOrderById(orderId);
    if (!existingOrder) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    // Verify user owns the order
    if (session.userId && existingOrder.userId?.toString() !== session.userId) {
      return {
        success: false,
        error: 'Unauthorized to review this order',
      };
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return {
        success: false,
        error: 'Rating must be between 1 and 5',
      };
    }

    const order = await OrderService.addReview(orderId, rating, review);

    if (!order) {
      return {
        success: false,
        error: 'Failed to add review',
      };
    }

    // Revalidate paths
    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    if (session?.userId) {
      revalidatePath('/orders/history');
    }

    // Serialize Mongoose document
    const serializedOrder = JSON.parse(JSON.stringify(order));

    return {
      success: true,
      message: 'Review added successfully',
      data: serializedOrder,
    };
  } catch (error) {
    console.error('Error adding review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add review',
    };
  }
}

/**
 * Get user's order history
 */
export async function getUserOrdersAction(options?: {
  limit?: number;
  skip?: number;
  status?: OrderStatus;
}): Promise<ActionResult<{ orders: IOrder[]; total: number }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    const result = await OrderService.getOrdersByUserId(
      session.userId!,
      options
    );

    // Serialize Mongoose documents
    const serializedResult = {
      ...result,
      orders: result.orders.map((order: any) =>
        JSON.parse(JSON.stringify(order))
      ),
    };

    return {
      success: true,
      data: serializedResult,
    };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orders',
    };
  }
}

/**
 * Get order by ID (with ownership verification)
 */
export async function getOrderAction(
  orderId: string
): Promise<ActionResult<IOrder>> {
  try {
    const order = await OrderService.getOrderById(orderId);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    // Verify ownership if user is logged in
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );
    if (session.userId && order.userId?.toString() !== session.userId) {
      return {
        success: false,
        error: 'Unauthorized to view this order',
      };
    }

    // Serialize Mongoose document
    const serializedOrder = JSON.parse(JSON.stringify(order));

    return {
      success: true,
      data: serializedOrder,
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order',
    };
  }
}

/**
 * Get order by order number (for guest tracking)
 */
export async function getOrderByNumberAction(
  orderNumber: string,
  email?: string
): Promise<ActionResult<IOrder>> {
  try {
    const order = await OrderService.getOrderByNumber(orderNumber);

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    // For guest orders, verify email
    if (order.guestEmail && email) {
      if (order.guestEmail.toLowerCase() !== email.toLowerCase()) {
        return {
          success: false,
          error: 'Invalid order number or email',
        };
      }
    }

    // Serialize Mongoose document
    const serializedOrder = JSON.parse(JSON.stringify(order));

    return {
      success: true,
      data: serializedOrder,
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order',
    };
  }
}

/**
 * Get active orders (for kitchen/admin dashboard)
 */
export async function getActiveOrdersAction(
  orderType?: OrderType
): Promise<ActionResult<IOrder[]>> {
  try {
    // TODO: Add admin/kitchen authentication check
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );
    if (!session.userId) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    const orders = await OrderService.getActiveOrders(orderType);

    // Serialize Mongoose documents
    const serializedOrders = orders.map((order: any) =>
      JSON.parse(JSON.stringify(order))
    );

    return {
      success: true,
      data: serializedOrders,
    };
  } catch (error) {
    console.error('Error fetching active orders:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch active orders',
    };
  }
}
