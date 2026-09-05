/**
 * @requirement REQ-102 — AC6: public menu displays the currently-active price
 *
 * Covers AC6 from compliance/evidence/REQ-102/test-scope.md:
 *   Given a customer views the public menu while the happy-hour or
 *   show-price window is active, When the menu page renders an item's
 *   price, Then the displayed price matches whichever price would
 *   actually be charged right now (server-resolved, not client-computed).
 *
 * Forces the happy-hour window active for the full day (00:00-23:59) via
 * an authenticated `PUT /api/settings` call — NOT a direct Mongo write —
 * because `SettingsService` caches the singleton in-memory for 60s and
 * only the service's own `updateSettings()` (which the API route calls)
 * clears that cache. A raw Mongo write would race the cache and make this
 * test flaky depending on server uptime. Seeds a MenuItem with three
 * distinct prices; restores the window state + deletes the item afterAll.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

interface SeedHandle {
  itemId: string;
  name: string;
}

async function seedMenuItem(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const now = new Date();
    const name = `e2e-req102-menu-display-${Date.now()}`;

    const itemResult = await db.collection('menuitems').insertOne({
      kind: 'menu-item',
      name,
      description: 'REQ-102 e2e menu display pin',
      mainCategory: 'food',
      category: 'main-courses',
      price: 1000,
      showPrice: 800,
      happyHourPrice: 600,
      costPerUnit: 400,
      images: [],
      customizations: [],
      tags: ['e2e-req102'],
      allergens: [],
      isAvailable: true,
      preparationTime: 15,
      portionOptions: {
        halfPortionEnabled: false,
        halfPortionSurcharge: 0,
        quarterPortionEnabled: false,
        quarterPortionSurcharge: 0,
      },
      allowManualPriceOverride: false,
      trackInventory: false,
      pointsRedeemable: false,
      createdAt: now,
      updatedAt: now,
    });

    return { itemId: String(itemResult.insertedId), name };
  } finally {
    await client.close();
  }
}

async function cleanupMenuItem(handle: SeedHandle | null): Promise<void> {
  if (!handle) return;
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db
      .collection('menuitems')
      .deleteOne({ _id: new ObjectId(handle.itemId) });
  } finally {
    await client.close();
  }
}

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('domcontentloaded');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

const superAdminTest = base.extend({ storageState: SUPER_ADMIN_FILE });
superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Super-admin login failed — skipping');
  }
});

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-102: Public menu — displays server-resolved active price',
  () => {
    let handle: SeedHandle | null = null;
    let previousHappyHourWindow: unknown = null;

    superAdminTest.beforeAll(async () => {
      handle = await seedMenuItem();
    });

    superAdminTest.afterAll(async () => {
      await cleanupMenuItem(handle);
    });

    superAdminTest(
      'AC6: menu item card shows happyHourPrice while the happy-hour window is active',
      async ({ page }) => {
        tagTest('REQ-102', 6);

        // Read current settings so the happy-hour window can be restored.
        const before = await page.request.get('/api/settings');
        const beforeJson = await before.json();
        previousHappyHourWindow = beforeJson.data.happyHourWindow;

        // Force the happy-hour window active for the full day — the API
        // route's PUT handler calls SettingsService.updateSettings(), which
        // clears the in-memory cache, so the very next request sees it.
        const putResult = await page.request.put('/api/settings', {
          data: {
            happyHourWindow: { enabled: true, start: '00:00', end: '23:59' },
          },
        });
        expect(putResult.ok()).toBe(true);

        await page.goto(`/menu?search=${encodeURIComponent(handle!.name)}`, {
          waitUntil: 'domcontentloaded',
        });

        const card = page.locator('text=' + handle!.name).first();
        await expect(card).toBeVisible();

        // The displayed price is happyHourPrice (₦600), not the default
        // price (₦1,000) or show price (₦800).
        await expect(page.getByText('₦600').first()).toBeVisible();
        await evidenceShot(page, 'REQ-102', 6, 'menu-shows-happy-hour-price');

        // Restore the happy-hour window before the next test / suite run.
        await page.request.put('/api/settings', {
          data: { happyHourWindow: previousHappyHourWindow },
        });
      }
    );
  }
);
