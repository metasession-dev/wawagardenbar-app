import { Types } from 'mongoose';

export type TabStatus = 'open' | 'settling' | 'closed';

export interface ITab {
  _id: Types.ObjectId;
  tabNumber: string;
  customName?: string;
  tableNumber: string;
  userId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdByRole?: 'admin' | 'super-admin' | 'customer';
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
  paidAt?: Date;
  openedAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
