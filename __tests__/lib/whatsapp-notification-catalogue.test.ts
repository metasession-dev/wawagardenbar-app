/**
 * @requirement REQ-125 (AC1, AC4) — notification catalogue completeness.
 *
 * Every template in TEMPLATE_CATEGORIES must be switchable (in the catalogue,
 * with purpose / why / if-off text) or locked on. A new template that is in
 * neither fails this test, so no message can ship without its label.
 */
import { describe, it, expect } from 'vitest';
import { TEMPLATE_CATEGORIES } from '@/lib/notification-templates';
import {
  LOCKED_WHATSAPP_TEMPLATES,
  WHATSAPP_NOTIFICATION_CATALOGUE,
  catalogueEntryForTemplate,
  catalogueKeys,
  isLockedTemplate,
} from '@/lib/whatsapp-notification-catalogue';

describe('WhatsApp notification catalogue', () => {
  it('lists every template as switchable or locked', () => {
    const missing = Object.keys(TEMPLATE_CATEGORIES).filter(
      (name) => !catalogueEntryForTemplate(name) && !isLockedTemplate(name)
    );
    expect(missing).toEqual([]);
  });

  it('gives every entry non-empty purpose, why and ifOff text', () => {
    for (const e of WHATSAPP_NOTIFICATION_CATALOGUE) {
      expect(e.label.trim().length, e.key).toBeGreaterThan(0);
      expect(e.purpose.trim().length, e.key).toBeGreaterThan(0);
      expect(e.why.trim().length, e.key).toBeGreaterThan(0);
      expect(e.ifOff.trim().length, e.key).toBeGreaterThan(0);
    }
  });

  it('has unique keys and no template controlled by two switches', () => {
    expect(new Set(catalogueKeys()).size).toBe(catalogueKeys().length);
    const seen = new Set<string>();
    for (const e of WHATSAPP_NOTIFICATION_CATALOGUE) {
      for (const t of e.templates) {
        expect(seen.has(t), t).toBe(false);
        seen.add(t);
      }
    }
  });

  it('never lists a locked template as switchable', () => {
    for (const name of Object.keys(LOCKED_WHATSAPP_TEMPLATES)) {
      expect(catalogueEntryForTemplate(name)).toBeNull();
    }
  });

  it('locks the sign-in PIN', () => {
    expect(isLockedTemplate('verification_pin')).toBe(true);
  });

  it('marks staff alerts, payment reminders and status updates high-impact', () => {
    const high = WHATSAPP_NOTIFICATION_CATALOGUE.filter(
      (e) => e.highImpact
    ).map((e) => e.key);
    expect(high).toEqual(
      expect.arrayContaining([
        'staff_alert',
        'payment_reminder',
        'order_status',
      ])
    );
  });
});
