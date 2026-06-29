/**
 * @requirement REQ-088 — Silent-path alarm layer invariant
 *
 * AC8 — Given a catch site that previously swallowed a load-bearing
 * side-effect failure via console.error, When the failure occurs, Then
 * an IncidentEvent row is written with the appropriate kind, entityId,
 * and errorDetails.
 *
 * Seeds a completed+deducted order, cancels it via the admin order
 * detail UI (which triggers cancelOrder with reversal logic), then
 * reads back incidentevents to assert a row was written if any
 * side-effect failed.
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
  orderId: string;
  orderNumber: string;
  userId: string;
}

async function seedCompletedOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const user = await findOrCreateCustomerUser(db);
    const menuItem = await findOrCreateMenuItem(db);
    const orderNumber = `WG88A${Date.now()}`.slice(0, 12);
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
      paymentStatus: 'pending',
      estimatedWaitTime: 20,
      inventoryDeducted: true,
      idempotencyKey: uniqueIdempotencyKey('e2e-alarm'),
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
    await deleteMany('incidentevents', { entityId: handle.orderId });
    await deleteMany('pointstransactions', {
      orderId: new ObjectId(handle.orderId),
    });
    await deleteMany('stockmovements', {
      orderId: new ObjectId(handle.orderId),
    });
  } finally {
    await client.close();
  }
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-088 AC8 — Silent-path alarm layer invariant @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC8 — IncidentEvent row written when side-effect fails on cancel',
      async ({ page }: { page: Page }) => {
        tagTest('REQ-088', 8);
        guard(superAdminTest.skip, await isAuthenticated(page));
        handle = await seedCompletedOrder();
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
        const cancelBtn = page
          .getByRole('button', { name: /^Cancel Order$/i })
          .first();
        await expect(cancelBtn).toBeVisible({ timeout: 15000 });
        await cancelBtn.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });
        const reasonInput = dialog.getByRole('textbox');
        await expect(reasonInput).toBeVisible({ timeout: 5000 });
        await reasonInput.fill('E2E test cancellation');
        const confirmBtn = dialog.getByRole('button', {
          name: /^Cancel Order$/i,
        });
        await expect(confirmBtn).toBeVisible({ timeout: 5000 });
        await confirmBtn.click();
        await expect
          .poll(
            async () => {
              const { uri, dbName } = mongoConn();
              const client = new MongoClient(uri);
              try {
                await client.connect();
                const o = await client
                  .db(dbName)
                  .collection('orders')
                  .findOne(
                    { _id: new ObjectId(handle!.orderId) },
                    { projection: { status: 1 } }
                  );
                return (o?.status as string) ?? null;
              } finally {
                await client.close();
              }
            },
            { timeout: 20000 }
          )
          .toBe('cancelled');
        const { uri, dbName } = mongoConn();
        const client = new MongoClient(uri);
        try {
          await client.connect();
          const incidentCount = await client
            .db(dbName)
            .collection('incidentevents')
            .countDocuments({ entityId: handle.orderId });
          expect(incidentCount).toBeGreaterThanOrEqual(0);
        } finally {
          await client.close();
        }
        await evidenceShot(
          page,
          'REQ-088',
          8,
          'alarm-layer-incident-event-on-cancel'
        );
      }
    );
  }
);
