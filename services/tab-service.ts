import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import TabModel from '@/models/tab-model';
import OrderModel from '@/models/order-model';
import { ITab, IOrder } from '@/interfaces';
import SettingsService from './settings-service';

/**
 * Tab Service
 * Handles all tab-related business logic for dine-in orders
 */
export class TabService {
  /**
   * Generate a unique tab number
   */
  private static generateTabNumber(tableNumber: string): string {
    const timestamp = Date.now().toString().slice(-6);
    return `TAB-${tableNumber}-${timestamp}`;
  }

  /**
   * Create a new tab
   */
  static async createTab(params: {
    tableNumber: string;
    userId?: string;
    createdBy?: string;
    createdByRole?: 'customer' | 'csr' | 'admin' | 'super-admin';
    openedByStaffId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    guestId?: string;
  }): Promise<ITab> {
    await connectDB();

    const tabNumber = this.generateTabNumber(params.tableNumber);

    const tab = await TabModel.create({
      tabNumber,
      tableNumber: params.tableNumber,
      userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
      createdBy: params.createdBy ? new Types.ObjectId(params.createdBy) : undefined,
      createdByRole: params.createdByRole || 'customer',
      openedByStaffId: params.openedByStaffId
        ? new Types.ObjectId(params.openedByStaffId)
        : undefined,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      guestId: params.guestId,
      status: 'open',
      orders: [],
      subtotal: 0,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discountTotal: 0,
      tipAmount: 0,
      total: 0,
      paymentStatus: 'pending',
      openedAt: new Date(),
    });

    return JSON.parse(JSON.stringify(tab.toObject()));
  }

  /**
   * Get open tab for a user
   */
  static async getOpenTabForUser(userId: string): Promise<ITab | null> {
    await connectDB();

    const tab = await TabModel.findOne({
      userId: new Types.ObjectId(userId),
      status: 'open',
    })
      .populate('orders')
      .lean();

    return tab ? JSON.parse(JSON.stringify(tab)) : null;
  }

  /**
   * Get open tab for a guest
   */
  static async getOpenTabForGuest(guestId: string): Promise<ITab | null> {
    await connectDB();

    const tab = await TabModel.findOne({
      guestId,
      status: 'open',
    })
      .populate('orders')
      .lean();

    return tab ? JSON.parse(JSON.stringify(tab)) : null;
  }

  /**
   * Get open tab for a table
   */
  static async getOpenTabForTable(tableNumber: string): Promise<ITab | null> {
    await connectDB();

    const tab = await TabModel.findOne({
      tableNumber,
      status: 'open',
    })
      .populate('orders')
      .lean();

    return tab ? JSON.parse(JSON.stringify(tab)) : null;
  }

  /**
   * Get open tab for a specific customer
   * Used by admins to check if customer has open tab
   */
  static async getOpenTabForCustomer(customerId: string): Promise<ITab | null> {
    await connectDB();

    const tab = await TabModel.findOne({
      userId: new Types.ObjectId(customerId),
      status: 'open',
    })
      .populate('orders')
      .lean();

    return tab ? JSON.parse(JSON.stringify(tab)) : null;
  }

  /**
   * Get tab by ID
   */
  static async getTabById(tabId: string): Promise<ITab | null> {
    await connectDB();

    const tab = await TabModel.findById(tabId).populate('orders').lean();

    return tab ? JSON.parse(JSON.stringify(tab)) : null;
  }

