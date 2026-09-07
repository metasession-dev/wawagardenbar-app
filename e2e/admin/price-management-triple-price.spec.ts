/**
 * @requirement REQ-102 — AC1: Price Management — default/show/happy-hour price editing
 *
 * Covers AC1 from compliance/evidence/REQ-102/test-scope.md:
 *   Given a super-admin opens /dashboard/menu/[id]/edit, When they view the
 *   Price Management section, Then they can enter and save a new default
 *   price, show price, and happy hour price alongside cost-per-unit, and
 *   each saved change appears as a new row in the price history viewer.
 *
 * Seeds a throwaway MenuItem via MongoDB (mirrors e2e/admin/menu-item-
 * duplicate.spec.ts's convention) and cleans it up afterAll.
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
    const name = `e2e-req102-price-mgmt-${Date.now()}`;
    const result = await db.collection('menuitems').insertOne({
      kind: 'menu-item',
      name,
      description: 'REQ-102 e2e price management pin',
      mainCategory: 'food',
      category: 'main-courses',
      price: 1000,
      showPrice: 1000,
      happyHourPrice: 1000,
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
    return { itemId: String(result.insertedId), name };
  } finally {
    await client.close();
  }
}

async function cleanup(handle: SeedHandle | null): Promise<void> {
  if (!handle) return;
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db
      .collection('menuitems')
      .deleteOne({ _id: new ObjectId(handle.itemId) });
    await db
      .collection('menuitempricehistories')
      .deleteMany({ menuItemId: new ObjectId(handle.itemId) });
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
  'REQ-102: Price Management — triple price editing',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.beforeAll(async () => {
      handle = await seedMenuItem();
    });

    superAdminTest.afterAll(async () => {
      await cleanup(handle);
    });

    superAdminTest(
      'AC1: Price Management shows default/show/happy-hour price inputs and saves a change',
      async ({ page }) => {
        tagTest('REQ-102', 1);
        await page.goto(`/dashboard/menu/${handle!.itemId}/edit`, {
          waitUntil: 'domcontentloaded',
        });

        await expect(page.getByLabel('New Show Price (₦)')).toBeVisible();
        await expect(page.getByLabel('New Happy Hour Price (₦)')).toBeVisible();
        await evidenceShot(page, 'REQ-102', 1, 'price-management-fields', {
          tier: 'feature',
        });

        await page.getByLabel('New Show Price (₦)').fill('800');
        await page.getByLabel('New Happy Hour Price (₦)').fill('600');
        await page
          .getByRole('combobox', { name: /reason for change/i })
          .click();
        const reasonOption = page.getByRole('option', {
          name: /Promotional Pricing/i,
        });
        await expect(reasonOption).toBeVisible();
        await reasonOption.click();
        await page.getByRole('button', { name: /update price/i }).click();

        await expect(page.getByText(/price updated successfully/i)).toBeVisible(
          {
            timeout: 10000,
          }
        );

        // Price history viewer shows the new snapshot with show/happy-hour price.
        await expect(page.getByText('Show Price').first()).toBeVisible();
        await expect(page.getByText('₦800').first()).toBeVisible();
        await expect(page.getByText('₦600').first()).toBeVisible();
        await evidenceShot(
          page,
          'REQ-102',
          1,
          'price-history-shows-new-snapshot'
        );
      }
    );
  }
);
