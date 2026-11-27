/**
 * @requirement REQ-056 — WhatsApp inbound-message router
 *
 * Customer-state-aware router for inbound WhatsApp messages. Closes
 * three gaps in the previous outbound-only WhatsApp surface:
 *
 *   1. STOP opt-out is now honoured (Meta WABA policy requirement).
 *   2. The 24-hour customer-service window is used (free-form reply).
 *   3. Unknown phones auto-create User rows so future outbound sends
 *      have a consent record to gate on.
 *
 * Composition:
 *   - `classifyCustomerState(phone)` → 'new' | 'signing_up' | 'active' |
 *     'dormant' based on whether the User exists, has `phoneVerified`,
 *     and how recent `lastLoginAt` is (30-day threshold).
 *   - `classifyMessageIntent(message)` → 'opt_out' | 'chat_with_staff' |
 *     'support_text' based on the inbound payload only (no DB).
 *   - `handle(message, value)` → orchestrator. Persists IncomingMessage,
 *     applies the routing matrix, returns an action tag.
 *
 * Routing matrix (state × intent):
 *
 *                  | opt_out                    | chat_with_staff       | support_text
 *   ---------------+----------------------------+-----------------------+------------------
 *   new            | auto-create + opt-out      | auto-create + welcome | auto-create + welcome
 *   signing_up     | opt-out + free-form ack    | welcome_new_user      | welcome_new_user
 *   active         | opt-out + free-form ack    | queued_for_staff      | queued_for_staff
 *   dormant        | opt-out + free-form ack    | welcome_back          | welcome_back
 *
 * STOP compliance (REQ-116): opt_out sets `whatsappMarketing` to false
 * regardless of state; `whatsappTransactional` is left unchanged (order and
 * booking messages are part of the service). START (opt_in) restores
 * marketing with consent source `whatsapp_inbound`.
 *
 * Safety: every path is try/catch-wrapped at the orchestrator boundary;
 * persistence errors are console.error'd; outbound send errors are
 * swallowed (REQ-054's NotificationService handles its own fallback).
 */
import { connectDB } from '@/lib/mongodb';
import { UserModel, OrderModel } from '@/models';
import IncomingMessageModel, {
  type IncomingCustomerState,
  type IncomingMessageIntent,
} from '@/models/incoming-message-model';
import { NotificationService } from '@/services/notification-service';
import { WhatsAppService } from '@/lib/whatsapp';
import { INBOUND_WELCOME_TEMPLATE } from '@/lib/whatsapp-inbound-templates';
import { normalizePhone, phoneLookupVariants } from '@/lib/auth-utils';
import { STAFF_ROLES } from '@/interfaces/user.interface';
import { SettingsService } from '@/services/settings-service';
import {
  accountRecoveryParams,
  welcomeBackParams,
  welcomeNewUserParams,
} from '@/lib/whatsapp-template-params';

const DORMANT_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

const STOP_REGEX = /^\s*(stop|unsubscribe|opt[-\s]?out)\s*$/i;
const START_REGEX = /^\s*(start|subscribe|opt[-\s]?in)\s*$/i;
const CHAT_WITH_STAFF_LABEL = '💬 Chat with Staff';
const CHAT_WITH_STAFF_ID = 'chat_with_staff';

