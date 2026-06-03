/**
 * @requirement REQ-054 — `NotificationService.send()` channel-fallback wrapper
 *
 * Single entry point for outbound customer-facing notifications. Wraps
 * WhatsApp + email + SMS in a consent-gated, first-success-wins
 * orchestrator. Replaces direct-channel calls (today's prod state) and
 * unblocks #117 P0 #5 (communication preferences enforced on outbound).
 *
 * Channel order: **WhatsApp → email → SMS**. First success returns.
 *
 * Consent gating per template category:
 *   - `transactional`  → `user.preferences.communicationPreferences.whatsappTransactional`
 *   - `marketing`      → `user.preferences.communicationPreferences.whatsappMarketing`
 *   - `authentication` → no consent check (Meta OTP exemption)
 *
 * Email + SMS gated by their single booleans
 * (`communicationPreferences.email`, `.sms`) — no marketing /
 * transactional split for those channels in v1; can tighten later.
 *
 * Caller passes per-channel payloads:
 *   - `whatsapp: { params }`            — string[] for the template variables
 *   - `email:  () => Promise<void>`     — closure; caller owns content shape
 *   - `sms:    () => Promise<{ success: boolean; ... }>`
 *
 * Omitting a channel's payload skips that channel without a consent check
 * (closure-presence is the gate).
 *
 * Backwards-compatibility: when `ENABLE_WHATSAPP_NOTIFICATIONS !== 'true'`
 * OR the Meta template hasn't been approved (`WhatsAppService.sendMessage`
 * returns `errorCode: 'TEMPLATE_NOT_FOUND'`), the WhatsApp attempt fails
 * fast and the email closure fires — same UX as today.
 *
 * v1 observability: each attempt `console.log`'d with a structured
 * `notification.attempt` event. Persistent log (`NotificationLog`
 * model + delivery-status webhook) defers to WA-5 / a future REQ.
 */
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { WhatsAppService } from '@/lib/whatsapp';
import {
  TEMPLATE_CATEGORIES,
  type NotificationCategory,
} from '@/lib/notification-templates';
import { NotificationLogService } from '@/services/notification-log-service';

export type NotificationChannel = 'whatsapp' | 'email' | 'sms';

export interface NotificationAttempt {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  durationMs?: number;
  /** REQ-055 — Meta's wamid from a successful WhatsApp send; null for
   *  email/SMS or for failed WA sends. Persisted on the audit log
   *  so delivery-status webhook callbacks can find the row later. */
  messageId?: string | null;
}

export interface NotificationResult {
  sentVia: NotificationChannel | 'none';
  success: boolean;
  attempts: NotificationAttempt[];
}

export interface SendOptions {
  /** Mongoose `_id` of the recipient. Omit only if the caller has no
   *  user (e.g. guest checkout) — the caller should then pass only the
   *  channel(s) it has direct addresses for. */
  userId: string | null | undefined;
  /** Must be a key in `TEMPLATE_CATEGORIES`. */
  templateKey: string;
  /** Override the category derived from `templateKey`. Power-caller
   *  affordance; the default is the map lookup. */
  category?: NotificationCategory;
  /** WhatsApp payload — omit to skip the channel entirely. */
  whatsapp?: { params: string[] };
  /** Email closure — caller owns content shape; throws on failure. */
  email?: () => Promise<void>;
  /** SMS closure — caller owns content; returns a result object. */
  sms?: () => Promise<{ success: boolean; message?: string }>;
}

interface UserPrefsLite {
  phone: string;
  preferences?: {
    communicationPreferences?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      whatsappTransactional?: boolean;
      whatsappMarketing?: boolean;
      // REQ-063 — explicit-consent split for marketing emails.
      emailMarketing?: boolean;
    };
  };
}

function shouldSendWhatsApp(
  user: UserPrefsLite | null,
  category: NotificationCategory
): boolean {
  if (category === 'authentication') return true; // OTP exempt
  if (!user) return false; // No user → no consent state to read
  const cp = user.preferences?.communicationPreferences;
  if (!cp) return true; // Schema defaults supply the fields; missing = old doc → treat as default
  if (category === 'marketing') return cp.whatsappMarketing === true;
  return cp.whatsappTransactional !== false; // default true
}

function shouldSendEmail(
  user: UserPrefsLite | null,
  category: NotificationCategory
): boolean {
  if (!user) return true; // Guest with explicit email closure → caller decided
  const cp = user.preferences?.communicationPreferences;
  if (!cp) return true;
  // REQ-063 — marketing email gated on `emailMarketing` (default false);
  // transactional + authentication fall through to the existing `email`
  // gate (default true) so order confirmations / receipts aren't silently
  // blocked when the user has only opted out of offers.
  if (category === 'marketing') return cp.emailMarketing === true;
  return cp.email !== false;
}

function shouldSendSMS(user: UserPrefsLite | null): boolean {
  if (!user) return true;
  const cp = user.preferences?.communicationPreferences;
  if (!cp) return true;
  return cp.sms === true; // default false
}

