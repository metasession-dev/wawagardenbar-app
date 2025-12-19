import { Types } from 'mongoose';

export interface IInventoryItemCostHistory {
  _id: Types.ObjectId;
  inventoryItemId: Types.ObjectId;
  costPerUnit: number;
  supplier?: string;
  purchaseDate: Date;
  effectiveFrom: Date;
  effectiveTo?: Date;
  changedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
