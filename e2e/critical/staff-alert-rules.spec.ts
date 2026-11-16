/**
 * @requirement REQ-122 - Configurable staff alert rules (AC6)
 * @srs REQ-SETTINGS-006
 *
 * Settings, "Staff alerts": an admin changes a rule and it is stored for the
 * escalation job to use (US-B5.10). The timing itself is covered by the unit
 * tests with fake timers; this proves the form saves what the job reads.
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { withMongo } from '../helpers/db-assertions';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';

const KEY = 'staff-alert-rules';

async function storedRule(type: string) {
  const doc = await withMongo(async (db) =>
    db.collection('systemsettings').findOne({ key: KEY })
  );
  return (doc?.value as Record<string, any> | undefined)?.[type];
}

test.describe('[REQ-122] staff alert rules', () => {
  test.describe.configure({ timeout: 120_000 });
  let original: unknown;

  test.beforeAll(async () => {
    original = await withMongo(async (db) =>
      db.collection('systemsettings').findOne({ key: KEY })
    );
  });

  test.afterAll(async () => {
    await withMongo(async (db) => {
      const col = db.collection('systemsettings');
      if (original) await col.replaceOne({ key: KEY }, original as any);
      else await col.deleteOne({ key: KEY });
    });
  });

  superAdminTest(
    '[REQ-122][AC6] [US-B5.10] an admin changes the booking WhatsApp delay to 15 minutes and it is stored, the rest keeping its defaults',
    async ({ page }, testInfo) => {
      tagTest('REQ-122', 6);
      if (!(await isAuthenticated(page))) {
        if (process.env.CI) throw new Error('Expected a super-admin session');
        testInfo.skip(true, 'super-admin auth missing (local only)');
      }
      await page.goto('/dashboard/settings');
      const form = page.getByTestId('staff-alert-rules');
      await expect(form).toBeVisible({ timeout: 30000 });
      const booking = form.getByRole('region', { name: 'New booking request' });

      // The defaults from the issue are shown.
      await expect(booking.getByLabel('WhatsApp after (minutes)')).toHaveValue(
        '10'
      );
      await expect(booking.getByLabel('Escalate after (minutes)')).toHaveValue(
        '30'
      );
      await evidenceShot(page, 'REQ-122', 6, 'staff-alert-rules-defaults');

      // Change one rule and save.
      await booking.getByLabel('WhatsApp after (minutes)').fill('15');
      await form
        .getByRole('button', { name: 'Save staff alert rules' })
        .click();
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: 'Staff alert rules saved' })
          .first()
      ).toBeVisible();

      // Stored for the escalation job; the other fields keep their defaults.
      await expect
        .poll(async () => (await storedRule('booking'))?.whatsappAfterMinutes)
        .toBe(15);
      const rule = await storedRule('booking');
      expect(rule.escalateAfterMinutes).toBe(30);
      expect(rule.whatsappRoles).toEqual(['csr']);
      expect(rule.escalateRoles).toEqual(['admin']);
      const order = await storedRule('order');
      expect(order.whatsappAfterMinutes).toBe(5);

      // It is still there after a reload.
      await page.reload();
      await expect(
        page
          .getByTestId('staff-alert-rules')
          .getByRole('region', { name: 'New booking request' })
          .getByLabel('WhatsApp after (minutes)')
      ).toHaveValue('15');
      await evidenceShot(page, 'REQ-122', 6, 'staff-alert-rules-saved');
    }
  );
});