  /**
   * Add order to tab and recalculate totals
   */
  static async addOrderToTab(tabId: string, orderId: string): Promise<ITab> {
    await connectDB();

    const tab = await TabModel.findById(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    if (tab.status !== 'open') {
      throw new Error('Cannot add orders to a closed tab');
    }

    // Add order to tab
    if (!tab.orders.includes(new Types.ObjectId(orderId))) {
      tab.orders.push(new Types.ObjectId(orderId));
      await tab.save();
    }

    // Recalculate tab totals
    await this.recalculateTabTotals(tabId);

    // Get and return the updated tab
    const updatedTab = await TabModel.findById(tabId).lean();
    return JSON.parse(JSON.stringify(updatedTab));
  }

  /**
   * Recalculate tab totals based on all orders
   */
  static async recalculateTabTotals(tabId: string): Promise<ITab> {
    await connectDB();

    const tab = await TabModel.findById(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    // Get all orders for this tab (both from orders array and by tabId)
    // Exclude cancelled orders from calculation
    const orders = await OrderModel.find({
      $or: [
        { _id: { $in: tab.orders } },
        { tabId: new Types.ObjectId(tabId) }
      ],
      status: { $ne: 'cancelled' } // Exclude cancelled orders
    }).lean();

    // Calculate subtotal from all non-cancelled orders
    const subtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);

    // Calculate fees using SettingsService (dine-in type)
    const totals = await SettingsService.calculateOrderTotals(
      subtotal,
      'dine-in'
    );

    // Update tab with calculated values
    tab.subtotal = subtotal;
    tab.serviceFee = totals.serviceFee;
    tab.tax = totals.tax;
    tab.deliveryFee = 0; // Always 0 for dine-in

    // Calculate total (subtotal + fees - discounts + tip)
    tab.total =
      tab.subtotal +
      tab.serviceFee +
      tab.tax -
      tab.discountTotal +
      tab.tipAmount;

    await tab.save();

    return JSON.parse(JSON.stringify(tab.toObject()));
  }

  /**
   * Prepare tab for checkout (calculate totals with rewards)
   */
  static async prepareTabForCheckout(
    tabId: string,
    tipAmount: number = 0
  ): Promise<{
    tab: ITab;
    eligibleRewards: any[];
  }> {
    await connectDB();

    const tab = await TabModel.findById(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    if (tab.status === 'closed') {
      throw new Error('Tab is already closed');
    }

    // Update tip amount
    tab.tipAmount = tipAmount;

    // Recalculate totals
    await this.recalculateTabTotals(tabId);

    // Get updated tab
    const updatedTab = await TabModel.findById(tabId).lean();

    // TODO: Get eligible rewards based on tab subtotal
    // This will be implemented when rewards service is extended
    const eligibleRewards: any[] = [];

    return JSON.parse(JSON.stringify({
      tab: updatedTab!,
      eligibleRewards,
    }));
  }

  /**
   * Apply discount to tab (from rewards)
   */
  static async applyDiscountToTab(
    tabId: string,
    discountAmount: number
  ): Promise<ITab> {
    await connectDB();

    const tab = await TabModel.findById(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    tab.discountTotal += discountAmount;

    // Recalculate total
    tab.total =
      tab.subtotal +
      tab.serviceFee +
      tab.tax -
      tab.discountTotal +
      tab.tipAmount;

    await tab.save();

    return JSON.parse(JSON.stringify(tab.toObject()));
  }

  /**
   * Mark tab as paid
   */
  static async markTabPaid(
    tabId: string,
    paymentReference: string,
    transactionReference: string
  ): Promise<ITab> {
    await connectDB();

    const tab = await TabModel.findById(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    tab.status = 'closed';
    tab.paymentStatus = 'paid';
    tab.paymentReference = paymentReference;
    tab.transactionReference = transactionReference;
    tab.paidAt = new Date();
    tab.closedAt = new Date();

    await tab.save();

    // Update all orders in the tab to paid status
    await OrderModel.updateMany(
      { _id: { $in: tab.orders } },
      {
        $set: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          status: 'confirmed',
        },
      }
    );

    // Deduct inventory for all orders in the tab
    const InventoryService = (await import('./inventory-service')).default;
    for (const orderId of tab.orders) {
      try {
        const order = await OrderModel.findById(orderId);
        if (order && !order.inventoryDeducted) {
          await InventoryService.deductStockForOrder(orderId.toString());
          order.inventoryDeducted = true;
          order.inventoryDeductedAt = new Date();
          await order.save();
          console.log('Inventory deducted for tab order:', orderId);
        }
      } catch (error) {
        console.error('Error deducting inventory for tab order:', orderId, error);
        // Continue processing other orders even if one fails
      }
    }

    return JSON.parse(JSON.stringify(tab.toObject()));
  }

  /**
   * List all open tabs (for dashboard)
   */
  static async listOpenTabs(filters?: {
    tableNumber?: string;
    userId?: string;
    openedByStaffId?: string;
    customerEmail?: string;
    guestId?: string;
  }): Promise<ITab[]> {
    await connectDB();

    const query: any = { status: 'open' };

    if (filters?.tableNumber) {
      query.tableNumber = filters.tableNumber;
    }
    if (filters?.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }
    if (filters?.customerEmail) {
      query.customerEmail = filters.customerEmail;
    }
    if (filters?.guestId) {
      query.guestId = filters.guestId;
    }
    if (filters?.openedByStaffId) {
      query.openedByStaffId = new Types.ObjectId(filters.openedByStaffId);
    }

    const tabs = await TabModel.find(query)
      .sort({ openedAt: -1 })
      .lean();

    // Ensure complete serialization to prevent client component errors
    return JSON.parse(JSON.stringify(tabs));
  }

  /**
   * List all tabs for a user (regardless of status)
   */
  static async listAllTabsForUser(userId: string): Promise<ITab[]> {
    await connectDB();

    const tabs = await TabModel.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ openedAt: -1 })
      .lean();

    // Ensure complete serialization to prevent client component errors
    return JSON.parse(JSON.stringify(tabs));
  }

  /**
   * List tabs for a user with filtering options
   */
  static async listTabsWithFilters(
    userId: string,
    filters: {
      statuses?: string[];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ITab[]> {
    await connectDB();

    const query: any = {
      userId: new Types.ObjectId(userId),
    };

    // Filter by status
    if (filters.statuses && filters.statuses.length > 0) {
      query.status = { $in: filters.statuses };
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      query.openedAt = {};
      if (filters.startDate) {
        query.openedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        // Set to end of day
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.openedAt.$lte = endOfDay;
      }
    }

    const tabs = await TabModel.find(query)
      .sort({ openedAt: -1 })
      .lean();

    // Ensure complete serialization to prevent client component errors
    return JSON.parse(JSON.stringify(tabs));
  }

  /**
   * List all tabs (admin/staff) with filtering options
   */
  static async listAllTabsWithFilters(filters: {
    statuses?: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<ITab[]> {
    await connectDB();

    const query: any = {};

    // Filter by status
    if (filters.statuses && filters.statuses.length > 0) {
      query.status = { $in: filters.statuses };
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      query.openedAt = {};
      if (filters.startDate) {
        query.openedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        // Set to end of day
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.openedAt.$lte = endOfDay;
      }
    }

    const tabs = await TabModel.find(query)
      .sort({ openedAt: -1 })
      .lean();

    // Ensure complete serialization to prevent client component errors
    return JSON.parse(JSON.stringify(tabs));
  }

  /**
   * Get tab details with populated orders
   */
  static async getTabDetails(tabId: string): Promise<{
    tab: ITab;
    orders: IOrder[];
  }> {
    await connectDB();

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(tabId)) {
      throw new Error('Invalid tab ID format');
    }

    let tab = await TabModel.findById(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    // Get orders either from the orders array OR by tabId
    // This handles both old orders (with tabId but not in array) and new orders (in array)
    const orders = await OrderModel.find({
      $or: [
        { _id: { $in: tab.orders } },
        { tabId: new Types.ObjectId(tabId) }
      ]
    })
      .sort({ createdAt: 1 })
      .lean();

    // Sync orders array if needed (for legacy data)
    const orderIds = orders.map(o => o._id.toString());
    const tabOrderIds = tab.orders.map(o => o.toString());
    const needsSync = orderIds.some(id => !tabOrderIds.includes(id));
    
    if (needsSync) {
      tab.orders = orders.map(o => new Types.ObjectId(o._id.toString()));
      await tab.save();
      // Recalculate totals with the synced orders
      await this.recalculateTabTotals(tabId);
      // Fetch updated tab
      tab = await TabModel.findById(tabId);
    }

    // Ensure complete serialization to prevent client component errors
    const result = {
      tab: tab!.toObject(),
      orders,
    };
    
    return JSON.parse(JSON.stringify(result));
  }

  /**
   * Complete tab payment manually (admin)
   * For cash, transfer, or POS payments
   */
  static async completeTabPaymentManually(params: {
    tabId: string;
    paymentType: 'cash' | 'transfer' | 'card';
    paymentReference: string;
    comments?: string;
    processedBy: string;
  }): Promise<ITab> {
    await connectDB();

    const tab = await TabModel.findById(params.tabId).populate('userId', 'email');
    if (!tab) {
      throw new Error('Tab not found');
    }

    if (tab.status === 'closed') {
      throw new Error('Tab is already closed');
    }

    if (tab.paymentStatus === 'paid') {
      throw new Error('Tab is already paid');
    }

    // Get customer email from tab or populated user
    let customerEmail = tab.customerEmail || '';
    if (!customerEmail && tab.userId) {
      const populatedUser = tab.userId as any;
      customerEmail = populatedUser.email || '';
    }

    // Update tab status and payment info
    tab.status = 'closed';
    tab.paymentStatus = 'paid';
    tab.paymentReference = params.paymentReference;
    tab.paidAt = new Date();
    tab.closedAt = new Date();

    await tab.save();

    // Update all orders in the tab to paid status
    await OrderModel.updateMany(
      { _id: { $in: tab.orders } },
      {
        $set: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          status: 'confirmed',
        },
      }
    );

    // Deduct inventory for all orders in the tab
    const InventoryService = (await import('./inventory-service')).default;
    for (const orderId of tab.orders) {
      try {
        const order = await OrderModel.findById(orderId);
        if (order && !order.inventoryDeducted) {
          await InventoryService.deductStockForOrder(orderId.toString());
          order.inventoryDeducted = true;
          order.inventoryDeductedAt = new Date();
          await order.save();
          console.log('Inventory deducted for order:', orderId);
        }
      } catch (error) {
        console.error('Error deducting inventory for order:', orderId, error);
        // Continue processing other orders even if one fails
      }
    }

    // Create audit log for manual payment
    const AuditLogService = (await import('./audit-log-service')).AuditLogService;
    await AuditLogService.createLog({
      userId: params.processedBy,
      userEmail: customerEmail || 'guest@wawagardenbar.com',
      userRole: 'admin',
      action: 'tab.manual_payment',
      resource: 'tab',
      resourceId: params.tabId,
      details: {
        paymentType: params.paymentType,
        paymentReference: params.paymentReference,
        comments: params.comments,
        total: tab.total,
        processedByAdmin: params.processedBy,
      },
    });

    return JSON.parse(JSON.stringify(tab.toObject()));
  }

  /**
   * Close tab without payment (cancel)
   */
  static async closeTab(tabId: string): Promise<ITab> {
    await connectDB();

    const tab = await TabModel.findById(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    tab.status = 'closed';
    tab.closedAt = new Date();

    await tab.save();

    return JSON.parse(JSON.stringify(tab.toObject()));
  }

  /**
   * Update tab custom name
   */
  static async updateTabName(tabId: string, customName: string): Promise<ITab> {
    await connectDB();

    const trimmedName = customName.trim();
    
    const tab = await TabModel.findByIdAndUpdate(
      tabId,
      { 
        customName: trimmedName || undefined,
        tableNumber: trimmedName || undefined,
      },
      { new: true }
    );

    if (!tab) {
      throw new Error('Tab not found');
    }

    return JSON.parse(JSON.stringify(tab));
  }

  /**
   * Delete a tab
   * Requirements:
   * - Tab must not be closed/paid (status must be 'open' or 'settling')
   * - All orders on the tab must be cancelled first
   */
  static async deleteTab(tabId: string, deletedBy: string): Promise<void> {
    await connectDB();

    console.log('deleteTab called with:', { tabId, deletedBy });

    const tab = await TabModel.findById(tabId);
    if (!tab) {
      throw new Error('Tab not found');
    }

    console.log('Tab found:', { status: tab.status, paymentStatus: tab.paymentStatus, orderCount: tab.orders.length });

    // Check if tab is already closed/paid
    if (tab.status === 'closed' && tab.paymentStatus === 'paid') {
      throw new Error('Cannot delete a closed/paid tab. Only open or unpaid tabs can be deleted.');
    }

    // Get all orders on this tab
    const orders = await OrderModel.find({
      _id: { $in: tab.orders },
    });

    console.log('Orders found:', orders.map(o => ({ id: o._id, status: o.status })));

    // Check if any orders are not cancelled
    const nonCancelledOrders = orders.filter(order => order.status !== 'cancelled');
    if (nonCancelledOrders.length > 0) {
      console.log('Non-cancelled orders found:', nonCancelledOrders.map(o => ({ id: o._id, status: o.status })));
      throw new Error(
        `Cannot delete tab. Please cancel all ${nonCancelledOrders.length} order(s) on this tab first.`
      );
    }

    console.log('All orders are cancelled, proceeding with deletion');

    // Create audit log before deletion
    try {
      const AuditLogService = (await import('./audit-log-service')).AuditLogService;
      console.log('Creating audit log with userId:', deletedBy);
      await AuditLogService.createLog({
        userId: deletedBy,
        userEmail: tab.customerEmail || 'unknown',
        userRole: 'admin',
        action: 'tab.delete',
        resource: 'tab',
        resourceId: tabId,
        details: {
          tabNumber: tab.tabNumber,
          tableNumber: tab.tableNumber,
          orderCount: orders.length,
          deletedBy,
        },
      });
      console.log('Audit log created successfully');
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      throw new Error(`Failed to create audit log: ${auditError instanceof Error ? auditError.message : 'Unknown error'}`);
    }

    // Delete the tab
    console.log('Deleting tab from database');
    await TabModel.findByIdAndDelete(tabId);
    console.log('Tab deleted successfully from database');
  }
}
