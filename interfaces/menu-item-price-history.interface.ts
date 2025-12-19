import { Types } from 'mongoose';

export interface IMenuItemPriceHistory {
  _id: Types.ObjectId;
  menuItemId: Types.ObjectId;
  price: number;
  costPerUnit: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  reason?: string;
  changedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type PriceChangeReason =
  | 'supplier_increase'
  | 'supplier_decrease'
  | 'promotion'
  | 'seasonal'
  | 'market_adjustment'
  | 'cost_optimization'
  | 'initial_price'
  | 'manual_adjustment';