// REQ-111 — account-recovery detection. EMAIL_REGEX is a permissive
// first-match scan (not full RFC 5322 validation — we only need "does the
// body contain something that looks like an email" to try a DB lookup).
// ORDER_NUMBER_REGEX matches OrderService.generateOrderNumber()'s format:
// 'WG' + 6-digit dateKey + 4-digit sequence = 'WG' + 10 digits.
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const ORDER_NUMBER_REGEX = /\bWG\d{10}\b/;
// REQ-128 (REQ-WA-019) — only a short imperative counts ("cancel", "cancel my
// order", "cancel WG2611260001"). A question such as "can I cancel?" is
// ordinary support text, because a cancel here refunds money and cannot be undone.
const CANCEL_REGEX =
  /^\s*(?:please\s+)?cancel(?:\s+(?:my\s+)?order)?(?:\s+#?(WG\d{10}))?\s*[.!]*\s*$/i;

// REQ-126 — all orders are made in the app. "order" returns the menu link;
// a status enquiry raises an urgent ticket and never returns order data.
const ORDER_STATUS_REGEX =
  /\b(status|where(?:'s|\s+is)?\s+(?:my\s+)?order|track(?:ing)?\s+(?:my\s+)?order)\b/i;
// An order request is a message that is nothing but an order word and polite
// filler ("order", "menu please", "I want to order", "can I get the menu").
// Anything else that mentions an order or a drink ("my order is late", "Also
// the drink was warm", "Order number is 4821") is ordinary support text and
// still opens a ticket.
const ORDER_WORDS = new Set([
  'order',
  'orders',
  'menu',
  'food',
  'drink',
  'drinks',
]);
const ORDER_FILLER = new Set([
  'hi',
  'hello',
  'hey',
  'please',
  'pls',
  'plz',
  'i',
  'we',
  'want',
  'would',
  'like',
  'to',
  'can',
  'could',
  'get',
  'see',
  'have',
  'the',
  'a',
  'your',
  'now',
  'link',
  'here',
  'online',
  'send',
  'me',
  'show',
  'need',
  'wanna',
  'some',
]);

export function isOrderRequest(body: string): boolean {
  const tokens = body
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const rest = tokens.filter((w) => !ORDER_FILLER.has(w));
  return rest.length > 0 && rest.every((w) => ORDER_WORDS.has(w));
}
const ORDER_QUICK_REPLY_LABELS = new Set(['Order', '🍽️ Order']);

/** The environment's menu URL, built like the other message links. */
export function buildMenuUrl(baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(
    /\/+$/,
    ''
  );
  return `${base}/menu`;
}

export function orderLinkReplyText(baseUrl?: string): string {
  return (
    `Order from our menu here: ${buildMenuUrl(baseUrl)}\n` +
    'Pay securely online and we will start preparing your order.'
  );
}

// REQ-129 (REQ-WA-020) — a short message with a booking word gets the /book
// link. A long message that merely mentions a table or an event ("the table
// next to us was loud, we booked for a birthday ...") is ordinary support text
// and still opens a ticket, so a complaint is never answered with a link.
const BOOKING_REGEX =
  /\b(book|booking|reserve|reservation|table|event|party|birthday)\b/i;
const BOOKING_MAX_WORDS = 10;

// A message about an existing booking ("a question about my booking", "I want
// to change my reservation") is for staff, not a request to make one.
const EXISTING_BOOKING_REGEX =
  /\b(?:my|our)\s+(?:booking|bookings|reservation|reservations|event|party|table)\b|\b(?:question|problem|issue|complaint|change|amend|update|cancel)\b/i;

export function isBookingRequest(body: string): boolean {
  const words = body.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 0 &&
    words.length <= BOOKING_MAX_WORDS &&
    BOOKING_REGEX.test(body) &&
    !EXISTING_BOOKING_REGEX.test(body)
  );
}

/** The environment's booking page URL, built like the other message links. */
export function buildBookingUrl(baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(
    /\/+$/,
    ''
  );
  return `${base}/book`;
}

export function bookingLinkReplyText(baseUrl?: string): string {
  return (
    `You can book a table or tell us about your event here: ${buildBookingUrl(baseUrl)}\n` +
    "Send us your details and we'll get back to you shortly."
  );
}

export const CANCEL_NO_ORDER_TEXT =
  "We couldn't find an order of yours that can be cancelled. If you need help, reply here and our team will get back to you.";
export const CANCEL_REQUEST_TEXT =
  "Your order is already being prepared, so we've passed your request to our manager.";
export const CANCEL_FAILED_TEXT =
  "We couldn't cancel that order. Our team will help you shortly.";

export const ORDER_STATUS_ACK_TEXT =
  "Thanks, we're checking on your order. A member of our team will message you shortly.";

const OPT_OUT_CONFIRMATION_TEXT =
  "You've been unsubscribed from WhatsApp offers and promotions. " +
  "You'll still receive messages about your orders and bookings. " +
  'Reply START to resubscribe.';
// REQ-122 — the only reply a verified staff alert number gets.
export const STAFF_NUMBER_REPLY_TEXT =
  'Thanks, please open the dashboard to handle alerts.';
const OPT_IN_CONFIRMATION_TEXT =
  "You're subscribed to WhatsApp offers and promotions. " +
  'Reply STOP at any time to unsubscribe.';

// REQ-116 (AC7) — per-phone sliding-window limit. In memory, per instance,
// reset on restart (ADR-007, R-044).
export const RATE_LIMIT_MAX = 20;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const recentByPhone = new Map<string, number[]>();

/** Records a message and returns true when the phone is over its limit. */
export function isRateLimited(phone: string, now = Date.now()): boolean {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (recentByPhone.get(phone) ?? []).filter((t) => t > cutoff);
  hits.push(now);
  recentByPhone.set(phone, hits);
  return hits.length > RATE_LIMIT_MAX;
}

export function resetRateLimits(): void {
  recentByPhone.clear();
}

// REQ-116 (AC8) — retry transient outbound failures, then raise an Incident.
export const RETRY_DELAYS_MS = [1000, 5000, 30000];
const RETRYABLE_CODES = new Set([
  'API_ERROR',
  'QUOTA_EXCEEDED',
  'SEND_FAILED',
  'UNKNOWN_ERROR',
]);
export const retryConfig = {
  delays: RETRY_DELAYS_MS,
  sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
};

async function sendWithRetry(
  to: string,
  send: () => Promise<{ success: boolean; errorCode?: string }>
): Promise<{ success: boolean; errorCode?: string }> {
  let result = await send();
  for (const delay of retryConfig.delays) {
    if (result.success || !RETRYABLE_CODES.has(result.errorCode ?? '')) {
      return result;
    }
    await retryConfig.sleep(delay);
    result = await send();
  }
  if (!result.success && RETRYABLE_CODES.has(result.errorCode ?? '')) {
    try {
      const { IncidentEventService } = await import(
        '@/services/incident-event-service'
      );
      await IncidentEventService.recordIncident({
        kind: 'notification_delivery_failed',
        entityId: to,
        summary: 'WhatsApp inbound reply failed after retries',
        errorDetails: { errorCode: result.errorCode ?? null },
      });
    } catch (error) {
      console.error(
        '[WhatsAppInbound] incident record failed:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  return result;
}

export interface MetaInboundMessage {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
}

interface ClassifyResult {
  state: IncomingCustomerState;
  user: unknown;
}

/**
 * REQ-115 (D8) — `actionTaken` reflects the real send outcome:
 * `<template>_sent` only when the send succeeded, otherwise
 * `<template>_failed:<errorCode>`.
 */
function outcomeTag(
  template: string,
  result: { success: boolean; errorCode?: string }
): string {
  return result.success
    ? `${template}_sent`
    : `${template}_failed:${result.errorCode ?? 'UNKNOWN'}`;
}

function extractBody(message: MetaInboundMessage): string | null {
  if (message.type === 'text') return message.text?.body ?? null;
  if (message.type === 'interactive') {
    const reply =
      message.interactive?.button_reply ?? message.interactive?.list_reply;
    return reply?.title ?? null;
  }
  return null;
}

export class WhatsAppInboundService {
  /**
   * Classify the customer behind an inbound phone number. Returns the
   * state plus the resolved user doc (or null for 'new'). Reads only —
   * the orchestrator handles auto-create when needed.
   */
  static async classifyCustomerState(phone: string): Promise<ClassifyResult> {
    await connectDB();
    // REQ-115 / ADR-006 — Meta's `from` has no '+'; match the canonical
    // form and, until the phone migration has run, the legacy stored forms.
    const user = await UserModel.findOne({
      phone: { $in: phoneLookupVariants(phone) },
      accountStatus: { $ne: 'deleted' },
    });
    if (!user) return { state: 'new', user: null };
    if (!user.phoneVerified) return { state: 'signing_up', user };
    const lastLogin = user.lastLoginAt
      ? new Date(user.lastLoginAt).getTime()
      : null;
    if (lastLogin === null) return { state: 'dormant', user };
    const ageMs = Date.now() - lastLogin;
    if (ageMs > DORMANT_THRESHOLD_MS) return { state: 'dormant', user };
    return { state: 'active', user };
  }

  /**
   * REQ-111 — scan an inbound message body for an identifying token
   * (email or order number) and resolve it to an existing User. Pure
   * lookup, no mutation — the caller decides what to do with the result.
   * Returns null if no token is present, or it's present but doesn't
   * resolve to anyone (deliberately not a mismatch signal on its own —
   * see handle()'s same-phone check for why a resolved match still isn't
   * automatically a mismatch).
   */
  static async detectAccountRecoverySignal(body: string | null) {
    if (!body) return null;
    await connectDB();

    const emailMatch = body.match(EMAIL_REGEX);
    if (emailMatch) {
      const user = await UserModel.findOne({
        email: emailMatch[0].toLowerCase(),
        accountStatus: { $ne: 'deleted' },
      });
      if (user) return user;
    }

    const orderMatch = body.match(ORDER_NUMBER_REGEX);
    if (orderMatch) {
      const order = await OrderModel.findOne({
        orderNumber: orderMatch[0],
      }).select('userId');
      if (order?.userId) {
        const user = await UserModel.findOne({
          _id: order.userId,
          accountStatus: { $ne: 'deleted' },
        });
        if (user) return user;
      }
    }

    return null;
  }

  /**
   * REQ-128 (REQ-WA-019) — cancel by WhatsApp. Returns the action tag.
   * Replies are service replies to a message just received (free-form).
   */
  private static async handleCancel(
    from: string,
    body: string | null,
    userId: string | null | undefined
  ): Promise<string> {
    const reply = async (text: string, tag: string): Promise<string> => {
      try {
        await sendWithRetry(from, () =>
          WhatsAppService.sendTextMessage(from, text)
        );
      } catch (error) {
        console.error(
          '[WhatsAppInbound] cancel reply failed:',
          error instanceof Error ? error.message : String(error)
        );
      }
      return tag;
    };

    if (!userId) return reply(CANCEL_NO_ORDER_TEXT, 'cancel_no_order');

    const candidates = await OrderModel.find({
      userId,
      origin: 'customer',
      paymentStatus: 'paid',
      status: {
        $in: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery'],
      },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id orderNumber')
      .lean<Array<{ _id: { toString(): string }; orderNumber: string }>>();

    if (candidates.length === 0) {
      return reply(CANCEL_NO_ORDER_TEXT, 'cancel_no_order');
    }

    const wanted = body?.match(CANCEL_REGEX)?.[1]?.toUpperCase();
    let chosen = candidates[0];
    if (wanted) {
      const found = candidates.find((c) => c.orderNumber === wanted);
      // Same wording as "no order": nothing is revealed about other orders.
      if (!found) return reply(CANCEL_NO_ORDER_TEXT, 'cancel_no_order');
      chosen = found;
    } else if (candidates.length > 1) {
      return reply(
        `You have more than one active order (${candidates
          .map((c) => c.orderNumber)
          .join(
            ', '
          )}). Reply "cancel" followed by the order number you want to cancel.`,
        'cancel_choose_order'
      );
    }

    const { RefundService } = await import('@/services/refund-service');
    const result = await RefundService.cancelPaidOrderForCustomer({
      orderId: chosen._id.toString(),
      customerUserId: userId,
      channel: 'whatsapp',
    });
    if (!result.ok) {
      return reply(CANCEL_FAILED_TEXT, `cancel_${result.code}`);
    }
    if (result.outcome === 'refund_request_created') {
      return reply(CANCEL_REQUEST_TEXT, 'cancel_request_created');
    }
    // Cancelled orders are confirmed by `order_cancelled` (RefundService → notifier).
    return 'cancelled_refund_started';
  }

  /**
   * Classify the intent of an inbound message. Pure function on the
   * Meta payload; no DB. Order matters: opt_out is checked before
   * chat_with_staff so a quick-reply labelled "STOP" (shouldn't happen
   * but defensive) is still treated as opt-out.
   */
  static classifyMessageIntent(
    message: MetaInboundMessage
  ): IncomingMessageIntent {
    const body = extractBody(message);
    if (body && STOP_REGEX.test(body)) return 'opt_out';
    if (body && START_REGEX.test(body)) return 'opt_in';

    if (message.type === 'interactive') {
      const reply = message.interactive?.button_reply;
      if (reply?.id === CHAT_WITH_STAFF_ID) return 'chat_with_staff';
      if (reply?.title === CHAT_WITH_STAFF_LABEL) return 'chat_with_staff';
    }
    if (body === CHAT_WITH_STAFF_LABEL) return 'chat_with_staff';

    // REQ-128 — a short "cancel" beats the status and order checks below
    // (an order number in "cancel WG…" must not read as a status enquiry).
    if (body && CANCEL_REGEX.test(body)) return 'order_cancel';

    // REQ-126 — a status enquiry beats an order request ("where is my order"
    // is a status enquiry); both beat ordinary support text.
    if (
      body &&
      (ORDER_STATUS_REGEX.test(body) || ORDER_NUMBER_REGEX.test(body))
    ) {
      return 'order_status';
    }
    if (message.type === 'interactive') {
      const title = message.interactive?.button_reply?.title;
      if (title && ORDER_QUICK_REPLY_LABELS.has(title)) return 'order_start';
    }
    if (body && isOrderRequest(body)) return 'order_start';

    // REQ-129 (REQ-WA-020) — a short booking message gets the /book link.
    // Opt-out, cancel, status and order intents above keep priority.
    if (body && isBookingRequest(body)) return 'booking';

    return 'support_text';
  }

  /**
   * Route an inbound message. Returns the action-tag string that was
   * persisted on the IncomingMessage row. The status branch of
   * handleWebhook is REQ-055's territory; this handles the inbound
   * branch only.
   */
  static async handle(
    message: MetaInboundMessage,
    _value: unknown
  ): Promise<string> {
    const from = message.from ?? '';
    const messageId = message.id ?? '';
    const messageType = message.type ?? 'unknown';
    const body = extractBody(message);
    const intent = this.classifyMessageIntent(message);

    let state: IncomingCustomerState = 'new';
    let userId: string | null = null;
    let actionTaken = 'noop';

    // REQ-116 (AC4) — insert-first idempotency (ADR-007). The unique index on
    // `messageId` is the single dedup mechanism: a duplicate delivery fails
    // the insert and produces no side effect.
    try {
      await IncomingMessageModel.create({
        from,
        body,
        messageType,
        messageId,
        classifiedState: state,
        classifiedIntent: intent,
        actionTaken: 'processing',
        userId,
      });
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        return 'duplicate';
      }
      console.error(
        '[WhatsAppInbound] IncomingMessage insert failed:',
        error instanceof Error ? error.message : String(error)
      );
      return 'persistence_failed';
    }

    // REQ-116 (AC7) — STOP/START are exempt so consent changes are always
    // honoured; everything else over the limit is stored with no side effect.
    const limited = isRateLimited(from);
    if (limited && intent !== 'opt_out' && intent !== 'opt_in') {
      await this.finalise(messageId, state, userId, 'rate_limited');
      return 'rate_limited';
    }

    // REQ-122 (REQ-WA-015) — a verified staff alert number is not a customer:
    // no welcome, no ticket and no account. It gets one fixed reply.
    try {
      if (await this.isVerifiedStaffAlertNumber(from)) {
        await WhatsAppService.sendTextMessage(from, STAFF_NUMBER_REPLY_TEXT);
        await this.finalise(messageId, 'active', null, 'staff_number_ack');
        return 'staff_number';
      }
    } catch (error) {
      console.error(
        '[WhatsAppInbound] staff-number check failed:',
        error instanceof Error ? error.message : String(error)
      );
    }

    try {
      const classified = await this.classifyCustomerState(from);
      state = classified.state;
      let user = classified.user as {
        _id: { toString(): string };
        phone?: string;
        firstName?: string;
        name?: string;
        preferences?: {
          communicationPreferences?: { whatsappTransactional?: boolean };
        };
      } | null;

      // REQ-111 — attempt account-recovery detection before auto-create,
      // but only when the baseline classifier said 'new'. An already-
      // classified existing user (signing_up/active/dormant) is
      // definitionally not a phone mismatch — they ARE on file already.
      if (state === 'new') {
        const matched = await this.detectAccountRecoverySignal(body);
        if (
          matched &&
          normalizePhone(matched.phone ?? '') !== normalizePhone(from)
        ) {
          state = 'phone_mismatch';
          user = matched as typeof user;
        }
      }

      // Auto-create when new (per AC6) — needed before opt-out
      // persistence and before any consent-gated outbound. Skipped for
      // phone_mismatch: the matched account already exists.
      if (state === 'new') {
        try {
          await connectDB();
          user = await UserModel.create({
            phone: normalizePhone(from),
            phoneVerified: false,
            isGuest: false,
          });
        } catch (error) {
          console.error(
            '[WhatsAppInbound] auto-create User failed:',
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      if (user?._id) {
        userId = user._id.toString();
      }

      // Opt-out always wins; STOP must be honoured regardless of state.
      // REQ-116 (AC6) — STOP clears marketing only.
      if (intent === 'opt_out' || intent === 'opt_in') {
        const optIn = intent === 'opt_in';
        if (user?._id) {
          try {
            await UserModel.updateOne(
              { _id: user._id },
              {
                $set: {
                  'preferences.communicationPreferences.whatsappMarketing':
                    optIn,
                  'preferences.communicationPreferencesUpdatedAt': new Date(),
                  'preferences.communicationPreferencesSource':
                    'whatsapp_inbound',
                },
              }
            );
          } catch (error) {
            console.error(
              '[WhatsAppInbound] consent persistence failed:',
              error instanceof Error ? error.message : String(error)
            );
          }
        }
        try {
          await sendWithRetry(from, () =>
            WhatsAppService.sendTextMessage(
              from,
              optIn ? OPT_IN_CONFIRMATION_TEXT : OPT_OUT_CONFIRMATION_TEXT
            )
          );
        } catch (error) {
          console.error(
            '[WhatsAppInbound] consent confirmation send failed:',
            error instanceof Error ? error.message : String(error)
          );
        }
        actionTaken = optIn ? 'persisted_opt_in' : 'persisted_opt_out';
      } else if (state === 'phone_mismatch' && user) {
        // REQ-111 — reply directly to the inbound sender, not via
        // NotificationService: that service resolves the recipient phone
        // from the matched (old) account, which is the opposite of who
        // needs to receive this message (the person texting right now).
        // Mirrors the opt_out branch's precedent of calling WhatsAppService
        // directly for the same reason. Consent check replicated inline
        // since this bypasses NotificationService's own gating.
        const consented =
          user.preferences?.communicationPreferences?.whatsappTransactional !==
          false; // default true, same as shouldSendWhatsApp()
        if (consented) {
          try {
            const result = await sendWithRetry(from, () =>
              WhatsAppService.sendMessage(
                from,
                'account_recovery',
                accountRecoveryParams(user?.phone ?? '')
              )
            );
            actionTaken = outcomeTag('account_recovery', result);
          } catch (error) {
            console.error(
              '[WhatsAppInbound] account_recovery send failed:',
              error instanceof Error ? error.message : String(error)
            );
            actionTaken = outcomeTag('account_recovery', {
              success: false,
              errorCode: 'EXCEPTION',
            });
          }
        } else {
          actionTaken = 'noop';
        }
      } else if (intent === 'order_cancel') {
        // REQ-128 (REQ-WA-019, decision D1) — `user` was found from the sender's
        // own number (a phone mismatch is handled above), and the order list
        // comes from that user only, so a supplied order number can never reach
        // another customer's order.
        actionTaken = await this.handleCancel(from, body, userId);
      } else if (intent === 'order_status') {
        // REQ-126 (REQ-WA-018) — no order data by text: an urgent ticket for
        // staff (REQ-WA-013 SLA) plus a short acknowledgement. Answered in
        // every customer state; a service reply to a message just received.
        const ticketed = await this.openSupportTicket(
          from,
          body,
          userId,
          true,
          'order_status'
        );
        try {
          await sendWithRetry(from, () =>
            WhatsAppService.sendTextMessage(from, ORDER_STATUS_ACK_TEXT)
          );
        } catch (error) {
          console.error(
            '[WhatsAppInbound] order-status acknowledgement failed:',
            error instanceof Error ? error.message : String(error)
          );
        }
        actionTaken = ticketed ? 'order_status_ticketed' : 'queued_for_staff';
      } else if (intent === 'booking') {
        // REQ-129 (REQ-WA-020) — send the /book link. No ticket, no booking
        // is created from a text message.
        try {
          const result = await sendWithRetry(from, () =>
            WhatsAppService.sendTextMessage(from, bookingLinkReplyText())
          );
          actionTaken = outcomeTag('booking_link', result);
        } catch (error) {
          console.error(
            '[WhatsAppInbound] booking link send failed:',
            error instanceof Error ? error.message : String(error)
          );
          actionTaken = outcomeTag('booking_link', {
            success: false,
            errorCode: 'EXCEPTION',
          });
        }
      } else if (intent === 'order_start') {
        // REQ-126 (REQ-WA-017) — all orders are made in the app: send the
        // menu link. No ticket, no ordering in WhatsApp.
        try {
          const result = await sendWithRetry(from, () =>
            WhatsAppService.sendTextMessage(from, orderLinkReplyText())
          );
          actionTaken = outcomeTag('order_link', result);
        } catch (error) {
          console.error(
            '[WhatsAppInbound] order link send failed:',
            error instanceof Error ? error.message : String(error)
          );
          actionTaken = outcomeTag('order_link', {
            success: false,
            errorCode: 'EXCEPTION',
          });
        }
      } else {
        // Non-opt-out, non-phone_mismatch: route by state.
        const templateKey = INBOUND_WELCOME_TEMPLATE[state];
        if (templateKey && userId) {
          try {
            const params =
              templateKey === 'welcome_back'
                ? welcomeBackParams(user ?? {})
                : welcomeNewUserParams(
                    (await SettingsService.getSettings()).businessHours
                  );
            // REQ-118 (AC3) — "Chat with staff" always reaches a human: an
            // urgent ticket is opened (or the open one escalated) alongside
            // the welcome message.
            if (intent === 'chat_with_staff') {
              await this.openSupportTicket(from, body, userId, true);
            }
            const result = await NotificationService.send({
              userId,
              templateKey,
              whatsapp: { params: params.bodyParams },
            });
            const whatsappAttempt = result.attempts.find(
              (attempt) => attempt.channel === 'whatsapp'
            );
            actionTaken = outcomeTag(templateKey, {
              success: result.success,
              errorCode: whatsappAttempt?.errorCode ?? 'NOT_SENT',
            });
          } catch (error) {
            console.error(
              '[WhatsAppInbound] welcome template send failed:',
              error instanceof Error ? error.message : String(error)
            );
            actionTaken = outcomeTag(templateKey, {
              success: false,
              errorCode: 'EXCEPTION',
            });
          }
        } else {
          // REQ-064 — `support_text` intent (or any non-welcome path)
          // auto-creates a SupportTicket from the inbound message. Best-
          // effort: a ticket-create failure is logged but doesn't block
          // the IncomingMessage audit row. REQ-118 — it appends to the
          // customer's open ticket instead, and "Chat with staff" marks it
          // urgent.
          const ticketed = await this.openSupportTicket(
            from,
            body,
            userId,
            intent === 'chat_with_staff'
          );
          actionTaken = ticketed ? 'ticketed' : 'queued_for_staff';
        }
      }
    } catch (error) {
      console.error(
        '[WhatsAppInbound] handle outer failure:',
        error instanceof Error ? error.message : String(error)
      );
    }

    await this.finalise(messageId, state, userId, actionTaken);

    return actionTaken;
  }

  /**
   * REQ-064 / REQ-118 — thread the inbound message into the customer's support
   * ticket. Returns false (after logging) instead of throwing so a ticket
   * failure never blocks the audit row or the welcome reply.
   */
  private static async openSupportTicket(
    from: string,
    body: string | null,
    userId: string | null,
    urgent: boolean,
    kind?: 'order_status'
  ): Promise<boolean> {
    try {
      const { SupportTicketService } = await import(
        '@/services/support-ticket-service'
      );
      await SupportTicketService.createFromWhatsAppInbound({
        from,
        body: body ?? '',
        userId,
        urgent,
        kind,
      });
      return true;
    } catch (error) {
      console.error(
        '[WhatsAppInbound] support-ticket auto-create failed:',
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /** Writes the routing outcome onto the row inserted at the start of handle(). */
  /** REQ-122 — true only for a staff account's *verified* alert number. */
  static async isVerifiedStaffAlertNumber(from: string): Promise<boolean> {
    const variants = phoneLookupVariants(from);
    if (variants.length === 0) return false;
    const staff = await UserModel.exists({
      alertPhone: { $in: variants },
      alertPhoneVerified: true,
      roles: { $in: [...STAFF_ROLES] },
    });
    return Boolean(staff);
  }

  private static async finalise(
    messageId: string,
    state: IncomingCustomerState,
    userId: string | null,
    actionTaken: string
  ): Promise<void> {
    try {
      await IncomingMessageModel.updateOne(
        { messageId },
        { $set: { classifiedState: state, userId, actionTaken } }
      );
    } catch (error) {
      console.error(
        '[WhatsAppInbound] IncomingMessage update failed:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
