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
  mainCategory: 'food' | 'drinks';
  category: string;
  systemInventoryCount: number;
  todaySalesCount: number;
  staffConfirmed: boolean;
  staffAdjustedCount?: number;
  staffNotes?: string;
  discrepancy: number;
  requiresAdjustment: boolean;
  locationBreakdown?: IInventoryLocationBreakdown[];
}

export interface IInventorySnapshot {
  _id: string;
  snapshotDate: Date;
  mainCategory: 'food' | 'drinks';
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
}

export interface ISubmitSnapshotData {
  snapshotDate: string;
  items: IInventorySnapshotItem[];
}

export interface ISnapshotFilters {
  status?: 'pending' | 'approved' | 'rejected';
  mainCategory?: 'food' | 'drinks';
  startDate?: Date;
  endDate?: Date;
  submittedBy?: string;
  page?: number;
  limit?: number;
}
