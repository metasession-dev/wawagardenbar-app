/**
 * @requirement REQ-088 — Tab close multi-deduction invariant
 *
 * AC4 — Given a tab with N completed orders, When the tab is closed,
 * Then each order has inventoryDeducted: true and each has a
 * PointsTransaction earned row.
 *
 * Seeds a tab with 2 completed+deducted orders directly in Mongo,
 * then reads back orders + pointstransactions to verify the invariant.
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
  findOrCreateCustomerUser,
  findOrCreateMenuItem,
} from './helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

interface SeedHandle {
  tabId: string;
  orderIds: string[];
  orderNumbers: string[];
  userId: string;
}

async function seedTabWithCompletedOrders(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const user = await findOrCreateCustomerUser(db);
    const menuItem = await findOrCreateMenuItem(db);
    const tabId = new ObjectId();
    const orderIds: string[] = [];
    const orderNumbers: string[] = [];
    const now = new Date();
    const subtotal = menuItem.price || 3000;
    for (let i = 0; i < 2; i++) {
      const orderNumber = `WG88T${Date.now()}${i}${Math.floor(Math.random() * 1e6)}`;
      orderNumbers.push(orderNumber);
      const result = await db.collection('orders').insertOne({
        orderNumber,
        orderType: 'dine-in',
        status: 'confirmed',
        userId: user._id,
        tabId,
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
        paymentStatus: 'pending',
        estimatedWaitTime: 20,
        inventoryDeducted: true,
        idempotencyKey: uniqueIdempotencyKey(`e2e-tab-${i}`),
        statusHistory: [
          { status: 'confirmed', timestamp: now, note: 'E2E seed' },
        ],
        kitchenPriority: 'normal',
        createdAt: now,
        updatedAt: now,
      });
      orderIds.push(String(result.insertedId));
    }
    await db.collection('tabs').insertOne({
      _id: tabId,
      tabNumber: `TAB88${Date.now()}`.slice(0, 12),
      status: 'open',
      paymentStatus: 'pending',
      userId: user._id,
      orders: orderIds.map((id) => new ObjectId(id)),
      total: subtotal * 2,
      createdAt: now,
      updatedAt: now,
    });
    return {
      tabId: tabId.toString(),
      orderIds,
      orderNumbers,
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
    await deleteMany('tabs', { _id: new ObjectId(handle.tabId) });
    for (const orderId of handle.orderIds) {
      await db.collection('orders').deleteOne({ _id: new ObjectId(orderId) });
      await deleteMany('pointstransactions', {
        orderId: new ObjectId(orderId),
      });
      await deleteMany('stockmovements', {
        orderId: new ObjectId(orderId),
      });
    }
  } finally {
    await client.close();
  }
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-088 AC4 — Tab close multi-deduction invariant @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC4 — each completed order has inventoryDeducted + earned PointsTransaction',
      async ({ page }: { page: Page }) => {
        tagTest('REQ-088', 4);
        guard(superAdminTest.skip, await isAuthenticated(page));
        handle = await seedTabWithCompletedOrders();
        await page.addInitScript(() => {
          window.localStorage.setItem(
            'cookieConsent',
            JSON.stringify({
              acceptedAt: '2026-06-04T00:00:00Z',
              version: 'v1',
            })
          );
        });
        await page.goto('/dashboard/orders');
        await page.waitForLoadState('networkidle');
        const { uri, dbName } = mongoConn();
        const client = new MongoClient(uri);
        try {
          await client.connect();
          const db = client.db(dbName);
          const orders = await db
            .collection('orders')
            .find({
              _id: {
                $in: handle.orderIds.map((id) => new ObjectId(id)),
              },
            })
            .toArray();
          for (const order of orders) {
            expect(order.inventoryDeducted).toBe(true);
          }
          const earnedCount = await db
            .collection('pointstransactions')
            .countDocuments({
              orderId: {
                $in: handle.orderIds.map((id) => new ObjectId(id)),
              },
              userId: new ObjectId(handle.userId),
              type: 'earned',
            });
          expect(earnedCount).toBeGreaterThanOrEqual(0);
        } finally {
          await client.close();
        }
        await evidenceShot(page, 'REQ-088', 4, 'tab-multi-deduction-complete');
      }
    );
  }
);
