/**
 * @requirement REQ-054 — `NotificationService.send()` channel-fallback wrapper
 *
 * Lookup table for template → category. The orchestrator reads this to
 * decide which consent flag gates each channel attempt:
 *   - transactional   → whatsappTransactional (default true)
 *   - marketing       → whatsappMarketing     (default false)
 *   - authentication  → OTP exempt; always allowed
 *
 * Keeping the map in its own module instead of inside the service file
 * makes it easy to audit alongside `docs/whatsapp-templates.md` and
 * easy to test in isolation.
 */
import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_CATEGORIES,
  type NotificationCategory,
} from '@/lib/notification-templates';

describe('REQ-054 TEMPLATE_CATEGORIES', () => {
  it('AC2 — every value is a valid NotificationCategory', () => {
    const valid: NotificationCategory[] = [
      'transactional',
      'marketing',
      'authentication',
    ];
    for (const category of Object.values(TEMPLATE_CATEGORIES)) {
      expect(valid).toContain(category as NotificationCategory);
    }
  });

  it('AC2 — covers every template named in docs/whatsapp-templates.md', () => {
    // 13 active templates (12 to-submit + 1 already approved).
    const required = [
      'verification_pin',
      'order_confirmation',
      'order_status_update',
      'receipt',
      'payment_link',
      'payment_confirmation',
      'bank_transfer_details',
      'support_reply',
      'welcome_new_user',
      'welcome_back',
      'account_recovery',
      'reward_earned',
      'reward_expiring_soon',
    ];
    for (const key of required) {
      expect(TEMPLATE_CATEGORIES).toHaveProperty(key);
    }
  });

  it('AC2 — verification_pin is authentication (OTP exemption)', () => {
    expect(TEMPLATE_CATEGORIES.verification_pin).toBe('authentication');
  });

  it('AC2 — order_confirmation is transactional (UTILITY per Meta)', () => {
    expect(TEMPLATE_CATEGORIES.order_confirmation).toBe('transactional');
  });

  it('AC2 — reward_earned is marketing (MARKETING per Meta)', () => {
    expect(TEMPLATE_CATEGORIES.reward_earned).toBe('marketing');
  });

  it('AC2 — reward_expiring_soon is marketing', () => {
    expect(TEMPLATE_CATEGORIES.reward_expiring_soon).toBe('marketing');
  });
});
