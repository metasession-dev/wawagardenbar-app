/**
 * @requirement REQ-054 — `NotificationService.send()` channel-fallback wrapper
 *
 * Single source of truth mapping each WhatsApp template name to a
 * notification category. The orchestrator
 * (`services/notification-service.ts`) reads this to decide which
 * consent flag gates the WhatsApp attempt for each send.
 *
 * Categories per Meta WhatsApp Business Policy:
 *   - `transactional`  — UTILITY templates (order updates, receipts,
 *                        support replies, signup welcomes). Requires
 *                        `whatsappTransactional` opt-in (default true,
 *                        captured at first PIN verification per REQ-053).
 *   - `marketing`      — MARKETING templates (offers, rewards, expiry
 *                        nudges). Requires `whatsappMarketing` opt-in
 *                        (default false, explicit opt-in required).
 *   - `authentication` — OTP-style templates. Meta exempts AUTHENTICATION
 *                        templates from consent — the orchestrator skips
 *                        the consent check entirely.
 *
 * Keep this map in sync with `docs/whatsapp-templates.md`. When a new
 * template is added, add it here AND in the doc. The
 * `notification-templates.test.ts` covers-every-template test will fail
 * loudly if either gets out of sync.
 */

export type NotificationCategory =
  | 'transactional'
  | 'marketing'
  | 'authentication';

export const TEMPLATE_CATEGORIES: Record<string, NotificationCategory> = {
  // ── Authentication (no consent check; OTP exempt) ──
  verification_pin: 'authentication',

  // ── Transactional (UTILITY per Meta; whatsappTransactional gate) ──
  order_confirmation: 'transactional',
  order_status_update: 'transactional',
  // REQ-124 — customer status message with a signed Track order button.
  order_status_update_v2: 'transactional',
  receipt: 'transactional',
  payment_link: 'transactional',
  payment_confirmation: 'transactional',
  bank_transfer_details: 'transactional',
  support_reply: 'transactional',
  incident_summary: 'transactional',
  welcome_new_user: 'transactional',
  welcome_back: 'transactional',
  account_recovery: 'transactional',
  // REQ-122 — internal staff alert (ADR-011). Sent only to staff with a verified
  // alert number, through WhatsAppService directly (staff-own consent, not the
  // customer consent gate).
  staff_alert: 'transactional',

  // ── Marketing (MARKETING per Meta; whatsappMarketing gate) ──
  reward_earned: 'marketing',
  reward_expiring_soon: 'marketing',
};

/**
 * REQ-123 (AC8) — templates that are submitted to Meta per environment and
 * switched on only once that environment's copy is APPROVED. While a copy is
 * not approved Meta answers TEMPLATE_NOT_FOUND; `NotificationService.send`
 * records that as `held_template_pending` (not a delivery failure) so staff can
 * tell "waiting for Meta" from "broken".
 */
export const HELD_UNTIL_APPROVED_TEMPLATES: ReadonlySet<string> = new Set([
  'order_confirmation',
  'receipt',
  'payment_link',
  'order_status_update_v2',
]);

export const HELD_TEMPLATE_PENDING = 'held_template_pending';
