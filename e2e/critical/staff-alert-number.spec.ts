/**
 * @requirement REQ-122 - Staff alert number with WhatsApp PIN verification and consent (AC4)
 * @srs REQ-AUTHA-008
 *
 * A staff member saves a WhatsApp number on their own account page, receives a
 * code, and the number counts only once the code is entered (which also records
 * consent). With `ENABLE_E2E_PIN_INTERCEPT` the code is kept for the test and
 * nothing is sent to Meta (the same intercept the customer sign-in uses).
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { withMongo } from '../helpers/db-assertions';
import {
  cleanupSeededCustomer,
  seedVerifiedCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  createStaff,
  deleteStaff,
  loginAsStaff,
  type ThrowawayStaff,
} from '../helpers/staff-roles';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';

test.describe.configure({ timeout: 90_000 });

const staff: ThrowawayStaff[] = [];
const customers: SeededCustomerForSession[] = [];

test.afterAll(async () => {
  await deleteStaff(...staff.map((s) => s.id));
  for (const customer of customers) await cleanupSeededCustomer(customer);
});

/** A number nobody else uses, in a form people type (leading 0). */
function uniqueLocalNumber(): { typed: string; stored: string } {
  // 0803 + 7 digits: an 11-digit Nigerian mobile number.
  const body = String(Date.now()).slice(-7);
  return { typed: `0803${body}`, stored: `+234803${body}` };
}

async function userDoc(id: string) {
  return withMongo(async (db) =>
    db.collection('users').findOne({ _id: new ObjectId(id) })
  );
}

async function openAccount(browser: Browser, roles: ThrowawayStaff['roles']) {
  const member = await createStaff('alertno', roles);
  staff.push(member);
  const session = await loginAsStaff(browser, member);
  await session.page.goto('/dashboard/account');
  await expect(
    session.page.getByRole('heading', { name: 'My account' })
  ).toBeVisible({ timeout: 20000 });
  return { member, ...session };
}

const card = (page: Page) => page.getByTestId('alert-number-card');
const status = (page: Page) => page.getByTestId('alert-number-status');

