/**
 * @requirement REQ-119 — Multiple roles per staff account (WA-03, ADR-009)
 *
 * A staff member holds one or more of csr, kitchen, manager, admin,
 * super-admin; access is the union of the roles. These specs prove it
 * through the real admin login and the real dashboard:
 *
 *   US-03.1  csr + kitchen sees both roles' navigation and can advance an order
 *   US-03.2  super-admin sees all five role checkboxes enabled; an admin cannot
 *            reach role management at all (the page is super-admin only)
 *   US-03.4  a role change writes exactly one audit row (actor, before, after)
 *   US-03.5b a customer session never reaches staff pages or APIs
 *   US-03.6  a kitchen-only member has orders and the kitchen display only
 *   US-03.7  a manager has csr access plus reports, and no admin-only areas
 *   US-03.8  a removed role is gone at the member's next sign-in
 *   US-03.9  saving with no role ticked is blocked
 *
 * The disabled admin/super-admin checkboxes for a non-super-admin actor
 * (US-03.2u), the service rules including an admin acting on a super-admin
 * holder, self-edit and the last super-admin (US-03.11, US-03.16) and the
 * migration (US-03.3) are unit-tested. Existing single-role specs (csr-order-tab-parity-req109,
 * main-category-report-access-control, kitchen/permission-gating) are the
 * US-03.12 regression proof and run unchanged in this tier.
 *
 * Every staff account here is throwaway (see helpers/staff-roles.ts); the
 * shared seeded accounts are only used as the acting super-admin / admin.
 *
 * Tier: critical — HIGH risk, RBAC surface.
 */
import path from 'path';
import { test, expect, type Page } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { withMongo } from '../helpers/db-assertions';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import {
  attachCustomerSessionToContext,
  cleanupSeededCustomer,
  seedVerifiedCustomer,
} from '../helpers/customer-auth';
import {
  createStaff,
  deleteStaff,
  isRefused,
  loginAsStaff,
  readRoleAuditRows,
  readStaff,
  visibleNavLinks,
  type ThrowawayStaff,
} from '../helpers/staff-roles';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');
const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const superAdminTest = test.extend<{ storageState: string }>({
  storageState: SUPER_ADMIN_FILE,
});
const adminTest = test.extend<{ storageState: string }>({
  storageState: ADMIN_FILE,
});

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/settings/admins');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard/settings/admins');
  } catch {
    return false;
  }
}

/** Order fixture (own copy, per this suite's convention). */
async function seedOrder(
  status: string,
  paymentStatus: string
): Promise<{ orderId: string; orderNumber: string }> {
  const orderNumber = `WGE2E119${Date.now()}`.slice(0, 14);
  const total = 2500;
  const now = new Date();
  return withMongo(async (db) => {
    const result = await db.collection('orders').insertOne({
      orderNumber,
      orderType: 'pickup',
      status,
      paymentStatus,
      ...(paymentStatus === 'paid'
        ? {
            paymentMethod: 'cash',
            paymentReference: `E2E-CASH-${Date.now()}`,
            paidAt: now,
          }
        : {}),
      items: [
        {
          menuItemId: new ObjectId(),
          name: 'E2E REQ-119 Test Item',
          quantity: 1,
          price: total,
          portionSize: 'full',
          portionMultiplier: 1,
          subtotal: total,
          costPerUnit: 0,
          totalCost: 0,
          grossProfit: total,
          profitMargin: 100,
          customizations: [],
        },
      ],
      subtotal: total,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      statusHistory: [{ status, timestamp: now, note: 'E2E REQ-119 setup' }],
      kitchenPriority: 'normal',
      guestName: 'E2E REQ-119',
      guestEmail: 'e2e-req119@test.com',
      createdAt: now,
      updatedAt: now,
    });
    return { orderId: String(result.insertedId), orderNumber };
  });
}

async function readOrderStatus(orderId: string): Promise<string | null> {
  return withMongo(async (db) => {
    const order = await db
      .collection('orders')
      .findOne({ _id: new ObjectId(orderId) }, { projection: { status: 1 } });
    return (order?.status as string) ?? null;
  });
}

async function deleteOrder(orderId: string): Promise<void> {
  await withMongo((db) =>
    db.collection('orders').deleteOne({ _id: new ObjectId(orderId) })
  );
}

