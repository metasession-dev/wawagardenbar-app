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
  receipt: 'transactional',
  payment_link: 'transactional',
  payment_confirmation: 'transactional',
  bank_transfer_details: 'transactional',
  support_reply: 'transactional',
  incident_summary: 'transactional',
  welcome_new_user: 'transactional',
  welcome_back: 'transactional',
  account_recovery: 'transactional',

  // ── Marketing (MARKETING per Meta; whatsappMarketing gate) ──
  reward_earned: 'marketing',
  reward_expiring_soon: 'marketing',
};
