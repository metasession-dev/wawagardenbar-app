import { Types } from 'mongoose';

export interface IInventoryLocationBreakdown {
  location: string;
  locationName: string;
  currentStock: number;
  staffConfirmed?: boolean;
  staffAdjustedCount?: number;
}

export interface IInventorySnapshotItem {
  menuItemId: string;
  menuItemName: string;
  inventoryId?: string;
  // REQ-075 — Free-form string (was `'food' | 'drinks'`). Validation
  // moves to the application layer via `MainCategoryService`.
  mainCategory: string;
  category: string;
  systemInventoryCount: number;
  todaySalesCount: number;
  staffConfirmed: boolean;
  staffAdjustedCount?: number;
  staffNotes?: string;
  discrepancy: number;
  requiresAdjustment: boolean;
  locationBreakdown?: IInventoryLocationBreakdown[];
  // REQ-039: cost-per-unit frozen at submission time so historical
  // missing-cost stays stable when Inventory.costPerUnit changes later.
  costPerUnitAtSnapshot?: number;
}

export interface IInventorySnapshot {
  _id: string;
  snapshotDate: Date;
  // REQ-075 — Free-form string (was `'food' | 'drinks'`). Validation
  // moves to the application layer via `MainCategoryService`.
  mainCategory: string;
  submittedAt: Date;
  submittedBy: Types.ObjectId;
  submittedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewedByName?: string;
  reviewNotes?: string;
  items: IInventorySnapshotItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventorySnapshotSummary {
  totalItems: number;
  confirmedItems: number;
  adjustmentItems: number;
  totalDiscrepancy: number;
  // REQ-039: total cost of inventory reported as missing
  // (sum over items where discrepancy < 0 of
  //  abs(discrepancy) × (costPerUnitAtSnapshot ?? 0)).
  missingCost: number;
}

export interface ISubmitSnapshotData {
  snapshotDate: string;
  items: IInventorySnapshotItem[];
}

export interface ISnapshotFilters {
  status?: 'pending' | 'approved' | 'rejected';
  mainCategory?: string;
  startDate?: Date;
  endDate?: Date;
  submittedBy?: string;
  page?: number;
  limit?: number;
}
