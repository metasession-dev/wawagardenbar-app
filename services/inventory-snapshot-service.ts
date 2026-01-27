import { Types } from 'mongoose';
import { InventorySnapshotModel } from '@/models/inventory-snapshot-model';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import OrderModel from '@/models/order-model';
import { AuditLogService } from '@/services/audit-log-service';
import type {
  IInventorySnapshot,
  IInventorySnapshotItem,
  IInventorySnapshotSummary,
  ISubmitSnapshotData,
  ISnapshotFilters,
} from '@/interfaces/inventory-snapshot.interface';

export class InventorySnapshotService {
  static async generateSnapshotData(
    date: Date,
    mainCategory?: 'food' | 'drinks'
  ): Promise<IInventorySnapshotItem[]> {
    const query: any = { trackInventory: true };
    if (mainCategory) {
      query.mainCategory = mainCategory;
    }

    const menuItems = await MenuItemModel.find(query)
      .populate('inventoryId')
      .sort({ name: 1 })
      .lean();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const salesData = await OrderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          paymentStatus: 'paid',
          status: { $nin: ['cancelled'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          totalSold: { $sum: '$items.quantity' },
        },
      },
    ]);

    const items: IInventorySnapshotItem[] = [];

    for (const item of menuItems) {
      const sales = salesData.find((s) => s._id.toString() === item._id.toString());
      let inventoryCount = 0;

      if (item.inventoryId) {
        const inventory = await InventoryModel.findById(item.inventoryId).lean();
        inventoryCount = inventory?.currentStock || 0;
      }

      items.push({
        menuItemId: item._id.toString(),
        menuItemName: item.name,
        mainCategory: item.mainCategory,
        category: item.category,
        systemInventoryCount: inventoryCount,
        todaySalesCount: sales?.totalSold || 0,
        staffConfirmed: false,
        discrepancy: 0,
        requiresAdjustment: false,
      });
    }

    return items;
  }

  static async submitSnapshot(
    data: ISubmitSnapshotData,
    userId: string,
    userName: string,
    mainCategory: 'food' | 'drinks'
  ): Promise<IInventorySnapshot> {
    const snapshotDate = new Date(data.snapshotDate);
    snapshotDate.setHours(0, 0, 0, 0);

    const existingSnapshot = await InventorySnapshotModel.findOne({
      snapshotDate,
      mainCategory,
      submittedBy: new Types.ObjectId(userId),
    });

    if (existingSnapshot && existingSnapshot.status !== 'rejected') {
      throw new Error(`A ${mainCategory} snapshot for this date has already been submitted`);
    }

    const snapshot = await InventorySnapshotModel.create({
      snapshotDate,
      mainCategory,
      submittedBy: new Types.ObjectId(userId),
      submittedByName: userName,
      status: 'pending',
      items: data.items,
    });

    await AuditLogService.createLog({
      userId,
      userEmail: userName,
      userRole: 'admin',
      action: 'inventory.snapshot_submitted',
      resource: 'inventory-snapshot',
      resourceId: snapshot._id.toString(),
      details: {
        snapshotDate: snapshotDate.toISOString(),
        mainCategory,
        totalItems: data.items.length,
        adjustmentItems: data.items.filter((i) => i.requiresAdjustment).length,
      },
    });

    return snapshot.toObject();
  }

  static async getPendingSnapshots(): Promise<IInventorySnapshot[]> {
    const snapshots = await InventorySnapshotModel.find({ status: 'pending' })
      .sort({ submittedAt: -1 })
      .lean();

    return snapshots;
  }

  static async getSnapshotById(id: string): Promise<IInventorySnapshot | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const snapshot = await InventorySnapshotModel.findById(id).lean();
    return snapshot;
  }

  static async approveSnapshot(
    id: string,
    reviewerId: string,
    reviewerName: string,
    notes?: string
  ): Promise<IInventorySnapshot> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid snapshot ID');
    }

    const snapshot = await InventorySnapshotModel.findById(id);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    if (snapshot.status !== 'pending') {
      throw new Error('Snapshot has already been reviewed');
    }

    for (const item of snapshot.items) {
      if (item.requiresAdjustment && item.staffAdjustedCount !== undefined) {
        const inventory = await InventoryModel.findOne({
          menuItemId: new Types.ObjectId(item.menuItemId),
        });

        if (inventory) {
          const oldStock = inventory.currentStock;
          const newStock = item.staffAdjustedCount;
          const difference = newStock - oldStock;

          inventory.currentStock = newStock;
          inventory.stockHistory.push({
            quantity: difference,
            type: 'adjustment',
            category: difference > 0 ? 'restock' : 'adjustment',
            reason: `Inventory snapshot adjustment - ${snapshot.snapshotDate.toISOString().split('T')[0]}`,
            performedBy: new Types.ObjectId(reviewerId),
            timestamp: new Date(),
          });

          if (difference < 0) {
            inventory.totalWaste += Math.abs(difference);
          } else {
            inventory.totalRestocked += difference;
          }

          await inventory.save();
        }
      }
    }

    snapshot.status = 'approved';
    snapshot.reviewedAt = new Date();
    snapshot.reviewedBy = new Types.ObjectId(reviewerId) as any;
    snapshot.reviewedByName = reviewerName;
    snapshot.reviewNotes = notes;
    await snapshot.save();

    await AuditLogService.createLog({
      userId: reviewerId,
      userEmail: reviewerName,
      userRole: 'super-admin',
      action: 'inventory.snapshot_approved',
      resource: 'inventory-snapshot',
      resourceId: id,
      details: {
        snapshotDate: snapshot.snapshotDate.toISOString(),
        mainCategory: snapshot.mainCategory,
        submittedBy: snapshot.submittedByName,
        adjustmentCount: snapshot.items.filter((i) => i.requiresAdjustment).length,
        notes,
      },
    });

    return snapshot.toObject();
  }

  static async rejectSnapshot(
    id: string,
    reviewerId: string,
    reviewerName: string,
    notes: string
  ): Promise<IInventorySnapshot> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid snapshot ID');
    }

    const snapshot = await InventorySnapshotModel.findById(id);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    if (snapshot.status !== 'pending') {
      throw new Error('Snapshot has already been reviewed');
    }

    snapshot.status = 'rejected';
    snapshot.reviewedAt = new Date();
    snapshot.reviewedBy = new Types.ObjectId(reviewerId) as any;
    snapshot.reviewedByName = reviewerName;
    snapshot.reviewNotes = notes;
    await snapshot.save();

    await AuditLogService.createLog({
      userId: reviewerId,
      userEmail: reviewerName,
      userRole: 'super-admin',
      action: 'inventory.snapshot_rejected',
      resource: 'inventory-snapshot',
      resourceId: id,
      details: {
        snapshotDate: snapshot.snapshotDate.toISOString(),
        mainCategory: snapshot.mainCategory,
        submittedBy: snapshot.submittedByName,
        notes,
      },
    });

    return snapshot.toObject();
  }

  static async getSnapshotHistory(filters: ISnapshotFilters): Promise<{
    snapshots: IInventorySnapshot[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.mainCategory) {
      query.mainCategory = filters.mainCategory;
    }

    if (filters.startDate || filters.endDate) {
      query.snapshotDate = {};
      if (filters.startDate) {
        query.snapshotDate.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.snapshotDate.$lte = filters.endDate;
      }
    }

    if (filters.submittedBy) {
      query.submittedBy = new Types.ObjectId(filters.submittedBy);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [snapshots, total] = await Promise.all([
      InventorySnapshotModel.find(query)
        .sort({ snapshotDate: -1, submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventorySnapshotModel.countDocuments(query),
    ]);

    return {
      snapshots,
      total,
      page,
      limit,
    };
  }

  static async getStaffSubmissionHistory(userId: string): Promise<IInventorySnapshot[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    const snapshots = await InventorySnapshotModel.find({
      submittedBy: new Types.ObjectId(userId),
    })
      .sort({ snapshotDate: -1 })
      .limit(20)
      .lean();

    return snapshots;
  }

  static calculateSummary(snapshot: IInventorySnapshot): IInventorySnapshotSummary {
    const totalItems = snapshot.items.length;
    const confirmedItems = snapshot.items.filter((i) => i.staffConfirmed).length;
    const adjustmentItems = snapshot.items.filter((i) => i.requiresAdjustment).length;
    const totalDiscrepancy = snapshot.items.reduce(
      (sum, item) => sum + Math.abs(item.discrepancy),
      0
    );

    return {
      totalItems,
      confirmedItems,
      adjustmentItems,
      totalDiscrepancy,
    };
  }

  static async checkExistingSnapshot(
    date: Date,
    userId: string,
    mainCategory: 'food' | 'drinks'
  ): Promise<IInventorySnapshot | null> {
    const snapshotDate = new Date(date);
    snapshotDate.setHours(0, 0, 0, 0);

    const snapshot = await InventorySnapshotModel.findOne({
      snapshotDate,
      mainCategory,
      submittedBy: new Types.ObjectId(userId),
    }).lean();

    return snapshot;
  }

  static async updateSnapshotItems(
    snapshotId: string,
    items: IInventorySnapshotItem[],
    userId: string,
    userName: string
  ): Promise<IInventorySnapshot> {
    if (!Types.ObjectId.isValid(snapshotId)) {
      throw new Error('Invalid snapshot ID');
    }

    const snapshot = await InventorySnapshotModel.findById(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    if (snapshot.status !== 'pending') {
      throw new Error('Only pending snapshots can be edited');
    }

    snapshot.items = items;
    await snapshot.save();

    await AuditLogService.createLog({
      userId,
      userEmail: userName,
      userRole: 'super-admin',
      action: 'inventory.snapshot_edited',
      resource: 'inventory-snapshot',
      resourceId: snapshot._id.toString(),
      details: {
        snapshotDate: snapshot.snapshotDate.toISOString(),
        mainCategory: snapshot.mainCategory,
        totalItems: items.length,
        adjustmentItems: items.filter((i) => i.requiresAdjustment).length,
      },
    });

    return snapshot.toObject();
  }

  static async resubmitSnapshot(
    snapshotId: string,
    data: ISubmitSnapshotData,
    userId: string,
    userName: string
  ): Promise<IInventorySnapshot> {
    if (!Types.ObjectId.isValid(snapshotId)) {
      throw new Error('Invalid snapshot ID');
    }

    const snapshot = await InventorySnapshotModel.findById(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    if (snapshot.status !== 'rejected') {
      throw new Error('Only rejected snapshots can be resubmitted');
    }

    if (snapshot.submittedBy.toString() !== userId) {
      throw new Error('You can only resubmit your own snapshots');
    }

    snapshot.items = data.items;
    snapshot.status = 'pending';
    snapshot.submittedAt = new Date();
    snapshot.reviewedAt = undefined;
    snapshot.reviewedBy = undefined;
    snapshot.reviewedByName = undefined;
    await snapshot.save();

    await AuditLogService.createLog({
      userId,
      userEmail: userName,
      userRole: 'admin',
      action: 'inventory.snapshot_submitted',
      resource: 'inventory-snapshot',
      resourceId: snapshot._id.toString(),
      details: {
        snapshotDate: snapshot.snapshotDate.toISOString(),
        mainCategory: snapshot.mainCategory,
        totalItems: data.items.length,
        adjustmentItems: data.items.filter((i) => i.requiresAdjustment).length,
        resubmission: true,
      },
    });

    return snapshot.toObject();
  }
}
