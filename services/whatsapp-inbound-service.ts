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
 * STOP compliance: opt_out always sets both `whatsappTransactional` and
 * `whatsappMarketing` to false on the user doc, regardless of state.
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
import { SettingsService } from '@/services/settings-service';
import {
  accountRecoveryParams,
  welcomeBackParams,
  welcomeNewUserParams,
} from '@/lib/whatsapp-template-params';

const DORMANT_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

const STOP_REGEX = /^\s*(stop|unsubscribe|opt[-\s]?out)\s*$/i;
const CHAT_WITH_STAFF_LABEL = '💬 Chat with Staff';
const CHAT_WITH_STAFF_ID = 'chat_with_staff';

// REQ-111 — account-recovery detection. EMAIL_REGEX is a permissive
// first-match scan (not full RFC 5322 validation — we only need "does the
// body contain something that looks like an email" to try a DB lookup).
// ORDER_NUMBER_REGEX matches OrderService.generateOrderNumber()'s format:
// 'WG' + 6-digit dateKey + 4-digit sequence = 'WG' + 10 digits.
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const ORDER_NUMBER_REGEX = /\bWG\d{10}\b/;

const OPT_OUT_CONFIRMATION_TEXT =
  "You've been unsubscribed from WhatsApp messages. " +
  'Order updates will go via email/SMS. Reply START to resubscribe.';

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

    if (message.type === 'interactive') {
      const reply = message.interactive?.button_reply;
      if (reply?.id === CHAT_WITH_STAFF_ID) return 'chat_with_staff';
      if (reply?.title === CHAT_WITH_STAFF_LABEL) return 'chat_with_staff';
    }
    if (body === CHAT_WITH_STAFF_LABEL) return 'chat_with_staff';

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
      if (intent === 'opt_out') {
        if (user?._id) {
          try {
            await UserModel.updateOne(
              { _id: user._id },
              {
                $set: {
                  'preferences.communicationPreferences.whatsappTransactional': false,
                  'preferences.communicationPreferences.whatsappMarketing': false,
                },
              }
            );
          } catch (error) {
            console.error(
              '[WhatsAppInbound] opt-out persistence failed:',
              error instanceof Error ? error.message : String(error)
            );
          }
        }
        try {
          await WhatsAppService.sendTextMessage(
            from,
            OPT_OUT_CONFIRMATION_TEXT
          );
        } catch (error) {
          console.error(
            '[WhatsAppInbound] opt-out confirmation send failed:',
            error instanceof Error ? error.message : String(error)
          );
        }
        actionTaken = 'persisted_opt_out';
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
            const result = await WhatsAppService.sendMessage(
              from,
              'account_recovery',
              accountRecoveryParams(user.phone ?? '')
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
          // the IncomingMessage audit row.
          try {
            const { SupportTicketService } = await import(
              '@/services/support-ticket-service'
            );
            await SupportTicketService.createFromWhatsAppInbound({
              from,
              body: body ?? '',
              userId,
            });
            actionTaken = 'ticketed';
          } catch (error) {
            console.error(
              '[WhatsAppInbound] support-ticket auto-create failed:',
              error instanceof Error ? error.message : String(error)
            );
            actionTaken = 'queued_for_staff';
          }
        }
      }
    } catch (error) {
      console.error(
        '[WhatsAppInbound] handle outer failure:',
        error instanceof Error ? error.message : String(error)
      );
    }

    try {
      await IncomingMessageModel.create({
        from,
        body,
        messageType,
        messageId,
        classifiedState: state,
        classifiedIntent: intent,
        actionTaken,
        userId,
      });
    } catch (error) {
      console.error(
        '[WhatsAppInbound] IncomingMessage persistence failed:',
        error instanceof Error ? error.message : String(error)
      );
    }

    return actionTaken;
  }
}
