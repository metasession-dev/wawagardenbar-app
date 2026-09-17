import { ObjectId } from 'mongodb';

/**
 * @requirement REQ-106
 * Unified opening-balance + correction audit ledger for Current Cash
 * Position. Every entry is a signed delta — the initial opening balance is
 * `type: 'seed'`, every later super-admin correction is `type: 'correction'`
 * — both summed identically by CashPositionService; `type` exists purely
 * for audit/display labeling, not different computation logic.
 */
export type CashPositionAdjustmentType = 'seed' | 'correction';

export interface ICashPositionAdjustment {
  _id: ObjectId;
  type: CashPositionAdjustmentType;
  amount: number;
  effectiveDate: Date;
  note?: string;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCashPositionAdjustmentDTO {
  type: CashPositionAdjustmentType;
  amount: number;
  effectiveDate: Date;
  note?: string;
  createdBy: string;
}
