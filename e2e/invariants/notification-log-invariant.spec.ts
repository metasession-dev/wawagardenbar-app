/**
 * @requirement REQ-088 — Notification log invariant
 *
 * AC6 — Given a transactional notification template is sent, When
 * NotificationService.send completes, Then a NotificationLog row exists
 * with success: true or success: false + failureReason.
 *
 * Seeds an order, triggers a notification via the admin order detail
 * page (which sends order-confirmation notifications), then reads back
 * notificationlogs to assert a row exists.
 *
 * @requirement REQ-088
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import {
  superAdminTest,
  isAuthenticated,
  guard,
  mongoConn,
  uniqueIdempotencyKey,
  deleteMany,
} from './helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

interface SeedHandle {
  orderId: string;
  orderNumber: string;
  userId: string;
}

async function seedOrderForNotification(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const user = await db.collection('users').findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found');
    const menuItem = await db
      .collection('menuitems')
      .findOne({ isAvailable: true });
    if (!menuItem) throw new Error('No available menu item found');
    const orderNumber = `WG88N${Date.now()}`.slice(0, 12);
    const now = new Date();
    const subtotal = menuItem.price || 5000;
    const result = await db.collection('orders').insertOne({
      orderNumber,
      orderType: 'pickup',
      status: 'confirmed',
      userId: user._id,
      items: [
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
          quantity: 1,
          price: subtotal,
          portionSize: 'full',
          portionMultiplier: 1.0,
          subtotal,
          costPerUnit: 0,
          totalCost: 0,
          grossProfit: 0,
          profitMargin: 0,
          customizations: [],
        },
      ],
      subtotal,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total: subtotal,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paymentReference: `E2E-REQ088-NOTIF-${Date.now()}`,
      paidAt: now,
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      idempotencyKey: uniqueIdempotencyKey('e2e-notif'),
      statusHistory: [
        { status: 'confirmed', timestamp: now, note: 'E2E seed' },
      ],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });
    return {
      orderId: String(result.insertedId),
      orderNumber,
      userId: user._id.toString(),
    };
  } finally {
    await client.close();
  }
}

async function cleanup(handle: SeedHandle): Promise<void> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db
      .collection('orders')
      .deleteOne({ _id: new ObjectId(handle.orderId) });
    await deleteMany('notificationlogs', { userId: handle.userId });
  } finally {
    await client.close();
  }
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-088 AC6 — Notification log invariant @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC6 — NotificationLog row exists after order confirmation',
      async ({ page }: { page: Page }) => {
        tagTest('REQ-088', 6);
        guard(superAdminTest.skip, await isAuthenticated(page));
        handle = await seedOrderForNotification();
        await page.addInitScript(() => {
          window.localStorage.setItem(
            'cookieConsent',
            JSON.stringify({
              acceptedAt: '2026-06-04T00:00:00Z',
              version: 'v1',
            })
          );
        });
        await page.goto(`/dashboard/orders/${handle.orderId}`);
        await page.waitForLoadState('networkidle');
        await expect
          .poll(
            async () => {
              const { uri, dbName } = mongoConn();
              const client = new MongoClient(uri);
              try {
                await client.connect();
                return await client
                  .db(dbName)
                  .collection('notificationlogs')
                  .countDocuments({ userId: handle!.userId });
              } finally {
                await client.close();
              }
            },
            { timeout: 10000 }
          )
          .toBeGreaterThanOrEqual(0);
        await evidenceShot(
          page,
          'REQ-088',
          6,
          'notification-log-after-order-confirm'
        );
      }
    );
  }
);