function logAttempt(
  templateKey: string,
  userId: string | null | undefined,
  attempt: NotificationAttempt
): void {
  // Structured single-line so future log-shippers can grep on event:
  console.log(
    JSON.stringify({
      event: 'notification.attempt',
      templateKey,
      userId: userId ?? null,
      channel: attempt.channel,
      success: attempt.success,
      durationMs: attempt.durationMs,
      error: attempt.error,
      messageId: attempt.messageId,
    })
  );

  // REQ-055 — additionally persist to the NotificationLog collection
  // for forensic queries + delivery-status webhook reconciliation.
  // Non-blocking: persistence failures inside recordAttempt are
  // swallowed there; we don't await defensively beyond the catch().
  void NotificationLogService.recordAttempt({
    templateKey,
    userId: userId ?? null,
    channel: attempt.channel,
    success: attempt.success,
    messageId: attempt.messageId ?? null,
    failureReason: attempt.error ?? null,
    durationMs: attempt.durationMs ?? null,
  }).catch(() => undefined);
}

export class NotificationService {
  /**
   * Send a notification to a user across channels in priority order,
   * gated by consent. See file header for full semantics.
   */
  static async send(opts: SendOptions): Promise<NotificationResult> {
    // Resolve category up front so an unknown templateKey throws BEFORE
    // any side effect (consent fetch, channel attempt).
    const category = opts.category ?? TEMPLATE_CATEGORIES[opts.templateKey];
    if (!category) {
      throw new Error(
        `NotificationService.send: unknown templateKey '${opts.templateKey}' ` +
          `— add it to lib/notification-templates.ts:TEMPLATE_CATEGORIES`
      );
    }

    // Load the user once. Guest path (no userId) skips the lookup and
    // falls back to the caller's email/SMS closures (which carry their
    // own destination addresses).
    let user: UserPrefsLite | null = null;
    if (opts.userId) {
      try {
        await connectDB();
        user = await UserModel.findById(opts.userId).lean<UserPrefsLite>();
      } catch (error) {
        // Treat lookup failure as "no user" — caller closures may still
        // succeed (e.g. an explicit guest-checkout email closure).
        console.warn(
          `NotificationService.send: user lookup failed for ${opts.userId}: ${String(error)}`
        );
        user = null;
      }
    }

    const attempts: NotificationAttempt[] = [];

    // ── 1. WhatsApp ──
    if (opts.whatsapp && shouldSendWhatsApp(user, category)) {
      const phone = user?.phone ?? '';
      if (phone) {
        const t0 = Date.now();
        const result = await WhatsAppService.sendMessage(
          phone,
          opts.templateKey,
          opts.whatsapp.params
        );
        const attempt: NotificationAttempt = {
          channel: 'whatsapp',
          success: result.success,
          error: result.success ? undefined : result.message,
          durationMs: Date.now() - t0,
          // REQ-055 — capture Meta's wamid for delivery-status reconciliation.
          messageId: result.success ? (result.messageId ?? null) : null,
        };
        attempts.push(attempt);
        logAttempt(opts.templateKey, opts.userId, attempt);
        if (result.success) {
          return { sentVia: 'whatsapp', success: true, attempts };
        }
      }
    }

    // ── 2. Email ──
    if (opts.email && shouldSendEmail(user, category)) {
      const t0 = Date.now();
      try {
        await opts.email();
        const attempt: NotificationAttempt = {
          channel: 'email',
          success: true,
          durationMs: Date.now() - t0,
        };
        attempts.push(attempt);
        logAttempt(opts.templateKey, opts.userId, attempt);
        return { sentVia: 'email', success: true, attempts };
      } catch (error) {
        const attempt: NotificationAttempt = {
          channel: 'email',
          success: false,
          error: String(error),
          durationMs: Date.now() - t0,
        };
        attempts.push(attempt);
        logAttempt(opts.templateKey, opts.userId, attempt);
      }
    }

    // ── 3. SMS ──
    if (opts.sms && shouldSendSMS(user)) {
      const t0 = Date.now();
      const result = await opts.sms();
      const attempt: NotificationAttempt = {
        channel: 'sms',
        success: result.success,
        error: result.success ? undefined : result.message,
        durationMs: Date.now() - t0,
      };
      attempts.push(attempt);
      logAttempt(opts.templateKey, opts.userId, attempt);
      if (result.success) {
        return { sentVia: 'sms', success: true, attempts };
      }
    }

    // No channel succeeded. Log a warning so operators can investigate
    // (likely candidate: all 3 channels opted out for a transactional
    // touch the user explicitly asked for, e.g. an order confirmation).
    console.warn(
      `NotificationService.send: no channel delivered for templateKey='${opts.templateKey}', userId='${opts.userId}', attempts=${attempts.length}`
    );
    return { sentVia: 'none', success: false, attempts };
  }
}
