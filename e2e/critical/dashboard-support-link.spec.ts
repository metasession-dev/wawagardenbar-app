/**
 * @requirement REQ-130 — Dashboard: a Support link in the main menu (#1087)
 * @srs REQ-DASH-007
 *
 * Throwaway staff are logged in through the real admin form (see
 * `e2e/helpers/staff-roles.ts`), so what is asserted is the menu a real
 * session renders, and the page access the server enforces.
 */
import { test, expect } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { withMongo } from '../helpers/db-assertions';
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
  visibleNavLinks,
  type ThrowawayStaff,
} from '../helpers/staff-roles';
import type { StaffRole } from '../../interfaces/user.interface';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('[REQ-130] Support link in the dashboard menu', () => {
  test.describe.configure({ timeout: 120_000 });
  const staff: ThrowawayStaff[] = [];
  const ticketIds: string[] = [];

  test.afterAll(async () => {
    await deleteStaff(...staff.map((s) => s.id));
    if (ticketIds.length) {
      await withMongo((db) =>
        db
          .collection('supporttickets')
          .deleteMany({ _id: { $in: ticketIds.map((i) => new ObjectId(i)) } })
      );
    }
  });

  async function member(prefix: string, roles: StaffRole[]) {
    const s = await createStaff(prefix, roles);
    staff.push(s);
    return s;
  }

  for (const role of ['csr', 'manager', 'admin', 'super-admin'] as const) {
    test(`[REQ-130][AC1] a ${role} sees Support in the menu and it opens /dashboard/support`, async ({
      browser,
    }) => {
      tagTest('REQ-130', 1);
      // Usernames are capped at 30 characters, so the role is shortened.
      const s = await member(`sl-${role.slice(0, 3)}`, [role]);
      const { context, page } = await loginAsStaff(browser, s);
      try {
        expect(await visibleNavLinks(page)).toContain('Support');
        await page
          .locator('nav a', { hasText: /^Support$/ })
          .first()
          .click();
        await page.waitForURL(/\/dashboard\/support$/);
        await expect(
          page.getByRole('heading', { name: 'Support Queue' })
        ).toBeVisible();
        if (role === 'csr') {
          await evidenceShot(page, 'REQ-130', 1, 'support-link-for-csr');
        }
      } finally {
        await context.close();
      }
    });
  }

  test('[REQ-130][AC2] a kitchen-only member does not see Support and cannot open the page', async ({
    browser,
  }) => {
    tagTest('REQ-130', 2);
    const s = await member('sup-kitchen', ['kitchen']);
    const { context, page } = await loginAsStaff(browser, s);
    try {
      const links = await visibleNavLinks(page);
      expect(links).not.toContain('Support');
      expect(links).not.toContain('Bookings');
      await evidenceShot(page, 'REQ-130', 2, 'no-support-link-for-kitchen');
      expect(await isRefused(page, '/dashboard/support')).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('[REQ-130][AC2] a customer cannot open the Support queue', async ({
    browser,
  }) => {
    tagTest('REQ-130', 2);
    const customer = await seedVerifiedCustomer();
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, customer, BASE_URL);
      const page = await context.newPage();
      await page.goto('/dashboard/support');
      await page.waitForLoadState('networkidle');
      expect(new URL(page.url()).pathname).not.toBe('/dashboard/support');
    } finally {
      await context.close();
      await cleanupSeededCustomer(customer);
    }
  });

  test('[REQ-130][AC3] the Support item is highlighted on the queue and on a ticket page', async ({
    browser,
  }) => {
    tagTest('REQ-130', 3);
    const now = new Date();
    const ticketId = await withMongo(async (db) => {
      const result = await db.collection('supporttickets').insertOne({
        ticketNumber: `TKT-E2E${Date.now()}`,
        userId: null,
        customerEmail: null,
        customerPhone: null,
        source: 'web',
        category: 'other',
        subject: 'E2E highlight check',
        message: 'E2E highlight check',
        orderId: null,
        status: 'open',
        priority: 'normal',
        assignedTo: null,
        lastCustomerMessageAt: null,
        slaDueAt: null,
        resolvedAt: null,
        replies: [],
        createdAt: now,
        updatedAt: now,
      });
      return String(result.insertedId);
    });
    ticketIds.push(ticketId);

    const s = await member('sup-hl', ['csr']);
    const { context, page } = await loginAsStaff(browser, s);
    try {
      const item = page.locator('nav a', { hasText: /^Support$/ }).first();
      const isHighlighted = async () =>
        (await item.getAttribute('class'))?.includes('bg-primary') ?? false;

      await page.goto('/dashboard/orders');
      await page.waitForLoadState('networkidle');
      expect(await isHighlighted()).toBe(false);

      await page.goto('/dashboard/support');
      await page.waitForLoadState('networkidle');
      expect(await isHighlighted()).toBe(true);
      await evidenceShot(page, 'REQ-130', 3, 'support-highlighted-on-queue');

      await page.goto(`/dashboard/support/${ticketId}`);
      await page.waitForLoadState('networkidle');
      expect(await isHighlighted()).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('[REQ-130][AC4] the menu shows Support for csr and not for a kitchen-only member (side by side)', async ({
    browser,
  }) => {
    tagTest('REQ-130', 4);
    const csr = await member('sup-sbs-csr', ['csr']);
    const kitchen = await member('sup-sbs-kit', ['kitchen']);
    const a = await loginAsStaff(browser, csr);
    const b = await loginAsStaff(browser, kitchen);
    try {
      expect(await visibleNavLinks(a.page)).toContain('Support');
      expect(await visibleNavLinks(b.page)).not.toContain('Support');
      await evidenceShot(a.page, 'REQ-130', 4, 'csr-menu-has-support');
      await evidenceShot(b.page, 'REQ-130', 4, 'kitchen-menu-has-no-support');
    } finally {
      await a.context.close();
      await b.context.close();
    }
  });
});
