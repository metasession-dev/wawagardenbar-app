/**
 * @requirement REQ-064 — Support ticket model + WA-fed staff queue (#117 P3 #17)
 *
 * Service layer for SupportTicket. All ticket mutations go through here so
 * the staff UI, the customer submit-action, and the WhatsApp inbound bridge
 * share one persistence + side-effect path (reply notifications via REQ-054's
 * NotificationService).
 *
 * @requirement REQ-WA-011 — conversation threading, 72h reopen (REQ-118 AC1)
 * @requirement REQ-WA-012 — window-aware reply mode (REQ-118 AC2)
 * @requirement REQ-WA-013 — human-handoff urgency and SLA (REQ-118 AC3)
 */
import { supportReplyParams } from '@/lib/whatsapp-template-params';
import { phoneLookupVariants } from '@/lib/auth-utils';
import {
  getReplyMode,
  HANDOFF_SLA_MS,
  REOPEN_WINDOW_MS,
  type ReplyMode,
} from '@/lib/support-reply-mode';
import IncomingMessageModel from '@/models/incoming-message-model';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
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
   * Bridge from REQ-056's WhatsAppInboundService.handle for `support_text`
   * and `chat_with_staff`.
   *
   * REQ-118 (AC1) — a customer has ONE ongoing conversation: the message is
   * appended to their open ticket (status not resolved or closed); a ticket
   * resolved within the last 72 hours is reopened; a new ticket is created
   * only when neither exists. REQ-118 (AC3) — `urgent` (the "Chat with staff"
   * handoff) marks the ticket urgent with an SLA fifteen minutes ahead, unless
   * an SLA is already running.
   */
  static async createFromWhatsAppInbound(opts: {
    from: string;
    body: string;
    userId: string | null;
    urgent?: boolean;
  }): Promise<ISupportTicket> {
    await connectDB();
    const trimmed = opts.body.trim();
    const now = new Date();
    const identity: Record<string, unknown>[] = [
      { customerPhone: { $in: phoneLookupVariants(opts.from) } },
    ];
    if (opts.userId) identity.push({ userId: opts.userId });

    const existing =
      (await SupportTicketModel.findOne({
        $or: identity,
        status: { $nin: ['resolved', 'closed'] },
      })
        .sort({ updatedAt: -1 })
        .lean<ISupportTicket | null>()) ??
      (await SupportTicketModel.findOne({
        $or: identity,
        status: 'resolved',
        resolvedAt: { $gte: new Date(now.getTime() - REOPEN_WINDOW_MS) },
      })
        .sort({ resolvedAt: -1 })
        .lean<ISupportTicket | null>());

    if (existing) {
      const set: Record<string, unknown> = {
        lastCustomerMessageAt: now,
      };
      if (existing.status === 'resolved') {
        set.status = 'open';
        set.resolvedAt = null;
      } else if (existing.status === 'awaiting_customer') {
        // The customer answered; staff are on the hook again.
        set.status = 'in_progress';
      }
      if (opts.urgent) {
        set.priority = 'urgent';
        if (!existing.slaDueAt) {
          set.slaDueAt = new Date(now.getTime() + HANDOFF_SLA_MS);
        }
      }
      const updated = await SupportTicketModel.findByIdAndUpdate(
        existing._id,
        {
          $set: set,
          $push: {
            replies: {
              authorRole: 'customer',
              authorUserId: opts.userId,
              body: trimmed,
              createdAt: now,
            },
          },
        },
        { new: true }
      ).lean<ISupportTicket>();
      return (updated ?? existing) as ISupportTicket;
    }

    const preview =
      trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
    const created = await this.createTicket({
      userId: opts.userId,
      customerPhone: opts.from,
      source: 'whatsapp',
      category: 'whatsapp-inbound',
      subject: preview || 'WhatsApp message',
      message: trimmed,
      priority: opts.urgent ? 'urgent' : undefined,
    });
    const followUp: Record<string, unknown> = { lastCustomerMessageAt: now };
    if (opts.urgent) {
      followUp.slaDueAt = new Date(now.getTime() + HANDOFF_SLA_MS);
    }
    await SupportTicketModel.updateOne(
      { _id: created._id },
      { $set: followUp }
    );
    return created;
  }

  /**
   * REQ-118 (AC2) — which mode a staff reply to this ticket will use. The
   * customer's last inbound WhatsApp message (any ticket) opens the 24-hour
   * window; the ticket's own `lastCustomerMessageAt` is the fallback.
   */
  static async getReplyMode(ticket: {
    customerPhone?: string | null;
    lastCustomerMessageAt?: Date | string | null;
  }): Promise<{ mode: ReplyMode; lastInboundAt: Date | null }> {
    await connectDB();
    let lastInboundAt: Date | null = null;
    if (ticket.customerPhone) {
      const last = await IncomingMessageModel.findOne({
        from: { $in: phoneLookupVariants(ticket.customerPhone) },
      })
        .sort({ receivedAt: -1 })
        .select('receivedAt')
        .lean<{ receivedAt?: Date } | null>();
      lastInboundAt = last?.receivedAt ?? null;
    }
    if (!lastInboundAt && ticket.lastCustomerMessageAt) {
      lastInboundAt = new Date(ticket.lastCustomerMessageAt);
    }
    return { mode: getReplyMode(lastInboundAt), lastInboundAt };
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
    // REQ-118 (AC3) — tickets with a running SLA come first, soonest due
    // first (overdue ones therefore lead); the rest follow newest first.
    const noSla = new Date('9999-12-31T00:00:00Z');
    const [tickets, total] = await Promise.all([
      SupportTicketModel.aggregate<ISupportTicket>([
        { $match: query },
        { $addFields: { _slaSort: { $ifNull: ['$slaDueAt', noSla] } } },
        { $sort: { _slaSort: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _slaSort: 0 } },
      ]),
      SupportTicketModel.countDocuments(query),
    ]);
    return { tickets, total };
  }

  /**
   * REQ-118 — the queue shows the customer's first name next to the phone.
   * One batched user lookup for the page, not one per row.
   */
  static async customerFirstNames(
    tickets: Array<{ userId: string | null }>
  ): Promise<Map<string, string>> {
    await connectDB();
    const ids = [
      ...new Set(
        tickets.map((t) => t.userId).filter((id): id is string => !!id)
      ),
    ];
    if (ids.length === 0) return new Map();
    const users = await UserModel.find({ _id: { $in: ids } })
      .select('firstName name')
      .lean<Array<{ _id: unknown; firstName?: string; name?: string }>>();
    const names = new Map<string, string>();
    for (const user of users) {
      const first = user.firstName ?? user.name?.split(' ')[0];
      if (first) names.set(String(user._id), first);
    }
    return names;
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
    const set: Record<string, unknown> = { status };
    if (status === 'resolved' || status === 'closed') {
      // REQ-118 — a finished ticket has no running SLA; remember when it was
      // resolved so a reply within 72 hours can reopen it.
      set.slaDueAt = null;
      set.resolvedAt = status === 'resolved' ? new Date() : null;
    } else {
      set.resolvedAt = null;
    }
    return SupportTicketModel.findByIdAndUpdate(
      ticketId,
      { $set: set },
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
        // REQ-118 — a staff reply answers the handoff: stop the SLA clock.
        ...(opts.authorRole === 'staff' ? { $set: { slaDueAt: null } } : {}),
      },
      { new: true }
    ).lean<ISupportTicket>();

    if (!updated) return null;

    if (opts.authorRole === 'staff' && updated.userId) {
      // Best-effort outbound. Channel fallback honours consent (REQ-054).
      // WhatsApp template won't exist until WA-1 is approved at Meta;
      // falls through to email — that's the right behaviour today.
      try {
        await connectDB();
        const customer = await UserModel.findById(updated.userId)
          .select('firstName name')
          .lean<{ firstName?: string; name?: string }>();
        const replyParams = supportReplyParams({
          ticketNumber: updated.ticketNumber,
          customerName: customer?.firstName ?? customer?.name,
          subject: updated.subject,
          reply: opts.body,
        });
        // REQ-118 (AC2) — free-form inside the customer's 24-hour window,
        // the approved template outside it.
        const { mode } = await this.getReplyMode(updated);
        await NotificationService.send({
          userId: updated.userId,
          templateKey: 'support_reply',
          // REQ-115 (D2) — header [ticket no.], body [first name, subject, reply].
          whatsapp: {
            params: replyParams.bodyParams,
            headerParams: replyParams.headerParams,
            ...(mode === 'free_form' ? { freeFormText: opts.body } : {}),
          },
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
