import { Types } from 'mongoose';

export type TabStatus = 'open' | 'settling' | 'closed';

/**
 * @requirement REQ-012 - Partial payment record for tabs
 * @requirement REQ-035 - per-row tipAmount
 * @requirement REQ-036 - independent per-row tipPaymentMethod (falls back to paymentType)
 */
export interface IPartialPayment {
  amount: number;
  note: string;
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference?: string;
  processedBy: Types.ObjectId;
  paidAt: Date;
  /**
   * REQ-035 — tip on this partial-payment row. Defaults to 0. Tab-level
   * `tipAmount` is recomputed server-side as the sum of these via
   * TabModel.pre('save').
   */
  tipAmount?: number;
  /**
   * REQ-036 — independent tip payment method. Optional; when unset, the
   * daily-report aggregator falls back to this row's `paymentType`.
   */
  tipPaymentMethod?: 'cash' | 'transfer' | 'card';
}

export interface ITab {
  _id: Types.ObjectId;
  tabNumber: string;
  customName?: string;
  tableNumber: string;
  userId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdByRole?: import('./user.interface').UserRole;
  openedByStaffId?: Types.ObjectId;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  guestId?: string;
  status: TabStatus;
  orders: Types.ObjectId[];
  subtotal: number;
  serviceFee: number;
  tax: number;
  deliveryFee: number;
  discountTotal: number;
  tipAmount: number;
  total: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentReference?: string;
  transactionReference?: string;
  partialPayments: IPartialPayment[];
  paidAt?: Date;
  businessDate?: Date;
  openedAt: Date;
  closedAt?: Date;
  reconciled?: boolean;
  reconciledAt?: Date;
  reconciledBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
