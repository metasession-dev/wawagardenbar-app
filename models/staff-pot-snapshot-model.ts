/**
 * @requirement REQ-015 - Monthly Staff Pot snapshot for historical records
 */
import mongoose, { Schema, Model } from 'mongoose';

export interface IStaffPotDailyEntry {
  date: Date;
  revenue: number;
  target: number;
  surplus: number;
  contribution: number;
}

export interface IStaffPotSnapshot {
  month: number;
  year: number;
  totalPot: number;
  qualifyingDays: number;
  totalDays: number;
  dailyEntries: IStaffPotDailyEntry[];
  kitchenPayout: number;
  barPayout: number;
  kitchenDeduction: number;
  barDeduction: number;
  inventoryLoss?: {
    foodLossPercent: number;
    drinkLossPercent: number;
    foodInventoryValue: number;
    drinkInventoryValue: number;
    foodDeduction: number;
    drinkDeduction: number;
  };
  config: {
    dailyTarget: number;
    bonusPercentage: number;
    kitchenSplitRatio: number;
    barSplitRatio: number;
    kitchenStaffCount: number;
    barStaffCount: number;
    inventoryLossEnabled?: boolean;
    foodLossThreshold?: number;
    drinkLossThreshold?: number;
  };
  finalized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const staffPotSnapshotSchema = new Schema<IStaffPotSnapshot>(
  {
    month: { type: Number, required: true, min: 0, max: 11 },
    year: { type: Number, required: true },
    totalPot: { type: Number, default: 0 },
    qualifyingDays: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },
    dailyEntries: [
      {
        date: { type: Date, required: true },
        revenue: { type: Number, default: 0 },
        target: { type: Number, default: 0 },
        surplus: { type: Number, default: 0 },
        contribution: { type: Number, default: 0 },
      },
    ],
    kitchenPayout: { type: Number, default: 0 },
    barPayout: { type: Number, default: 0 },
    kitchenDeduction: { type: Number, default: 0 },
    barDeduction: { type: Number, default: 0 },
    inventoryLoss: {
      type: {
        foodLossPercent: { type: Number },
        drinkLossPercent: { type: Number },
        foodInventoryValue: { type: Number },
        drinkInventoryValue: { type: Number },
        foodDeduction: { type: Number },
        drinkDeduction: { type: Number },
      },
      default: undefined,
    },
    config: {
      dailyTarget: { type: Number },
      bonusPercentage: { type: Number },
      kitchenSplitRatio: { type: Number },
      barSplitRatio: { type: Number },
      kitchenStaffCount: { type: Number },
      barStaffCount: { type: Number },
      inventoryLossEnabled: { type: Boolean },
      foodLossThreshold: { type: Number },
      drinkLossThreshold: { type: Number },
    },
    finalized: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

staffPotSnapshotSchema.index({ month: 1, year: 1 }, { unique: true });

const StaffPotSnapshotModel: Model<IStaffPotSnapshot> =
  mongoose.models.StaffPotSnapshot ||
  mongoose.model<IStaffPotSnapshot>('StaffPotSnapshot', staffPotSnapshotSchema);

export default StaffPotSnapshotModel;