async function dismissCookieBanner(page: Page) {
  const banner = page.getByTestId('cookie-consent-banner');
  if (await banner.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /got it/i }).click();
    await expect(banner).toHaveCount(0);
  }
}

/** Click "Start Preparing" on the seeded order's kitchen-display card. */
async function startPreparingOnKitchenDisplay(
  page: Page,
  orderNumber: string
): Promise<void> {
  await page.goto('/dashboard/kitchen-display');
  await page.waitForLoadState('networkidle');
  await dismissCookieBanner(page);
  const heading = page.getByRole('heading', { name: orderNumber, level: 2 });
  await expect(heading).toBeVisible({ timeout: 15000 });
  const card = heading.locator(
    'xpath=ancestor::div[contains(@class, "border-2")][1]'
  );
  const button = card.getByRole('button', { name: /Start Preparing/i });
  await expect(button).toBeEnabled({ timeout: 15000 });
  await button.click();
}

/** Open Edit Roles for a staff member on Settings → Admins. */
async function openEditRoles(page: Page, username: string) {
  await page.goto('/dashboard/settings/admins');
  await page.waitForLoadState('networkidle');
  await dismissCookieBanner(page);
  const row = page.getByRole('row', { name: new RegExp(username) });
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: /Edit Roles/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

const ROLE_LABELS = {
  csr: 'Customer Service Rep',
  kitchen: 'Kitchen',
  manager: 'Manager',
  admin: 'Admin',
  'super-admin': 'Super Admin',
} as const;

test.describe('[REQ-119] multiple roles per staff account', () => {
  const staffToDelete: string[] = [];
  const ordersToDelete: string[] = [];

  async function newStaff(
    prefix: string,
    roles: ThrowawayStaff['roles']
  ): Promise<ThrowawayStaff> {
    const staff = await createStaff(prefix, roles);
    staffToDelete.push(staff.id);
    return staff;
  }

  async function newOrder(status: string, paymentStatus: string) {
    const order = await seedOrder(status, paymentStatus);
    ordersToDelete.push(order.orderId);
    return order;
  }

  test.afterEach(async () => {
    await deleteStaff(...staffToDelete.splice(0));
    for (const id of ordersToDelete.splice(0)) {
      await deleteOrder(id).catch(() => {});
    }
  });

  test('[REQ-119][AC1][AC2][AC8] [US-03.1] csr + kitchen sees both roles’ navigation and can advance an order', async ({
    browser,
  }) => {
    tagTest('REQ-119', [1, 2, 8]);
    const staff = await newStaff('csr-kitchen', ['csr', 'kitchen']);
    const order = await newOrder('confirmed', 'paid');

    const { context, page } = await loginAsStaff(browser, staff);
    try {
      const nav = await visibleNavLinks(page);
      for (const name of [
        'Orders',
        'Kitchen display',
        'Customers',
        'Rewards',
        'Incidents',
      ]) {
        expect(nav, `nav should show ${name}`).toContain(name);
      }
      for (const name of ['Menu', 'Inventory', 'Settings', 'Audit Logs']) {
        expect(nav, `nav should not show ${name}`).not.toContain(name);
      }
      await evidenceShot(page, 'REQ-119', 1, 'csr-kitchen-navigation');

      await startPreparingOnKitchenDisplay(page, order.orderNumber);
      await expect
        .poll(() => readOrderStatus(order.orderId), { timeout: 20000 })
        .toBe('preparing');
      await evidenceShot(page, 'REQ-119', 2, 'csr-kitchen-advanced-order');
    } finally {
      await context.close();
    }
  });

  superAdminTest.describe('role management (super-admin)', () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'super-admin login failed — skipping');
      }
    });

    superAdminTest(
      '[REQ-119][AC3] [US-03.2] a super-admin sees all five role checkboxes enabled in Edit Roles',
      async ({ page }) => {
        tagTest('REQ-119', 3);
        const staff = await newStaff('edit-open', ['csr']);

        const dialog = await openEditRoles(page, staff.username);
        for (const label of Object.values(ROLE_LABELS)) {
          await expect(
            dialog.getByRole('checkbox', { name: label, exact: true })
          ).toBeEnabled();
        }
        await expect(
          dialog.getByRole('checkbox', { name: ROLE_LABELS.csr, exact: true })
        ).toBeChecked();
        await evidenceShot(page, 'REQ-119', 3, 'edit-roles-all-enabled');
      }
    );

    superAdminTest(
      '[REQ-119][AC3][AC5] [US-03.4] a role change writes exactly one audit row with actor, before and after',
      async ({ page }) => {
        tagTest('REQ-119', [3, 5]);
        const staff = await newStaff('audit', ['csr']);

        const dialog = await openEditRoles(page, staff.username);
        await dialog
          .getByRole('checkbox', { name: ROLE_LABELS.kitchen, exact: true })
          .click();
        await evidenceShot(page, 'REQ-119', 5, 'edit-roles-add-kitchen');
        await dialog.getByRole('button', { name: /Save roles/i }).click();

        await expect
          .poll(async () => (await readStaff(staff.id))?.roles, {
            timeout: 15000,
          })
          .toEqual(['csr', 'kitchen']);
        const user = await readStaff(staff.id);
        expect(user?.role).toBe('csr'); // back-compat role = highest

        const rows = await readRoleAuditRows(staff.id);
        expect(rows).toHaveLength(1);
        expect(rows[0].details).toMatchObject({
          before: ['csr'],
          after: ['csr', 'kitchen'],
          added: ['kitchen'],
          removed: [],
        });
        // The actor is the signed-in super-admin, not the edited member.
        expect(String(rows[0].userId)).not.toBe(staff.id);
        expect(rows[0].userRole).toBe('super-admin');
      }
    );

    superAdminTest(
      '[REQ-119][AC3] [US-03.9] saving with no role ticked is blocked',
      async ({ page }) => {
        tagTest('REQ-119', 3);
        const staff = await newStaff('no-role', ['csr']);

        const dialog = await openEditRoles(page, staff.username);
        await dialog
          .getByRole('checkbox', { name: ROLE_LABELS.csr, exact: true })
          .click();
        await dialog.getByRole('button', { name: /Save roles/i }).click();

        await expect(dialog.getByText(/at least one role/i)).toBeVisible();
        expect((await readStaff(staff.id))?.roles).toEqual(['csr']);
        expect(await readRoleAuditRows(staff.id)).toHaveLength(0);
      }
    );

    superAdminTest(
      '[REQ-119][AC3] [US-03.8] a removed role is gone at the member’s next sign-in',
      async ({ page, browser }) => {
        tagTest('REQ-119', 3);
        const staff = await newStaff('remove', ['csr', 'kitchen']);

        const dialog = await openEditRoles(page, staff.username);
        await dialog
          .getByRole('checkbox', { name: ROLE_LABELS.kitchen, exact: true })
          .click();
        await dialog.getByRole('button', { name: /Save roles/i }).click();
        await expect
          .poll(async () => (await readStaff(staff.id))?.roles, {
            timeout: 15000,
          })
          .toEqual(['csr']);

        // Next sign-in: Kitchen-only access is gone, csr access stays.
        const { context, page: memberPage } = await loginAsStaff(
          browser,
          staff
        );
        try {
          const nav = await visibleNavLinks(memberPage);
          expect(nav).toContain('Customers');
          // The kitchen display is still listed because csr also holds it;
          // what is gone is the kitchen role itself.
          const user = await readStaff(staff.id);
          expect(user?.roles).toEqual(['csr']);
          expect(user?.permissions?.incidentsAccess).toBe(true);
        } finally {
          await context.close();
        }
      }
    );
  });

  adminTest(
    '[REQ-119][AC3] [US-03.2] an admin who is not a super-admin cannot reach role management',
    async ({ page }, testInfo) => {
      tagTest('REQ-119', 3);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      if (!page.url().includes('/dashboard')) {
        testInfo.skip(true, 'admin login failed — skipping');
      }
      expect(await isRefused(page, '/dashboard/settings/admins')).toBe(true);
      await evidenceShot(page, 'REQ-119', 3, 'admin-refused-role-management');
    }
  );

  test('[REQ-119][AC2][AC6] [US-03.5b] a customer session never reaches staff pages or APIs', async ({
    browser,
  }) => {
    tagTest('REQ-119', [2, 6]);
    const customer = await seedVerifiedCustomer();
    const context = await browser.newContext();
    try {
      await attachCustomerSessionToContext(context, customer, BASE_URL);
      const page = await context.newPage();

      for (const target of [
        '/dashboard/orders',
        '/dashboard/kitchen-display',
        '/dashboard/settings/admins',
      ]) {
        expect(await isRefused(page, target), target).toBe(true);
      }
      await evidenceShot(page, 'REQ-119', 6, 'customer-refused-dashboard');

      const response = await context.request.get(
        `${BASE_URL}/api/admin/anything`
      );
      expect([401, 403]).toContain(response.status());
    } finally {
      await context.close();
      await cleanupSeededCustomer(customer);
    }
  });

  test('[REQ-119][AC2][AC8] [US-03.6] a kitchen-only member has orders and the kitchen display only', async ({
    browser,
  }) => {
    tagTest('REQ-119', [2, 8]);
    const staff = await newStaff('kitchen', ['kitchen']);
    const confirmed = await newOrder('confirmed', 'paid');
    const unpaid = await newOrder('pending', 'pending');

    const { context, page } = await loginAsStaff(browser, staff);
    try {
      // Lands on the kitchen display, not a forbidden page.
      await expect(page).toHaveURL(/\/dashboard\/kitchen-display/);

      const nav = await visibleNavLinks(page);
      expect(nav).toEqual(
        expect.arrayContaining(['Orders', 'Kitchen display'])
      );
      for (const name of [
        'Overview',
        'Menu',
        'Customers',
        'Inventory',
        'Rewards',
        'Reports',
        'Incidents',
        'Settings',
      ]) {
        expect(nav, `nav should not show ${name}`).not.toContain(name);
      }
      await evidenceShot(page, 'REQ-119', 8, 'kitchen-only-navigation');

      // Can advance an order's status.
      await startPreparingOnKitchenDisplay(page, confirmed.orderNumber);
      await expect
        .poll(() => readOrderStatus(confirmed.orderId), { timeout: 20000 })
        .toBe('preparing');

      // Refused everywhere else, including the staff-only order areas.
      for (const target of [
        '/dashboard/settings',
        '/dashboard/menu',
        '/dashboard/inventory',
        '/dashboard/customers',
        '/dashboard/rewards',
        '/dashboard/incidents',
        '/dashboard/reports/daily',
        '/dashboard/orders/express',
        '/dashboard/orders/tabs',
      ]) {
        expect(await isRefused(page, target), target).toBe(true);
      }

      // Cannot cancel an order (a csr-and-above action).
      await page.goto(`/dashboard/orders/${unpaid.orderId}`);
      await page.waitForLoadState('networkidle');
      await dismissCookieBanner(page);
      const cancel = page.getByRole('button', { name: 'Cancel Order' });
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        const dialog = page.locator('[role="dialog"]');
        await dialog
          .locator('#reason')
          .fill('E2E REQ-119: kitchen must not cancel');
        await dialog.getByRole('button', { name: 'Cancel Order' }).click();
        await page.waitForTimeout(3000);
      }
      expect(await readOrderStatus(unpaid.orderId)).toBe('pending');
    } finally {
      await context.close();
    }
  });

  test('[REQ-119][AC7][AC8] [US-03.7] a manager has csr access plus reports and no admin-only areas', async ({
    browser,
  }) => {
    tagTest('REQ-119', [7, 8]);
    const staff = await newStaff('manager', ['manager']);

    const { context, page } = await loginAsStaff(browser, staff);
    try {
      const nav = await visibleNavLinks(page);
      for (const name of [
        'Orders',
        'Kitchen display',
        'Customers',
        'Rewards',
        'Incidents',
        'Reports',
      ]) {
        expect(nav, `nav should show ${name}`).toContain(name);
      }
      for (const name of [
        'Menu',
        'Inventory',
        'Settings',
        'Expenses',
        'Audit Logs',
      ]) {
        expect(nav, `nav should not show ${name}`).not.toContain(name);
      }
      await evidenceShot(page, 'REQ-119', 7, 'manager-navigation');

      expect(await isRefused(page, '/dashboard/reports/daily')).toBe(false);
      await evidenceShot(page, 'REQ-119', 7, 'manager-daily-report');

      for (const target of [
        '/dashboard/settings',
        '/dashboard/menu',
        '/dashboard/inventory',
      ]) {
        expect(await isRefused(page, target), target).toBe(true);
      }
    } finally {
      await context.close();
    }
  });
});
