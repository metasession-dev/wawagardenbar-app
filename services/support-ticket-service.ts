/**
 * @requirement REQ-064 — Support ticket model + WA-fed staff queue (#117 P3 #17)
 *
 * Service layer for SupportTicket. All ticket mutations go through here so
 * the staff UI, the customer submit-action, and the WhatsApp inbound bridge
 * share one persistence + side-effect path (reply notifications via REQ-054's
 * NotificationService).
 */
import { connectDB } from '@/lib/mongodb';
import SupportTicketModel, {
  type ISupportTicket,
  type SupportTicketStatus,
  type SupportTicketSource,
  type SupportTicketCategory,
  type SupportTicketPriority,
} from '@/models/support-ticket-model';
import { NotificationService } from '@/services/notification-service';
import { sendSupportTicketEmail } from '@/lib/email';

export interface CreateTicketInput {
  userId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  source: SupportTicketSource;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  orderId?: string | null;
  priority?: SupportTicketPriority;
}

export interface ListTicketsFilter {
  status?: SupportTicketStatus | 'all';
  source?: SupportTicketSource | 'all';
  category?: SupportTicketCategory | 'all';
  search?: string;
  limit?: number;
  skip?: number;
}

function generateTicketNumber(): string {
  // TKT-<timestamp><3 random digits> — collision space is effectively unique
  // for our volume; the unique index on `ticketNumber` is the backstop.
  const ts = Date.now();
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `TKT-${ts}${suffix}`;
}

export class SupportTicketService {
  /**
   * Create a ticket from any source. Returns the persisted doc (lean object).
   */
  static async createTicket(input: CreateTicketInput): Promise<ISupportTicket> {
    await connectDB();
    const ticketNumber = generateTicketNumber();
    const doc = await SupportTicketModel.create({
      ticketNumber,
      userId: input.userId ?? null,
      customerEmail: input.customerEmail ?? null,
      customerPhone: input.customerPhone ?? null,
      source: input.source,
      category: input.category,
      subject: input.subject,
      message: input.message,
      orderId: input.orderId ?? null,
      priority: input.priority ?? 'normal',
    });
    return doc;
  }

  /**
   * Bridge from REQ-056's WhatsAppInboundService.handle when intent is
   * `support_text`. Body preview becomes the subject; full body is the
   * message. Source is fixed to `whatsapp` and category to
   * `whatsapp-inbound`.
   */
  static async createFromWhatsAppInbound(opts: {
    from: string;
    body: string;
    userId: string | null;
  }): Promise<ISupportTicket> {
    const trimmed = opts.body.trim();
    const preview =
      trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
    return this.createTicket({
      userId: opts.userId,
      customerPhone: opts.from,
      source: 'whatsapp',
      category: 'whatsapp-inbound',
      subject: preview || 'WhatsApp message',
      message: trimmed,
    });
  }

  static async listTickets(
    filter: ListTicketsFilter = {}
  ): Promise<{ tickets: ISupportTicket[]; total: number }> {
    await connectDB();
    const query: Record<string, unknown> = {};
    if (filter.status && filter.status !== 'all') {
      query.status = filter.status;
    }
    if (filter.source && filter.source !== 'all') {
      query.source = filter.source;
    }
    if (filter.category && filter.category !== 'all') {
      query.category = filter.category;
    }
    if (filter.search && filter.search.trim()) {
      const rx = new RegExp(
        filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      query.$or = [
        { ticketNumber: rx },
        { subject: rx },
        { customerEmail: rx },
        { customerPhone: rx },
      ];
    }
    const limit = filter.limit ?? 50;
    const skip = filter.skip ?? 0;
    const [tickets, total] = await Promise.all([
      SupportTicketModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean<ISupportTicket[]>(),
      SupportTicketModel.countDocuments(query),
    ]);
    return { tickets, total };
  }

  static async getTicketById(ticketId: string): Promise<ISupportTicket | null> {
    await connectDB();
    return SupportTicketModel.findById(ticketId).lean<ISupportTicket>();
  }

  static async updateStatus(
    ticketId: string,
    status: SupportTicketStatus
  ): Promise<ISupportTicket | null> {
    await connectDB();
    return SupportTicketModel.findByIdAndUpdate(
      ticketId,
      { $set: { status } },
      { new: true }
    ).lean<ISupportTicket>();
  }

  /**
   * Append a reply to the ticket and (best-effort) notify the customer via
   * REQ-054's NotificationService. The notification is fire-and-forget from
   * the reply's perspective — a failed send doesn't roll back the reply
   * (it's the staff-side persistence that's the source of truth).
   */
  static async addReply(opts: {
    ticketId: string;
    body: string;
    authorRole: 'staff' | 'customer';
    authorUserId: string | null;
  }): Promise<ISupportTicket | null> {
    await connectDB();
    const updated = await SupportTicketModel.findByIdAndUpdate(
      opts.ticketId,
      {
        $push: {
          replies: {
            authorRole: opts.authorRole,
            authorUserId: opts.authorUserId,
            body: opts.body,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean<ISupportTicket>();

    if (!updated) return null;

    if (opts.authorRole === 'staff' && updated.userId) {
      // Best-effort outbound. Channel fallback honours consent (REQ-054).
      // WhatsApp template won't exist until WA-1 is approved at Meta;
      // falls through to email — that's the right behaviour today.
      try {
        await NotificationService.send({
          userId: updated.userId,
          templateKey: 'support_reply',
          whatsapp: { params: [updated.ticketNumber, opts.body] },
          email: async () => {
            if (updated.customerEmail) {
              await sendSupportTicketEmail(updated.customerEmail, {
                ticketNumber: updated.ticketNumber,
                category: updated.category,
                subject: `Re: ${updated.subject}`,
                message: opts.body,
              });
            }
          },
        });
      } catch (error) {
        // Persistence wins; notification is best-effort.
        // eslint-disable-next-line no-console
        console.error(
          '[SupportTicketService] reply notification failed:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return updated;
  }
}
