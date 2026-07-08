import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/order-model';
import { IOrder, OrderType, OrderStatus } from '@/interfaces';
import { PriceHistoryService } from './price-history-service';
import { deriveBusinessDate } from '@/lib/business-date';
import { SystemSettingsService } from './system-settings-service';

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
    createdByRole?: import('@/interfaces').UserRole;
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
    const totalCost = enrichedItems.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );

    // Calculate operational costs
    const operationalCosts = this.calculateOperationalCosts(
      orderData.orderType,
      orderData.deliveryFee,
      orderData.total
    );

    // Calculate order-level profitability
    const totalOperationalCosts =
      operationalCosts.delivery +
      operationalCosts.packaging +
      operationalCosts.processing;
    const grossProfit = orderData.total - totalCost - totalOperationalCosts;
    const profitMargin =
      orderData.total > 0 ? (grossProfit / orderData.total) * 100 : 0;

    const order = await Order.create({
      ...orderData,
      items: enrichedItems,
      userId: orderData.userId
        ? new Types.ObjectId(orderData.userId)
        : undefined,
      createdBy: orderData.createdBy
        ? new Types.ObjectId(orderData.createdBy)
        : undefined,
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

    // REQ-066 — inventory deduction is OWNED by `OrderService.completeOrder`
    // (called from the kitchen-display action). Order-create no longer
    // deducts; the order moves through pending → confirmed → preparing →
    // ready → completed and inventory drops on the final transition.

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

    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
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
  /**
   * @requirement REQ-025 - Accept optional businessDate override; auto-derive if not supplied
   */
  static async updatePaymentStatus(
    orderId: string,
    paymentData: {
      paymentStatus: IOrder['paymentStatus'];
      paymentReference?: string;
      transactionReference?: string;
      paidAt?: Date;
      businessDate?: Date;
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
    if (paymentData.paymentStatus === 'paid') {
      if (paymentData.businessDate) {
        updateData.businessDate = paymentData.businessDate;
      } else {
        const cutoff = await SystemSettingsService.getBusinessDayCutoff();
        updateData.businessDate = deriveBusinessDate(new Date(), cutoff);
      }
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

    const order = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    }).lean();

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
        try {
          const { IncidentEventService } = await import(
            './incident-event-service'
          );
          await IncidentEventService.recordIncident({
            kind: 'inventory_deduction_failed',
            entityId: orderId,
            summary: `Inventory restoration failed for cancelled order ${orderId}`,
            errorDetails: {
              message: error instanceof Error ? error.message : String(error),
            },
          });
        } catch {
          // IncidentEvent write failure must not abort the cancel
        }
      }
    }

    // Reverse loyalty points spent/earned on the order (REQ-048 / #117 P0 #2).
    // Logged, not swallowed silently: a failure here is lost customer value.
    if (order.userId) {
      try {
        const { PointsService } = await import('./points-service');
        await PointsService.reverseOrderTransactions(order.userId, orderId);
      } catch (error) {
        console.error(
          `[REQ-048] Failed to reverse points for cancelled order ${orderId}:`,
          error
        );
        try {
          const { IncidentEventService } = await import(
            './incident-event-service'
          );
          await IncidentEventService.recordIncident({
            kind: 'points_award_failed',
            entityId: orderId,
            summary: `Points reversal failed for cancelled order ${orderId}`,
            errorDetails: {
              message: error instanceof Error ? error.message : String(error),
              userId: String(order.userId),
            },
          });
        } catch {
          // IncidentEvent write failure must not abort the cancel
        }
      }
    }

    // Restore any rewards redeemed in the order back to active (REQ-048).
    try {
      const { RewardsService } = await import('./rewards-service');
      await RewardsService.restoreRedeemedRewards(orderId);
    } catch (error) {
      console.error(
        `[REQ-048] Failed to restore rewards for cancelled order ${orderId}:`,
        error
      );
      try {
        const { IncidentEventService } = await import(
          './incident-event-service'
        );
        await IncidentEventService.recordIncident({
          kind: 'reward_grant_failed',
          entityId: orderId,
          summary: `Reward restoration failed for cancelled order ${orderId}`,
          errorDetails: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      } catch {
        // IncidentEvent write failure must not abort the cancel
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

    const orders = await Order.find(query).sort({ createdAt: 1 }).lean();

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
  static async getOrderStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    ordersByType: Record<OrderType, number>;
    /**
     * Per-type revenue (sum of `Order.total` grouped by `Order.orderType`).
     * Companion to `ordersByType` — counts answer "how many", this answers
     * "how much". Every enum value is present (0 when absent) so the
     * caller can iterate the canonical display order without null-checks.
     */
    revenueByType: Record<OrderType, number>;
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
      // Single pipeline returns both count + revenue per orderType.
      // One round-trip; no extra query vs the previous count-only shape.
      Order.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: '$orderType',
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
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
    const ordersByType: Record<OrderType, number> = {
      'dine-in': 0,
      delivery: 0,
      pickup: 0,
      'pay-now': 0,
    };
    const revenueByType: Record<OrderType, number> = {
      'dine-in': 0,
      delivery: 0,
      pickup: 0,
      'pay-now': 0,
    };
    for (const item of typeStats) {
      const t = item._id as OrderType | null;
      if (t && t in ordersByType) {
        ordersByType[t] = item.count ?? 0;
        revenueByType[t] = item.revenue ?? 0;
      }
    }

    return {
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      averageOrderValue:
        stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0,
      ordersByStatus,
      ordersByType,
      revenueByType,
    };
  }

  /**
   * Complete order payment manually (admin)
   * For cash, transfer, or POS card payments.
   *
   * @requirement REQ-035 — accepts optional `tipAmount` + `tipPaymentMethod`.
   * Validates: tipAmount >= 0; if tipAmount > 0 then tipPaymentMethod must be
   * supplied and in PAYMENT_METHODS_EXPRESS. Persists both fields. Order.total
   * already includes the tip (existing behaviour from REQ-013 era).
   */
  static async completeOrderPaymentManually(params: {
    orderId: string;
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
    processedByAdminId: string;
    tipAmount?: number;
    tipPaymentMethod?: 'cash' | 'transfer' | 'card';
  }): Promise<IOrder> {
    await connectDB();

    if (!Types.ObjectId.isValid(params.orderId)) {
      throw new Error('Invalid order ID');
    }

    // REQ-035 — guard tip params before touching the DB.
    const tipAmount = params.tipAmount ?? 0;
    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      throw new Error('tipAmount must be a non-negative number');
    }
    if (tipAmount > 0) {
      if (!params.tipPaymentMethod) {
        throw new Error('tipPaymentMethod is required when tipAmount > 0');
      }
      if (!['cash', 'transfer', 'card'].includes(params.tipPaymentMethod)) {
        throw new Error(
          `tipPaymentMethod must be one of cash/transfer/card; got ${params.tipPaymentMethod}`
        );
      }
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
        throw new Error(
          'Cannot process payment for orders in settling tabs. Please process payment through the tab.'
        );
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

    // REQ-035 — persist tip fields. For express-flow orders, `total` is
    // bill-only (subtotal). For customer-checkout orders, `total` is
    // already inflated by tipAmount upstream (see app/actions/payment/
    // payment-actions.ts). Either way, this service just stores what
    // was passed in; the daily-report aggregator pulls tipsBreakdown
    // from `tipAmount` and `tipPaymentMethod` directly.
    if (tipAmount > 0) {
      order.tipAmount = tipAmount;
      order.tipPaymentMethod = params.tipPaymentMethod;
    }
    if ((params as any).businessDate) {
      order.businessDate = (params as any).businessDate;
    } else {
      const cutoff = await SystemSettingsService.getBusinessDayCutoff();
      order.businessDate = deriveBusinessDate(new Date(), cutoff);
    }

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

    // REQ-066 — inventory deduction is OWNED by `OrderService.completeOrder`
    // (kitchen-display completion). Manual payment capture flips status
    // to `confirmed`; the order still moves through the kitchen-display
    // lifecycle to `completed` where the deduction fires.

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
        try {
          const { IncidentEventService } = await import(
            './incident-event-service'
          );
          await IncidentEventService.recordIncident({
            kind: 'reward_grant_failed',
            entityId: params.orderId,
            summary: `Reward calculation failed for order ${params.orderId}`,
            errorDetails: {
              message: error instanceof Error ? error.message : String(error),
              userId: String(order.userId),
            },
          });
        } catch {
          // IncidentEvent write failure must not abort the payment capture
        }
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

  /**
   * @requirement REQ-066 — Canonical completion chokepoint
   *
   * The ONLY place in the codebase that sets `Order.status = 'completed'`
   * and triggers the inventory deduction. The kitchen-display action
   * (and any other admin path that wants to complete an order) routes
   * through here. The 6 historical inline `deductStockForOrder` call
   * sites (OrderService.createOrder + captureManualPayment, both payment
   * webhooks, both TabService sites) have been removed.
   *
   * On a deduction throw the function writes an `IncidentEvent` row
   * tagged `inventory_deduction_failed` and returns success — the kitchen
   * workflow MUST NOT stall on an inventory-side error. The 15-min
   * reconciliation cron retries from there.
   */
  static async completeOrder(opts: {
    orderId: string;
    actorUserId: string;
    actorRole: string;
    note?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    alreadyCompleted?: boolean;
    /**
     * REQ-066 AC9 — set when the kitchen-completion succeeded (status flipped,
     * IncidentEvent written) but the inventory deduction threw. Callers use
     * this to surface a UI warning instead of a "Success" toast.
     */
    deductionFailed?: boolean;
    deductionError?: string;
  }> {
    await connectDB();

    if (!Types.ObjectId.isValid(opts.orderId)) {
      return { success: false, error: 'Invalid order ID' };
    }

    const order = await Order.findById(opts.orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.status === 'cancelled') {
      return { success: false, error: 'Cannot complete a cancelled order' };
    }

    if (order.status === 'completed' && order.inventoryDeducted) {
      return { success: true, alreadyCompleted: true };
    }

    const previousStatus = order.status;
    if (order.status !== 'completed') {
      order.status = 'completed';
      order.statusHistory.push({
        status: 'completed',
        timestamp: new Date(),
        note: opts.note ?? `Completed by ${opts.actorRole}`,
      });
    }

    let incidentWritten = false;
    let deductionError: string | undefined;
    if (!order.inventoryDeducted) {
      try {
        const InventoryService = (await import('./inventory-service')).default;
        const result = await InventoryService.deductStockForOrder(opts.orderId);

        order.inventoryDeductionDetails = result.results.map((r) => ({
          menuItemId: new Types.ObjectId(r.menuItemId),
          itemName: r.itemName,
          status: r.status === 'skipped' ? 'deducted' : r.status,
          error: r.error,
          deductedAt:
            r.status === 'deducted' || r.status === 'skipped'
              ? new Date()
              : undefined,
          quantity: r.quantity,
          linkedDeductions: r.linkedResults.map((lr) => ({
            inventoryId: new Types.ObjectId(lr.inventoryId),
            status: lr.status,
            error: lr.error,
          })),
        }));

        if (result.allSucceeded) {
          order.inventoryDeducted = true;
          order.inventoryDeductedAt = new Date();
          order.inventoryDeductedBy =
            opts.actorUserId as unknown as Types.ObjectId;
        } else {
          deductionError = 'Some items could not be deducted';
          try {
            const { IncidentEventService } = await import(
              './incident-event-service'
            );
            await IncidentEventService.recordIncident({
              kind: 'inventory_deduction_failed',
              entityId: opts.orderId,
              summary: 'Partial inventory deduction failure',
              errorDetails: {
                message: deductionError,
                actorUserId: opts.actorUserId,
                actorRole: opts.actorRole,
                deductedItems: result.results.filter(
                  (r) => r.status === 'deducted'
                ),
                failedItems: result.results.filter(
                  (r) => r.status === 'failed'
                ),
                skippedItems: result.results.filter(
                  (r) => r.status === 'skipped'
                ),
              },
            });
            incidentWritten = true;
          } catch (logErr) {
            console.error(
              '[OrderService.completeOrder] IncidentEvent write also failed:',
              logErr
            );
          }
        }
      } catch (error) {
        deductionError = error instanceof Error ? error.message : String(error);
        try {
          const { IncidentEventService } = await import(
            './incident-event-service'
          );
          await IncidentEventService.recordIncident({
            kind: 'inventory_deduction_failed',
            entityId: opts.orderId,
            summary: 'deductStockForOrder threw during kitchen completion',
            errorDetails: {
              message: deductionError,
              actorUserId: opts.actorUserId,
              actorRole: opts.actorRole,
            },
          });
          incidentWritten = true;
        } catch (logErr) {
          console.error(
            '[OrderService.completeOrder] IncidentEvent write also failed:',
            logErr
          );
        }
      }
    }

    await order.save();

    try {
      const { AuditLogService } = await import('./audit-log-service');
      const UserModel = (await import('@/models/user-model')).default;
      const actor = await UserModel.findById(opts.actorUserId);

      await AuditLogService.createLog({
        userId: opts.actorUserId,
        userEmail: actor?.email || `${opts.actorRole}@system.local`,
        userRole: opts.actorRole,
        action: 'order.update',
        resource: 'order',
        resourceId: opts.orderId,
        details: {
          previousStatus,
          newStatus: 'completed',
          inventoryDeducted: order.inventoryDeducted,
          incidentWritten,
        },
      });
    } catch (error) {
      console.error(
        '[OrderService.completeOrder] audit log write failed:',
        error
      );
    }

    if (deductionError !== undefined) {
      return { success: true, deductionFailed: true, deductionError };
    }
    return { success: true };
  }

  /**
   * @requirement REQ-066 AC5 — Stale-paid-order visibility scan
   *
   * Read-only scan called from the 15-min reconciliation cron. For every
   * order matching (paymentStatus=paid AND status NOT IN [completed,
   * cancelled] AND createdAt older than the threshold), writes an
   * `IncidentEvent` tagged `stale_paid_order` so the `/dashboard/incidents`
   * panel surfaces it. **Never mutates Order.status** — the operator's
   * contract is that ONLY kitchen-display staff may complete an order.
   *
   * Dedup is delegated to `IncidentEventService.dedupRecent` (24h window
   * keyed on kind + entityId) so the same stuck order doesn't generate
   * 96 rows over 24h of cron cycles.
   */
  static async scanStalePaidOrders(opts: {
    thresholdHours: number;
    limit?: number;
  }): Promise<{ scanned: number; flagged: number; skippedAsDup: number }> {
    await connectDB();
    const { IncidentEventService } = await import('./incident-event-service');

    const olderThan = new Date(
      Date.now() - opts.thresholdHours * 60 * 60 * 1000
    );

    const orders = await Order.find({
      paymentStatus: 'paid',
      status: { $nin: ['completed', 'cancelled'] },
      createdAt: { $lt: olderThan },
    })
      .sort({ createdAt: 1 })
      .limit(opts.limit ?? 100)
      .lean<
        Array<{
          _id: { toString: () => string };
          orderNumber: string;
          status: string;
          paymentStatus: string;
          createdAt: Date;
        }>
      >();

    let flagged = 0;
    let skippedAsDup = 0;

    for (const order of orders) {
      const entityId = order._id.toString();
      const already = await IncidentEventService.dedupRecent({
        kind: 'stale_paid_order',
        entityId,
        withinHours: 24,
      });
      if (already) {
        skippedAsDup += 1;
        continue;
      }
      const ageHours = (
        (Date.now() - new Date(order.createdAt).getTime()) /
        (60 * 60 * 1000)
      ).toFixed(1);
      try {
        await IncidentEventService.recordIncident({
          kind: 'stale_paid_order',
          entityId,
          summary: `Paid order ${order.orderNumber} stuck at status='${order.status}' for ${ageHours}h`,
          errorDetails: {
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt,
            ageHours: Number(ageHours),
          },
        });
        flagged += 1;
      } catch (error) {
        console.error(
          '[OrderService.scanStalePaidOrders] IncidentEvent write failed:',
          error
        );
      }
    }

    return { scanned: orders.length, flagged, skippedAsDup };
  }
}