test.describe('[REQ-122] staff alert number', () => {
  test('[REQ-122][AC4] [US-B5.5] a number is saved unverified, a wrong code does not verify it, and the right code verifies it and records consent', async ({
    browser,
  }) => {
    tagTest('REQ-122', 4);
    const { member, context, page } = await openAccount(browser, ['csr']);
    const { typed, stored } = uniqueLocalNumber();
    try {
      // Save: the number is normalised and starts unverified.
      await card(page).getByLabel('Your WhatsApp number').fill(typed);
      await card(page).getByRole('button', { name: 'Save number' }).click();
      await expect(page.getByTestId('alert-number-value')).toHaveText(stored);
      await expect(status(page)).toHaveText('Not verified');
      let doc = await userDoc(member.id);
      expect(doc?.alertPhone).toBe(stored);
      expect(doc?.alertPhoneVerified).toBe(false);
      await evidenceShot(page, 'REQ-122', 4, 'alert-number-saved-unverified');

      // A WhatsApp code is requested (kept for the test, not sent to Meta).
      await card(page)
        .getByRole('button', { name: 'Send me a code on WhatsApp' })
        .click();
      await expect
        .poll(async () => (await userDoc(member.id))?.alertPin)
        .toMatch(/^\d{6}$/);
      doc = await userDoc(member.id);
      const pin = String(doc?.alertPin);
      // Only a keyed hash is stored for production use; never the code itself.
      expect(doc?.alertPinHash).toMatch(/^[0-9a-f]{64}$/);
      expect(doc?.alertPinHash).not.toContain(pin);

      // A wrong code does not verify.
      const wrong = pin === '000000' ? '111111' : '000000';
      await card(page).getByLabel('6-digit code').fill(wrong);
      await card(page).getByRole('button', { name: 'Verify' }).click();
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: /not right/i })
          .first()
      ).toBeVisible();
      await expect(status(page)).toHaveText('Not verified');
      expect((await userDoc(member.id))?.alertPhoneVerified).toBe(false);

      // The right code verifies it and records consent.
      await card(page).getByLabel('6-digit code').fill(pin);
      await card(page).getByRole('button', { name: 'Verify' }).click();
      await expect(status(page)).toHaveText('Verified');
      doc = await userDoc(member.id);
      expect(doc?.alertPhoneVerified).toBe(true);
      expect(doc?.alertConsentAt).toBeInstanceOf(Date);
      expect(doc?.alertsEnabled).toBe(true);
      expect(doc?.alertPin).toBeUndefined();
      expect(doc?.alertPinHash).toBeUndefined();
      await evidenceShot(page, 'REQ-122', 4, 'alert-number-verified');

      // The switch to stop alerts appears once verified.
      await expect(page.getByLabel('Receive WhatsApp alerts')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('[REQ-122][AC4] a kitchen-only member can open the account page and save a number', async ({
    browser,
  }) => {
    tagTest('REQ-122', 4);
    const { member, context, page } = await openAccount(browser, ['kitchen']);
    const { typed, stored } = uniqueLocalNumber();
    try {
      await expect(card(page)).toBeVisible();
      await card(page).getByLabel('Your WhatsApp number').fill(typed);
      await card(page).getByRole('button', { name: 'Save number' }).click();
      await expect(page.getByTestId('alert-number-value')).toHaveText(stored);
      expect((await userDoc(member.id))?.alertPhone).toBe(stored);
    } finally {
      await context.close();
    }
  });

  test('[REQ-122][AC4] a number that belongs to a customer account is refused', async ({
    browser,
  }) => {
    tagTest('REQ-122', 4);
    const customer = await seedVerifiedCustomer();
    customers.push(customer);
    const { member, context, page } = await openAccount(browser, ['csr']);
    try {
      await card(page).getByLabel('Your WhatsApp number').fill(customer.phone);
      await card(page).getByRole('button', { name: 'Save number' }).click();
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: /belongs to a customer account/i })
          .first()
      ).toBeVisible();
      await expect(page.getByTestId('alert-number-value')).toHaveCount(0);
      expect((await userDoc(member.id))?.alertPhone).toBeUndefined();
      await evidenceShot(page, 'REQ-122', 4, 'customer-number-refused');
    } finally {
      await context.close();
    }
  });

  test('[REQ-122][AC4] removing the number clears it, the verification and the on-shift flag', async ({
    browser,
  }) => {
    tagTest('REQ-122', 4);
    const { member, context, page } = await openAccount(browser, ['csr']);
    const { typed } = uniqueLocalNumber();
    try {
      await card(page).getByLabel('Your WhatsApp number').fill(typed);
      await card(page).getByRole('button', { name: 'Save number' }).click();
      await expect(page.getByTestId('alert-number-value')).toBeVisible();
      await card(page).getByRole('button', { name: 'Remove' }).click();
      await expect(page.getByTestId('alert-number-value')).toHaveCount(0);
      const doc = await userDoc(member.id);
      expect(doc?.alertPhone).toBeUndefined();
      expect(doc?.alertPhoneVerified).toBe(false);
      expect(doc?.onShift).toBe(false);
    } finally {
      await context.close();
    }
  });
});

test.describe('[REQ-122] an admin sets a staff number', () => {
  superAdminTest.describe.configure({ timeout: 90_000 });

  superAdminTest(
    '[REQ-122][AC4] a super-admin saves a staff number (unverified) from the admin actions menu',
    async ({ page }, testInfo) => {
      tagTest('REQ-122', 4);
      if (!(await isAuthenticated(page))) {
        if (process.env.CI) throw new Error('Expected a super-admin session');
        testInfo.skip(true, 'super-admin auth missing (local only)');
      }
      const member = await createStaff('alertadm', ['csr']);
      staff.push(member);
      const { typed, stored } = uniqueLocalNumber();

      await page.goto('/dashboard/settings/admins');
      await page.getByPlaceholder(/Search by username/i).fill(member.username);
      const row = page.getByRole('row').filter({ hasText: member.username });
      await expect(row).toBeVisible({ timeout: 20000 });
      await row.getByRole('button').last().click();
      await page
        .getByRole('menuitem', { name: 'WhatsApp Alert Number' })
        .click();
      await page.getByLabel('WhatsApp number').fill(typed);
      await page.getByRole('button', { name: 'Save', exact: true }).click();

      await expect
        .poll(async () => (await userDoc(member.id))?.alertPhone)
        .toBe(stored);
      // Saved by an admin: still unverified until the member confirms it.
      expect((await userDoc(member.id))?.alertPhoneVerified).toBe(false);
      await evidenceShot(page, 'REQ-122', 4, 'admin-sets-staff-number');
    }
  );
});
