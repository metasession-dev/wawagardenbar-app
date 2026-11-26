/**
 * @requirement REQ-128 — Refund ledger (ADR-015)
 */
import type { Document, Types } from 'mongoose';

export type RefundType = 'full' | 'partial';
export type RefundStatus = 'pending' | 'processed' | 'failed';
/** Who or what asked for the refund. */
export type RefundSource =
  | 'customer_cancel'
  | 'whatsapp_cancel'
  | 'staff'
  | 'request_approval';

export interface IRefund extends Document {
  orderId: Types.ObjectId;
  orderNumber: string;
  /** Amount in kobo (NGN minor unit). */
  amountKobo: number;
  type: RefundType;
  status: RefundStatus;
  source: RefundSource;
  /** Staff user who asked; null for a customer's own automatic refund. */
  requestedBy: Types.ObjectId | null;
  /** manager/admin who approved a refund request (or the staff user for a direct refund). */
  approvedBy: Types.ObjectId | null;
  reason: string;
  paystackRefundId?: string;
  /** Original Paystack transaction reference the refund was made against. */
  transactionReference?: string;
  failureReason?: string;
  processedAt?: Date;
  /** Support ticket that carried the request, when there was one. */
  supportTicketId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
