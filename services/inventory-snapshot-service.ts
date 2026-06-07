import { Types } from 'mongoose';
import { InventorySnapshotModel } from '@/models/inventory-snapshot-model';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import OrderModel from '@/models/order-model';
import StockMovementModel from '@/models/stock-movement-model';
import { AuditLogService } from '@/services/audit-log-service';
import { computeMissingCost } from '@/lib/snapshot-missing-cost';
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
    // REQ-075 — Free-form main-category slug (was `'food' | 'drinks'`).
    mainCategory?: string
  ): Promise<IInventorySnapshotItem[]> {
    const query: any = { trackInventory: true };
    if (mainCategory) {
      query.mainCategory = mainCategory;
    }

    const menuItems = await MenuItemModel.find(query).sort({ name: 1 }).lean();

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
      const sales = salesData.find(
        (s) => s._id.toString() === item._id.toString()
      );
      let inventoryCount = 0;

      let locationBreakdown: {
        location: string;
        locationName: string;
        currentStock: number;
      }[] = [];

      // Canonical lookup: find inventory by menuItemId
      const inventory = (await InventoryModel.findOne({
        menuItemId: item._id,
      }).lean()) as any;
      let inventoryIdStr: string | undefined;
      if (inventory) {
        inventoryCount = inventory.currentStock || 0;
        inventoryIdStr = inventory._id.toString();
        if (
          inventory.trackByLocation &&
          Array.isArray(inventory.locations) &&
          inventory.locations.length > 0
        ) {
          locationBreakdown = inventory.locations.map((loc: any) => ({
            location: loc.location,
            locationName:
              loc.locationName || loc.location || 'Unknown Location',
            currentStock: loc.currentStock ?? 0,
          }));
        }
      }

      items.push({
        menuItemId: item._id.toString(),
        menuItemName: item.name,
        inventoryId: inventoryIdStr,
        mainCategory: item.mainCategory,
        category: item.category,
        systemInventoryCount: inventoryCount,
        todaySalesCount: sales?.totalSold || 0,
        staffConfirmed: false,
        discrepancy: 0,
        requiresAdjustment: false,
        ...(locationBreakdown.length > 0 && { locationBreakdown }),
        // REQ-039: stamp the live cost on each row so the submit-form
        // live-total + the eventual frozen value share the same basis.
        ...(typeof inventory?.costPerUnit === 'number' && {
          costPerUnitAtSnapshot: inventory.costPerUnit,
        }),
      });
    }

    return items;
  }

  // REQ-039: resolve the current Inventory.costPerUnit for a menuItemId.
  // Used as a fallback at submit time when the form payload lacks a
  // stamped value (e.g. submit path that bypasses generateSnapshotData).
  private static async resolveLiveCost(
    menuItemId: string
  ): Promise<number | undefined> {
    if (!menuItemId || !Types.ObjectId.isValid(menuItemId)) return undefined;
    const inv = await InventoryModel.findOne({
      menuItemId: new Types.ObjectId(menuItemId),
    })
      .select('costPerUnit')
      .lean();
    return typeof (inv as { costPerUnit?: number } | null)?.costPerUnit ===
      'number'
      ? (inv as { costPerUnit: number }).costPerUnit
      : undefined;
  }

  // REQ-039: ensure every item with a staffAdjustedCount has a frozen
  // cost stamp. Items without a decision (staffAdjustedCount undefined)
  // contribute nothing to missingCost so the stamp is optional.
  private static async stampMissingCostsAtSubmit(
    items: IInventorySnapshotItem[]
  ): Promise<IInventorySnapshotItem[]> {
    const out: IInventorySnapshotItem[] = [];
    for (const it of items) {
      if (
        it.staffAdjustedCount !== undefined &&
        it.costPerUnitAtSnapshot === undefined
      ) {
        const live = await this.resolveLiveCost(it.menuItemId);
        out.push({
          ...it,
          ...(typeof live === 'number' && { costPerUnitAtSnapshot: live }),
        });
      } else {
        out.push(it);
      }
    }
    return out;
  }

  // REQ-039: edit-time re-stamp guard. Re-stamp the cost ONLY on items
  // whose staffAdjustedCount changed vs the previously-persisted
  // snapshot. Untouched rows keep their original frozen cost so an
  // unrelated edit doesn't silently shift the cost basis.
  private static async restampCostsOnChangedItems(
    newItems: IInventorySnapshotItem[],
    previousItems: IInventorySnapshotItem[]
  ): Promise<IInventorySnapshotItem[]> {
    const prevByKey = new Map(previousItems.map((p) => [p.menuItemId, p]));
    const out: IInventorySnapshotItem[] = [];
    for (const it of newItems) {
      const prev = prevByKey.get(it.menuItemId);
      const adjustmentChanged =
        prev?.staffAdjustedCount !== it.staffAdjustedCount;
      if (adjustmentChanged && it.staffAdjustedCount !== undefined) {
        // Adjustment is a fresh decision — stamp at the current live cost.
        const live = await this.resolveLiveCost(it.menuItemId);
        out.push({
          ...it,
          ...(typeof live === 'number'
            ? { costPerUnitAtSnapshot: live }
            : prev?.costPerUnitAtSnapshot !== undefined
              ? { costPerUnitAtSnapshot: prev.costPerUnitAtSnapshot }
              : {}),
        });
      } else if (
        prev?.costPerUnitAtSnapshot !== undefined &&
        it.costPerUnitAtSnapshot === undefined
      ) {
        // Untouched row whose previous stamp is being dropped by the
        // caller — preserve the frozen cost.
        out.push({
          ...it,
          costPerUnitAtSnapshot: prev.costPerUnitAtSnapshot,
        });
      } else {
        out.push(it);
      }
    }
    return out;
  }

  private static sanitizeItems(
    items: IInventorySnapshotItem[]
  ): IInventorySnapshotItem[] {
    return items.map((item) => {
      if (item.locationBreakdown && item.locationBreakdown.length > 0) {
        return {
          ...item,
          locationBreakdown: item.locationBreakdown.map((loc) => ({
            ...loc,
            locationName:
              loc.locationName || loc.location || 'Unknown Location',
          })),
        };
      }
      return item;
    });
  }

  static async submitSnapshot(
    data: ISubmitSnapshotData,
    userId: string,
    userName: string,
    // REQ-075 — Free-form main-category slug (was `'food' | 'drinks'`).
    mainCategory: string
  ): Promise<IInventorySnapshot> {
    const snapshotDate = new Date(data.snapshotDate);
    snapshotDate.setHours(0, 0, 0, 0);

    const existingSnapshot = await InventorySnapshotModel.findOne({
      snapshotDate,
      mainCategory,
      submittedBy: new Types.ObjectId(userId),
    });

    if (existingSnapshot && existingSnapshot.status !== 'rejected') {
      throw new Error(
        `A ${mainCategory} snapshot for this date has already been submitted`
      );
    }

    const sanitizedItems = this.sanitizeItems(data.items);
    // REQ-039: belt-and-braces — ensure every adjusted item has a
    // frozen cost stamp before persistence.
    const stampedItems = await this.stampMissingCostsAtSubmit(sanitizedItems);

    const snapshot = await InventorySnapshotModel.create({
      snapshotDate,
      mainCategory,
      submittedBy: new Types.ObjectId(userId),
      submittedByName: userName,
      status: 'pending',
      items: stampedItems,
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
        totalItems: stampedItems.length,
        adjustmentItems: stampedItems.filter((i) => i.requiresAdjustment)
          .length,
        // REQ-039: cost of inventory reported as missing on this submission
        missingCost: computeMissingCost(stampedItems),
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

          const movementData = {
            inventoryId: inventory._id,
            quantity: difference,
            type: 'adjustment' as const,
            category: (difference > 0 ? 'restock' : 'adjustment') as any,
            reason: `Inventory snapshot adjustment - ${snapshot.snapshotDate.toISOString().split('T')[0]}`,
            performedBy: new Types.ObjectId(reviewerId),
            performedByName: reviewerName,
            timestamp: new Date(),
          };

          // Write to normalized StockMovement collection
          await StockMovementModel.create(movementData);

          if (difference < 0) {
            inventory.totalWaste += Math.abs(difference);
          } else {
            inventory.totalRestocked += difference;
          }

          // Update location-specific stock if tracking is enabled
          if (
            inventory.trackByLocation &&
            item.locationBreakdown &&
            item.locationBreakdown.length > 0
          ) {
            for (const locSnapshot of item.locationBreakdown) {
              const inventoryLocation = inventory.locations.find(
                (l: any) => l.location === locSnapshot.location
              );

              if (inventoryLocation) {
                // If adjusted, use the adjusted count. Otherwise use the snapshot's captured stock.
                // This effectively "resets" the location stock to what was counted/confirmed.
                const newLocStock =
                  locSnapshot.staffAdjustedCount !== undefined
                    ? locSnapshot.staffAdjustedCount
                    : locSnapshot.currentStock;

                if (inventoryLocation.currentStock !== newLocStock) {
                  inventoryLocation.currentStock = newLocStock;
                  inventoryLocation.lastUpdated = new Date();
                  inventoryLocation.updatedBy = new Types.ObjectId(reviewerId);
                  inventoryLocation.updatedByName = reviewerName;
                }
              }
            }
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
        adjustmentCount: snapshot.items.filter((i) => i.requiresAdjustment)
          .length,
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

  static async getStaffSubmissionHistory(
    userId: string
  ): Promise<IInventorySnapshot[]> {
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

  static calculateSummary(
    snapshot: IInventorySnapshot
  ): IInventorySnapshotSummary {
    const totalItems = snapshot.items.length;
    const confirmedItems = snapshot.items.filter(
      (i) => i.staffConfirmed
    ).length;
    const adjustmentItems = snapshot.items.filter(
      (i) => i.requiresAdjustment
    ).length;
    const totalDiscrepancy = snapshot.items.reduce(
      (sum, item) => sum + Math.abs(item.discrepancy),
      0
    );

    return {
      totalItems,
      confirmedItems,
      adjustmentItems,
      totalDiscrepancy,
      // REQ-039: total cost of inventory reported as missing.
      // Single source of truth: shared helper used by submit-form
      // live total + this server-side aggregate.
      missingCost: computeMissingCost(snapshot.items),
    };
  }

  static async checkExistingSnapshot(
    date: Date,
    userId: string,
    // REQ-075 — Free-form main-category slug (was `'food' | 'drinks'`).
    mainCategory: string
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

    const sanitizedItems = this.sanitizeItems(items);
    // REQ-039: re-stamp the cost ONLY on items whose staffAdjustedCount
    // changed since the previous save — untouched rows keep their
    // original frozen cost so the cost basis doesn't silently shift.
    const stampedItems = await this.restampCostsOnChangedItems(
      sanitizedItems,
      snapshot.items as unknown as IInventorySnapshotItem[]
    );
    snapshot.items = stampedItems;
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
        totalItems: stampedItems.length,
        adjustmentItems: stampedItems.filter((i) => i.requiresAdjustment)
          .length,
        // REQ-039: cost of inventory reported as missing after this edit
        missingCost: computeMissingCost(stampedItems),
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

    const sanitizedItems = this.sanitizeItems(data.items);
    // REQ-039: same re-stamp guard as updateSnapshotItems — re-stamp
    // cost only on items whose staffAdjustedCount changed since the
    // previous (rejected) save. Then top up any items missing the
    // stamp entirely (e.g. fresh adjustments added on resubmit).
    const restampedItems = await this.restampCostsOnChangedItems(
      sanitizedItems,
      snapshot.items as unknown as IInventorySnapshotItem[]
    );
    const stampedItems = await this.stampMissingCostsAtSubmit(restampedItems);

    snapshot.items = stampedItems;
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
        totalItems: stampedItems.length,
        adjustmentItems: stampedItems.filter((i) => i.requiresAdjustment)
          .length,
        resubmission: true,
        // REQ-039: cost of inventory reported as missing on this resubmission
        missingCost: computeMissingCost(stampedItems),
      },
    });

    return snapshot.toObject();
  }
}
