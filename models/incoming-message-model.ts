/**
 * @requirement REQ-056 — WhatsApp inbound-message router
 *
 * Persists every inbound WhatsApp message we receive, with the
 * classifier output and the routing decision the router took.
 * Companion to REQ-055's NotificationLog: outbound audit trail there,
 * inbound audit trail here.
 *
 * Forensic surface for "the customer says they messaged us — what did
 * we do with it?" + the data backing future support-queue UI.
 */
import { Schema, model, models, type Model, type Document } from 'mongoose';

export type IncomingCustomerState = 'new' | 'signing_up' | 'active' | 'dormant';

export type IncomingMessageIntent =
  | 'opt_out'
  | 'chat_with_staff'
  | 'support_text';

export interface IIncomingMessage extends Document {
  from: string;
  body: string | null;
  messageType: string;
  messageId: string;
  classifiedState: IncomingCustomerState;
  classifiedIntent: IncomingMessageIntent;
  actionTaken: string;
  userId: string | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const incomingMessageSchema = new Schema<IIncomingMessage>(
  {
    from: { type: String, required: true },
    body: { type: String, default: null },
    messageType: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    classifiedState: {
      type: String,
      required: true,
      enum: ['new', 'signing_up', 'active', 'dormant'],
    },
    classifiedIntent: {
      type: String,
      required: true,
      enum: ['opt_out', 'chat_with_staff', 'support_text'],
    },
    actionTaken: { type: String, required: true },
    userId: { type: String, default: null },
    receivedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// Indexes:
//   - from + receivedAt: "show me this customer's recent inbound traffic"
//   - messageId: unique; dedup if Meta retries
//   - receivedAt: admin recent-inbound view
incomingMessageSchema.index({ from: 1, receivedAt: -1 });
incomingMessageSchema.index({ receivedAt: -1 });

const IncomingMessageModel: Model<IIncomingMessage> =
  (models.IncomingMessage as Model<IIncomingMessage>) ||
  model<IIncomingMessage>('IncomingMessage', incomingMessageSchema);

export default IncomingMessageModel;
