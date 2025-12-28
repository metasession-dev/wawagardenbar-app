'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { OrderService } from '@/services';
import { OrderStatus, OrderType, IOrder } from '@/interfaces';
import { sessionOptions, SessionData } from '@/lib/session';
import {
  emitOrderStatusUpdate,
  emitNewOrder,
  emitOrderChange,
} from '@/lib/socket-server';

export interface CreateOrderActionInput {
  orderType: OrderType;
  items: IOrder['items'];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  deliveryDetails?: IOrder['deliveryDetails'];
  pickupDetails?: IOrder['pickupDetails'];
  dineInDetails?: IOrder['dineInDetails'];
  specialInstructions?: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Create a new order
 */
export async function createOrderAction(
  input: CreateOrderActionInput
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    // Get user session if available
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    const userId = session.userId;

    // Validate required fields
    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        error: 'Order must contain at least one item',
      };
    }

    // Validate customer info (either user or guest)
    if (!userId && (!input.guestEmail || !input.guestName || !input.guestPhone)) {
      return {
        success: false,
        error: 'Customer information is required',
      };
    }

    // Validate order type specific details
    if (input.orderType === 'delivery' && !input.deliveryDetails) {
      return {
        success: false,
        error: 'Delivery details are required for delivery orders',
      };
    }

    if (input.orderType === 'pickup' && !input.pickupDetails) {
      return {
        success: false,
        error: 'Pickup details are required for pickup orders',
      };
    }

    if (input.orderType === 'dine-in' && !input.dineInDetails) {
      return {
        success: false,
        error: 'Table number is required for dine-in orders',
      };
    }

    // Create order
    const order = await OrderService.createOrder({
      userId,
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      orderType: input.orderType,
      items: input.items.map(item => ({
        ...item,
        portionSize: item.portionSize || 'full', // Ensure portionSize is set
      })),
      subtotal: input.subtotal,
      tax: input.tax,
      deliveryFee: input.deliveryFee,
      discount: input.discount,
      total: input.total,
      deliveryDetails: input.deliveryDetails,
      pickupDetails: input.pickupDetails,
      dineInDetails: input.dineInDetails,
      specialInstructions: input.specialInstructions,
    });

    // Emit new order to kitchen via WebSocket
    emitNewOrder({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      itemCount: order.items.length,
      total: order.total,
      items: order.items.map((item: any) => ({
        menuItemId: item.menuItemId?.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        portionSize: item.portionSize,
        subtotal: item.subtotal,
        customizations: item.customizations || [],
      })),
      customer: {
        name: input.guestName || 'Guest',
        email: input.guestEmail,
        phone: input.guestPhone,
      },
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    });

    // Revalidate relevant paths
    revalidatePath('/orders');
    if (session.userId) {
      revalidatePath('/orders/history');
    }

    return {
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      },
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
    };
  }
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
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
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
    emitOrderStatusUpdate(
      orderId,
      status,
      order.estimatedWaitTime,
      note
    );

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
      error: error instanceof Error ? error.message : 'Failed to update order status',
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
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
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
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
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
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
    if (!session.userId) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    const result = await OrderService.getOrdersByUserId(session.userId!, options);

    // Serialize Mongoose documents
    const serializedResult = {
      ...result,
      orders: result.orders.map((order: any) => JSON.parse(JSON.stringify(order))),
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
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
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
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.userId) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    const orders = await OrderService.getActiveOrders(orderType);

    // Serialize Mongoose documents
    const serializedOrders = orders.map((order: any) => JSON.parse(JSON.stringify(order)));

    return {
      success: true,
      data: serializedOrders,
    };
  } catch (error) {
    console.error('Error fetching active orders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch active orders',
    };
  }
}
