/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement SRS REQ-MENUMGT-006
 *
 * Pins the new "Main-Category Report Access" section in the
 * admin permission editor at /dashboard/settings/admins/<id>/permissions.
 *
 * What this spec pins:
 *   ✓ AC6 — section renders for non-super-admin admins with the
 *           Unrestricted checkbox + per-main checkboxes
 *   ✓ AC6 — toggling Unrestricted on → save → DB persists `undefined`
 *           (the field is absent on the user document)
 *   ✓ AC6 — untick Unrestricted + select Food + Drinks → save → DB
 *           persists ['food', 'drinks']
 *   ✓ AC6 — untick Unrestricted + clear → save → DB persists []
 *   ✓ AC6 — saved state round-trips: reload page renders the form
 *           pre-filled correctly
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import {
  cleanupAdmins,
  readAdminPermissions,
  seedAdminWithReportAccess,
  type SeededAdmin,
} from '../helpers/main-category-report-seed';
import { evidenceShot } from '../helpers/evidence';

const SUPER_ADMIN_STATE = path.resolve(
  __dirname,
  '../../.auth/super-admin.json'
);
const SEED_PREFIX = `e2e-req076-perms-${Date.now().toString(36)}`;

test.use({ storageState: SUPER_ADMIN_STATE });
test.describe.configure({ mode: 'serial' });

test.describe('REQ-076 — Admin Main-Category Report Access editor (REQ-MENUMGT-006)', () => {
  const seededIds: string[] = [];
  let admin: SeededAdmin | null = null;

  test.beforeAll(async () => {
    // Seed an admin starting at `undefined` (unrestricted) so the
    // first test exercises a save from unrestricted → specific
    admin = await seedAdminWithReportAccess(`${SEED_PREFIX}-edit`, undefined);
    seededIds.push(admin._id);
  });

  test.afterAll(async () => {
    await cleanupAdmins(seededIds);
  });

  test('AC6 — editor section renders for a non-super-admin', async ({
    page,
  }) => {
    test.skip(!admin, 'Admin seed failed');
    await page.goto(`/dashboard/settings/admins/${admin!._id}/permissions`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByTestId('main-category-report-access-editor')
    ).toBeVisible();
    await expect(page.getByTestId('unrestricted-checkbox')).toBeVisible();
    // Per-main checkboxes for the seeded registry (food + drinks at
    // minimum) — assert food is one of them.
    await expect(page.getByTestId('main-category-checkbox-food')).toBeVisible();
    await expect(
      page.getByTestId('main-category-checkbox-drinks')
    ).toBeVisible();
    await evidenceShot(page, 'REQ-076', 6, 'editor-section-renders');
  });

  test("AC6 — untick Unrestricted + select Food + Drinks → save → DB has ['food','drinks']", async ({
    page,
  }) => {
    test.skip(!admin, 'Admin seed failed');
    await page.goto(`/dashboard/settings/admins/${admin!._id}/permissions`);
    await page.waitForLoadState('networkidle');

    // Currently unrestricted (from beforeAll seed). Untick.
    const unrestricted = page.getByTestId('unrestricted-checkbox');
    await unrestricted.click();
    // Now per-main checkboxes are enabled. Tick food + drinks via the
    // Radix Checkbox's button role — simpler + more robust than the
    // testid-wrapper-then-child-button chain (which was flaky in CI).
    await page
      .getByTestId('main-category-checkbox-food')
      .locator('button[role="checkbox"]')
      .click();
    await page
      .getByTestId('main-category-checkbox-drinks')
      .locator('button[role="checkbox"]')
      .click();

    // Save
    await page.getByRole('button', { name: /save changes/i }).click();
    // Toast / notification appears (sonner). Wait a beat then verify.
    await page.waitForTimeout(1500);

    const persisted = await readAdminPermissions(admin!._id);
    expect(Array.isArray(persisted?.mainCategoryReportAccess)).toBe(true);
    const slugs = persisted?.mainCategoryReportAccess as string[];
    expect(slugs).toEqual(expect.arrayContaining(['food', 'drinks']));
    expect(slugs.length).toBe(2);
  });

  test('AC6 — untick Unrestricted + clear all → save → DB has []', async ({
    page,
  }) => {
    test.skip(!admin, 'Admin seed failed');
    await page.goto(`/dashboard/settings/admins/${admin!._id}/permissions`);
    await page.waitForLoadState('networkidle');

    // From the previous test the admin has ['food', 'drinks'].
    // Make sure Unrestricted is OFF + untick everything.
    const unrestricted = page.getByTestId('unrestricted-checkbox');
    const isUnrestrictedChecked = await unrestricted
      .getAttribute('data-state')
      .then((s) => s === 'checked')
      .catch(() => false);
    if (isUnrestrictedChecked) {
      await unrestricted.click();
    }
    // Untick food + drinks. Since they were checked from the
    // previous test, click to toggle off.
    await page
      .getByTestId('main-category-checkbox-food')
      .locator('button[role="checkbox"]')
      .click();
    await page
      .getByTestId('main-category-checkbox-drinks')
      .locator('button[role="checkbox"]')
      .click();

    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForTimeout(1500);

    const persisted = await readAdminPermissions(admin!._id);
    expect(Array.isArray(persisted?.mainCategoryReportAccess)).toBe(true);
    expect(persisted?.mainCategoryReportAccess).toEqual([]);
  });

  test('AC6 — round-trip: saved state renders pre-filled on reload', async ({
    page,
  }) => {
    test.skip(!admin, 'Admin seed failed');
    // The admin should currently have access = [] from the prev test.
    // Reload + assert the editor reflects that.
    await page.goto(`/dashboard/settings/admins/${admin!._id}/permissions`);
    await page.waitForLoadState('networkidle');

    // Unrestricted should be OFF
    const unrestricted = page.getByTestId('unrestricted-checkbox');
    const state = await unrestricted.getAttribute('data-state');
    expect(state).not.toBe('checked');

    // Now tick Unrestricted, save → DB should have `undefined`
    await unrestricted.click();
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForTimeout(1500);

    const persisted = await readAdminPermissions(admin!._id);
    // `undefined` round-trips as absent OR null depending on JSON
    // serialisation — both indicate "unrestricted"
    expect(
      persisted?.mainCategoryReportAccess === undefined ||
        persisted?.mainCategoryReportAccess === null
    ).toBe(true);
  });
});
