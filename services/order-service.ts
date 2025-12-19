import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/order-model';
import { IOrder, OrderType, OrderStatus } from '@/interfaces';
import { PriceHistoryService } from './price-history-service';

/**
 * Service for order CRUD operations
 */
export class OrderService {
  /**
   * Generate unique order number
   */
  private static async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const count = await Order.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    return `WG${year}${month}${day}${sequence}`;
  }

  /**
   * Calculate estimated wait time based on order type and current queue
   */
  private static async calculateEstimatedWaitTime(
    orderType: OrderType,
    itemCount: number
  ): Promise<number> {
    // Base preparation time per item (in minutes)
    const baseTimePerItem = 5;
    
    // Get active orders count
    const activeOrders = await Order.countDocuments({
      status: { $in: ['confirmed', 'preparing'] },
    });
    
    // Calculate base time
    let estimatedTime = itemCount * baseTimePerItem;
    
    // Add queue time (2 minutes per active order)
    estimatedTime += activeOrders * 2;
    
    // Add delivery time if applicable
    if (orderType === 'delivery') {
      estimatedTime += 30; // 30 minutes for delivery
    } else if (orderType === 'pickup') {
      estimatedTime += 5; // 5 minutes buffer for pickup
    }
    
    // Minimum wait time
    return Math.max(estimatedTime, 15);
  }

  /**
   * Enrich order items with cost snapshots and profitability calculations
   */
  private static async enrichOrderItemsWithCosts(
    items: IOrder['items']
  ): Promise<IOrder['items']> {
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        // Get current pricing for this menu item
        const pricing = await PriceHistoryService.getCurrentPricing(
          item.menuItemId.toString()
        );

        const costPerUnit = pricing?.costPerUnit || 0;
        const totalCost = costPerUnit * item.quantity;
        const grossProfit = item.subtotal - totalCost;
        const profitMargin =
          item.subtotal > 0 ? (grossProfit / item.subtotal) * 100 : 0;

        return {
          ...item,
          costPerUnit,
          totalCost,
          grossProfit,
          profitMargin,
        };
      })
    );

    return enrichedItems;
  }

  /**
   * Calculate operational costs based on order type
   */
  private static calculateOperationalCosts(
    orderType: OrderType,
    deliveryFee: number,
    total: number
  ): { delivery: number; packaging: number; processing: number } {
    const operationalCosts = {
      delivery: 0,
      packaging: 0,
      processing: 0,
    };

    // Delivery cost (driver payment - typically 60% of delivery fee)
    if (orderType === 'delivery' && deliveryFee > 0) {
      operationalCosts.delivery = deliveryFee * 0.6;
    }

    // Packaging cost (estimated based on order type)
    if (orderType === 'delivery') {
      operationalCosts.packaging = 100; // ₦100 for delivery packaging
    } else if (orderType === 'pickup') {
      operationalCosts.packaging = 50; // ₦50 for pickup packaging
    }

    // Payment processing fee (3% for card/gateway payments)
    // This will be updated when actual payment method is known
    operationalCosts.processing = total * 0.03;

    return operationalCosts;
  }

  /**
   * Create a new order
   */
  static async createOrder(orderData: {
    userId?: string;
    createdBy?: string;
    createdByRole?: 'admin' | 'super-admin' | 'customer';
    guestEmail?: string;
    guestName?: string;
    guestPhone?: string;
    orderType: OrderType;
    items: IOrder['items'];
    subtotal: number;
    tax: number;
    deliveryFee: number;
    discount: number;
    total: number;
    deliveryDetails?: IOrder['deliveryDetails'];
    pickupDetails?: IOrder['pickupDetails'];
    dineInDetails?: IOrder['dineInDetails'];
    specialInstructions?: string;
  }): Promise<IOrder> {
    await connectDB();

    const orderNumber = await this.generateOrderNumber();
    const estimatedWaitTime = await this.calculateEstimatedWaitTime(
      orderData.orderType,
      orderData.items.length
    );

    // Enrich items with cost snapshots and profitability data
    const enrichedItems = await this.enrichOrderItemsWithCosts(orderData.items);

    // Calculate total cost from items
    const totalCost = enrichedItems.reduce((sum, item) => sum + item.totalCost, 0);

    // Calculate operational costs
    const operationalCosts = this.calculateOperationalCosts(
      orderData.orderType,
      orderData.deliveryFee,
      orderData.total
    );

    // Calculate order-level profitability
    const totalOperationalCosts =
      operationalCosts.delivery + operationalCosts.packaging + operationalCosts.processing;
    const grossProfit = orderData.total - totalCost - totalOperationalCosts;
    const profitMargin = orderData.total > 0 ? (grossProfit / orderData.total) * 100 : 0;

    const order = await Order.create({
      ...orderData,
      items: enrichedItems,
      userId: orderData.userId ? new Types.ObjectId(orderData.userId) : undefined,
      createdBy: orderData.createdBy ? new Types.ObjectId(orderData.createdBy) : undefined,
      createdByRole: orderData.createdByRole || 'customer',
      orderNumber,
      estimatedWaitTime,
      status: 'pending',
      paymentStatus: 'pending',
      totalCost,
      grossProfit,
      profitMargin,
      operationalCosts,
    });

    // Deduct inventory immediately upon order creation
    try {
      const InventoryService = (await import('./inventory-service')).default;
      await InventoryService.deductStockForOrder(order._id.toString());
      
      // Mark inventory as deducted
      order.inventoryDeducted = true;
      order.inventoryDeductedAt = new Date();
      await order.save();
    } catch (error) {
      console.error('Error deducting inventory on order creation:', error);
      // Continue with order creation even if inventory deduction fails
      // This prevents blocking order creation due to inventory issues
    }

    return order.toObject();
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string): Promise<IOrder | null> {
    await connectDB();

    if (!Types.ObjectId.isValid(orderId)) {
      return null;
    }

    const order = await Order.findById(orderId)
      .populate('userId', 'name email phone')
      .lean();
    return order;
  }

  /**
   * Get order by order number
   */
  static async getOrderByNumber(orderNumber: string): Promise<IOrder | null> {
    await connectDB();

    const order = await Order.findOne({ orderNumber }).lean();
    return order;
  }

  /**
   * Get orders by user ID
   */
  static async getOrdersByUserId(
    userId: string,
    options?: {
      limit?: number;
      skip?: number;
      status?: OrderStatus;
    }
  ): Promise<{ orders: IOrder[]; total: number }> {
    await connectDB();

    if (!Types.ObjectId.isValid(userId)) {
      return { orders: [], total: 0 };
    }

    const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (options?.status) {
      query.status = options.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .limit(options?.limit || 10)
        .skip(options?.skip || 0)
        .lean(),
      Order.countDocuments(query),
    ]);

    return { orders, total };
  }

  /**
   * Get orders by guest email
   */
  static async getOrdersByGuestEmail(
    email: string,
    options?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<{ orders: IOrder[]; total: number }> {
    await connectDB();

    const query = { guestEmail: email.toLowerCase() };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .limit(options?.limit || 10)
        .skip(options?.skip || 0)
        .lean(),
      Order.countDocuments(query),
    ]);

    return { orders, total };
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string
  ): Promise<IOrder | null> {
    await connectDB();

    if (!Types.ObjectId.isValid(orderId)) {
      return null;
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            timestamp: new Date(),
            note,
          },
        },
      },
      { new: true }
    ).lean();

    return order;
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    orderId: string,
    paymentData: {
      paymentStatus: IOrder['paymentStatus'];
      paymentReference?: string;
      transactionReference?: string;
      paidAt?: Date;
    }
  ): Promise<IOrder | null> {
    await connectDB();

    if (!Types.ObjectId.isValid(orderId)) {
      return null;
    }

    const updateData: Record<string, unknown> = {
      paymentStatus: paymentData.paymentStatus,
    };

    if (paymentData.paymentReference) {
      updateData.paymentReference = paymentData.paymentReference;
    }
    if (paymentData.transactionReference) {
      updateData.transactionReference = paymentData.transactionReference;
    }
    if (paymentData.paidAt) {
      updateData.paidAt = paymentData.paidAt;
    }

    // If payment is successful, update order status to confirmed
    if (paymentData.paymentStatus === 'paid') {
      updateData.status = 'confirmed';
      updateData.$push = {
        statusHistory: {
          status: 'confirmed',
          timestamp: new Date(),
          note: 'Payment confirmed',
        },
      };
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    ).lean();

    return order;
  }

  /**
   * Cancel order
   */
  static async cancelOrder(
    orderId: string,
    reason?: string
  ): Promise<IOrder | null> {
    await connectDB();

    if (!Types.ObjectId.isValid(orderId)) {
      return null;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return null;
    }

    // Only allow cancellation of pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new Error('Order cannot be cancelled at this stage');
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: reason || 'Order cancelled by customer',
    });

    await order.save();

    // Restore inventory if it was deducted
    if (order.inventoryDeducted) {
      try {
        const InventoryService = (await import('./inventory-service')).default;
        await InventoryService.restoreStockForOrder(orderId);
      } catch (error) {
        console.error('Error restoring inventory:', error);
        // Don't fail the cancellation if inventory restoration fails
      }
    }

    return order.toObject();
  }

  /**
   * Add rating and review to completed order
   */
  static async addReview(
    orderId: string,
    rating: number,
    review?: string
  ): Promise<IOrder | null> {
    await connectDB();

    if (!Types.ObjectId.isValid(orderId)) {
      return null;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return null;
    }

    // Only allow reviews for completed orders
    if (order.status !== 'completed') {
      throw new Error('Can only review completed orders');
    }

    order.rating = rating;
    if (review) {
      order.review = review;
    }

    await order.save();
    return order.toObject();
  }

  /**
   * Get active orders (for kitchen/admin dashboard)
   */
  static async getActiveOrders(orderType?: OrderType): Promise<IOrder[]> {
    await connectDB();

    const query: Record<string, unknown> = {
      status: { $in: ['confirmed', 'preparing', 'ready', 'out-for-delivery'] },
    };

    if (orderType) {
      query.orderType = orderType;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: 1 })
      .lean();

    return orders;
  }

  /**
   * Get recent orders
   */
  static async getRecentOrders(limit: number = 10): Promise<IOrder[]> {
    await connectDB();

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return orders;
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(startDate?: Date, endDate?: Date): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    ordersByType: Record<OrderType, number>;
  }> {
    await connectDB();

    const dateQuery: Record<string, unknown> = {};
    if (startDate || endDate) {
      const createdAtQuery: Record<string, Date> = {};
      if (startDate) {
        createdAtQuery.$gte = startDate;
      }
      if (endDate) {
        createdAtQuery.$lte = endDate;
      }
      dateQuery.createdAt = createdAtQuery;
    }

    const [totalStats, statusStats, typeStats] = await Promise.all([
      Order.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
          },
        },
      ]),
      Order.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: '$orderType',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = totalStats[0] || { totalOrders: 0, totalRevenue: 0 };
    const ordersByStatus = statusStats.reduce(
      (acc, item) => {
        acc[item._id as OrderStatus] = item.count;
        return acc;
      },
      {} as Record<OrderStatus, number>
    );
    const ordersByType = typeStats.reduce(
      (acc, item) => {
        acc[item._id as OrderType] = item.count;
        return acc;
      },
      {} as Record<OrderType, number>
    );

    return {
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      averageOrderValue:
        stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0,
      ordersByStatus,
      ordersByType,
    };
  }

  /**
   * Complete order payment manually (admin)
   * For cash, transfer, or POS card payments
   */
  static async completeOrderPaymentManually(params: {
    orderId: string;
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
    processedByAdminId: string;
  }): Promise<IOrder> {
    await connectDB();

    if (!Types.ObjectId.isValid(params.orderId)) {
      throw new Error('Invalid order ID');
    }

    const order = await Order.findById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      throw new Error('This order has already been paid');
    }

    if (order.status === 'cancelled') {
      throw new Error('Cannot process payment for cancelled orders');
    }

    // Check if order belongs to a settling tab
    if (order.tabId) {
      const TabModel = (await import('@/models/tab-model')).default;
      const tab = await TabModel.findById(order.tabId);
      if (tab && tab.status === 'settling') {
        throw new Error('Cannot process payment for orders in settling tabs. Please process payment through the tab.');
      }
    }

    // Validate payment reference
    if (!params.paymentReference || params.paymentReference.trim().length < 3) {
      throw new Error('Payment reference must be at least 3 characters');
    }

    // Update order payment status
    order.paymentStatus = 'paid';
    order.paymentMethod = params.paymentType;
    order.paymentReference = params.paymentReference;
    order.paidAt = new Date();

    // Update order status to confirmed if still pending
    if (order.status === 'pending') {
      order.status = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        timestamp: new Date(),
        note: `Payment confirmed manually by admin (${params.paymentType})`,
      });
    }

    await order.save();

    // Deduct inventory if not already deducted
    if (!order.inventoryDeducted) {
      try {
        const InventoryService = (await import('./inventory-service')).default;
        await InventoryService.deductStockForOrder(params.orderId);
        order.inventoryDeducted = true;
        order.inventoryDeductedAt = new Date();
        await order.save();
      } catch (error) {
        console.error('Error deducting inventory:', error);
      }
    }

    // Calculate and issue rewards if user is logged in
    if (order.userId) {
      try {
        const { RewardsService } = await import('./rewards-service');
        await RewardsService.calculateReward(
          order.userId.toString(),
          params.orderId,
          order.total
        );
      } catch (error) {
        console.error('Error calculating rewards:', error);
      }
    }

    // Create audit log
    try {
      const { AuditLogService } = await import('./audit-log-service');
      const UserModel = (await import('@/models/user-model')).default;
      const admin = await UserModel.findById(params.processedByAdminId);
      
      await AuditLogService.createLog({
        userId: params.processedByAdminId,
        userEmail: admin?.email || 'unknown',
        userRole: admin?.role || 'admin',
        action: 'order.manual_payment',
        resource: 'order',
        resourceId: params.orderId,
        details: {
          orderNumber: order.orderNumber,
          paymentType: params.paymentType,
          paymentReference: params.paymentReference,
          comments: params.comments,
          totalAmount: order.total,
        },
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }

    return order.toObject();
  }
}
