import { Types } from 'mongoose';

export type TabStatus = 'open' | 'settling' | 'closed';

/**
 * @requirement REQ-012 - Partial payment record for tabs
 */
export interface IPartialPayment {
  amount: number;
  note: string;
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference?: string;
  processedBy: Types.ObjectId;
  paidAt: Date;
}

export interface ITab {
  _id: Types.ObjectId;
  tabNumber: string;
  customName?: string;
  tableNumber: string;
  userId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdByRole?: 'customer' | 'csr' | 'admin' | 'super-admin';
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
  openedAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
