/**
 * @requirement REQ-064 — Support ticket model + WA-fed staff queue (#117 P3 #17)
 *
 * Persistent store for customer support tickets. Sources:
 *   - `web`     — `<SupportForm />` submission via `submitSupportTicketAction`
 *   - `whatsapp`— REQ-056's `WhatsAppInboundService.handle` auto-creates when
 *                 intent === 'support_text'
 *
 * Replies are an embedded subdoc array (single-document writes; one ticket =
 * one query). Reply notifications are sent via REQ-054's NotificationService
 * with the `support_reply` template (transactional category) — channel
 * fallback honours consent.
 */
import { Schema, model, models, type Model, type Document } from 'mongoose';

export type SupportTicketStatus =
  | 'open'
  | 'in_progress'
  | 'awaiting_customer'
  | 'resolved'
  | 'closed';

export type SupportTicketSource = 'web' | 'whatsapp';

// REQ-118 (AC3) — `urgent` is set by the WhatsApp "Chat with staff" handoff.
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type SupportTicketCategory =
  | 'order-issue'
  | 'payment-issue'
  | 'delivery-issue'
  | 'account-issue'
  | 'feedback'
  | 'other'
  | 'whatsapp-inbound';

export type SupportReplyAuthorRole = 'staff' | 'customer';

export interface ISupportReply {
  authorRole: SupportReplyAuthorRole;
  authorUserId: string | null;
  body: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  ticketNumber: string;
  userId: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  source: SupportTicketSource;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  orderId: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assignedTo: string | null;
  /** REQ-118 (AC1/AC2) — when the customer last wrote to this ticket. */
  lastCustomerMessageAt: Date | null;
  /** REQ-118 (AC3) — staff must respond by this time; cleared on a staff reply or resolution. */
  slaDueAt: Date | null;
  /** REQ-118 (AC1) — when the ticket was last resolved; the 72h reopen window counts from here. */
  resolvedAt: Date | null;
  replies: ISupportReply[];
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<ISupportReply>(
  {
    authorRole: {
      type: String,
      enum: ['staff', 'customer'],
      required: true,
    },
    authorUserId: { type: String, default: null },
    body: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    userId: { type: String, default: null },
    customerEmail: { type: String, default: null },
    customerPhone: { type: String, default: null },
    source: {
      type: String,
      enum: ['web', 'whatsapp'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'order-issue',
        'payment-issue',
        'delivery-issue',
        'account-issue',
        'feedback',
        'other',
        'whatsapp-inbound',
      ],
      required: true,
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    orderId: { type: String, default: null },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'awaiting_customer', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    assignedTo: { type: String, default: null },
    lastCustomerMessageAt: { type: Date, default: null },
    slaDueAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true }
);

// Indexes
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ source: 1, createdAt: -1 });
// REQ-118 — find a customer's open ticket and order the queue by SLA.
supportTicketSchema.index({ customerPhone: 1, status: 1, updatedAt: -1 });
supportTicketSchema.index({ slaDueAt: 1 });

const SupportTicketModel: Model<ISupportTicket> =
  (models.SupportTicket as Model<ISupportTicket>) ||
  model<ISupportTicket>('SupportTicket', supportTicketSchema);

export default SupportTicketModel;
