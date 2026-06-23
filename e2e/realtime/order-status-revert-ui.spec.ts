/**
 * @requirement REQ-083 — Fix completed orders reverting to previous status
 *
 * Browser-level AC evidence for REQ-083. Proves the kitchen display removes
 * completed/cancelled orders from the grid immediately without reverting.
 *
 * Seeds a `ready` order directly in MongoDB (same pattern as
 * `admin-order-inventory-delta.kitchen-display.spec.ts`), navigates to
 * `/dashboard/kitchen-display`, and drives the status transition through
 * the UI. Captures `evidenceShot()` at each AC assertion.
 *
 * AC1 — completed order is removed from the kitchen grid (not reverted)
 * AC2 — non-terminal status (preparing) updates in-place on the card
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';

function mongoConn(): { uri: string; dbName: string } {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

interface SeedHandle {
  orderId: string;
  orderNumber: string;
}

async function seedOrder(
  status: 'confirmed' | 'preparing' | 'ready'
): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const orderNumber = `WGE2E${Date.now()}`.slice(0, 12);
    const now = new Date();
    const result = await db.collection('orders').insertOne({
      orderNumber,
      orderType: 'pickup',
      status,
      items: [
        {
          menuItemId: new ObjectId(),
          name: 'E2E Test Item',
          price: 500,
          quantity: 1,
          portionSize: 'full',
          portionMultiplier: 1.0,
          subtotal: 500,
          costPerUnit: 0,
          totalCost: 0,
          grossProfit: 0,
          profitMargin: 0,
          customizations: [],
        },
      ],
      subtotal: 500,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total: 500,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paymentReference: `E2E-CASH-${Date.now()}`,
      paidAt: now,
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      statusHistory: [{ status, timestamp: now, note: 'E2E seed REQ-083' }],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });
    return { orderId: String(result.insertedId), orderNumber };
  } finally {
    await client.close();
  }
}

async function cleanupOrder(orderId: string): Promise<void> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client
      .db(dbName)
      .collection('orders')
      .deleteOne({ _id: new ObjectId(orderId) });
  } finally {
    await client.close();
  }
}

async function readOrderStatus(orderId: string): Promise<string | null> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const o = await client
      .db(dbName)
      .collection('orders')
      .findOne({ _id: new ObjectId(orderId) }, { projection: { status: 1 } });
    return (o?.status as string) ?? null;
  } finally {
    await client.close();
  }
}

function guard(
  skip: (cond: boolean, reason: string) => void,
  ok: boolean
): void {
  if (ok) return;
  if (process.env.CI) {
    throw new Error(
      'Expected a super-admin session in CI but none was present'
    );
  }
  skip(true, 'super-admin session unavailable (local only)');
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-083 — order status revert fix (kitchen display UI)',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanupOrder(handle.orderId);
        handle = null;
      }
    });

    superAdminTest(
      'AC1 — completed order is removed from kitchen grid immediately (no revert)',
      async ({ page }: { page: Page }) => {
        tagTest('REQ-083', 1);
        guard(superAdminTest.skip, await isAuthenticated(page));

        handle = await seedOrder('ready');

        await page.addInitScript(() => {
          window.localStorage.setItem(
            'cookieConsent',
            JSON.stringify({
              acceptedAt: '2026-06-04T00:00:00Z',
              version: 'v1',
            })
          );
        });

        await page.goto('/dashboard/kitchen-display');
        await page.waitForLoadState('networkidle');

        const cookieBanner = page.getByTestId('cookie-consent-banner');
        if (await cookieBanner.isVisible().catch(() => false)) {
          await page.getByRole('button', { name: /got it/i }).click();
          await expect(cookieBanner).toHaveCount(0);
        }

        const heading = page.getByRole('heading', {
          name: handle.orderNumber,
          level: 2,
        });
        await expect(heading).toBeVisible({ timeout: 15000 });

        const card = heading.locator(
          'xpath=ancestor::div[contains(@class, "border-2")][1]'
        );
        const completeBtn = card.getByRole('button', {
          name: /complete order/i,
        });
        await expect(completeBtn).toBeVisible({ timeout: 10000 });
        await expect(completeBtn).toBeEnabled();
        await completeBtn.click();

        await expect
          .poll(() => readOrderStatus(handle!.orderId), { timeout: 15000 })
          .toBe('completed');

        await expect(heading).not.toBeVisible({ timeout: 10000 });

        await evidenceShot(
          page,
          'REQ-083',
          1,
          'completed-order-removed-from-kitchen-grid'
        );
      }
    );

    superAdminTest(
      'AC2 — preparing status updates in-place on kitchen card (no revert)',
      async ({ page }: { page: Page }) => {
        tagTest('REQ-083', 2);
        guard(superAdminTest.skip, await isAuthenticated(page));

        handle = await seedOrder('confirmed');

        await page.addInitScript(() => {
          window.localStorage.setItem(
            'cookieConsent',
            JSON.stringify({
              acceptedAt: '2026-06-04T00:00:00Z',
              version: 'v1',
            })
          );
        });

        await page.goto('/dashboard/kitchen-display');
        await page.waitForLoadState('networkidle');

        const cookieBanner = page.getByTestId('cookie-consent-banner');
        if (await cookieBanner.isVisible().catch(() => false)) {
          await page.getByRole('button', { name: /got it/i }).click();
          await expect(cookieBanner).toHaveCount(0);
        }

        const heading = page.getByRole('heading', {
          name: handle.orderNumber,
          level: 2,
        });
        await expect(heading).toBeVisible({ timeout: 15000 });

        const card = heading.locator(
          'xpath=ancestor::div[contains(@class, "border-2")][1]'
        );
        const startBtn = card.getByRole('button', { name: /start preparing/i });
        await expect(startBtn).toBeVisible({ timeout: 10000 });
        await expect(startBtn).toBeEnabled();
        await startBtn.click();

        await expect
          .poll(() => readOrderStatus(handle!.orderId), { timeout: 15000 })
          .toBe('preparing');

        await expect(heading).toBeVisible({ timeout: 5000 });

        await evidenceShot(
          page,
          'REQ-083',
          2,
          'preparing-status-updates-inplace-no-revert'
        );
      }
    );
  }
);
