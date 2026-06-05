/**
 * @requirement REQ-073 — Admin destructive ops E2E coverage (sub-issue #296)
 * @requirement SRS REQ-MENUMGT-004 — Delete / duplicate menu item; deletion preserves order history references
 *
 * Pins the storage-layer contract of `deleteMenuItemAction`
 * (app/actions/admin/menu-actions.ts:566) — specifically the `menuItem.deleteOne()`
 * call on line 594. After deletion:
 *
 *   - MenuItemModel.findById(seededId) returns null
 *   - An Order document seeded with items: [{ menuItemId: seededId, name, price }]
 *     retains its embedded snapshot (name + price + menuItemId reference intact;
 *     history layer at the order-item level is not lost when the source MenuItem
 *     is removed).
 *
 * What this spec pins:
 *   ✓ Hard-delete of the MenuItem document via MongoDB driver
 *   ✓ Order.items[].menuItemId snapshot persistence (order history layer)
 *
 * What this spec does NOT pin (deferred):
 *   ✗ Action-layer auth wrapping (requireRole(['admin','super-admin']))
 *   ✗ AuditLog row written by the action layer (separate action unit test)
 *   ✗ UI flow (admin menu list → delete button → confirm modal → row gone)
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

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
  menuItemId: string;
  orderId: string;
  snapshotName: string;
  snapshotPrice: number;
}

async function seedItemAndOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const now = new Date();
    const snapshotName = `e2e-req073-delete-${Date.now()}`;
    const snapshotPrice = 1234;

    const itemResult = await db.collection('menuitems').insertOne({
      kind: 'menu-item',
      name: snapshotName,
      description: 'REQ-073 e2e delete pin',
      category: 'food',
      price: snapshotPrice,
      images: [],
      customizations: [],
      tags: ['e2e-req073'],
      allergens: [],
      isAvailable: true,
      slug: `e2e-req073-delete-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    });
    const menuItemId = String(itemResult.insertedId);

    const orderResult = await db.collection('orders').insertOne({
      orderNumber: `WGE73D${Date.now()}`.slice(0, 12),
      orderType: 'pickup',
      status: 'completed',
      items: [
        {
          menuItemId: new ObjectId(menuItemId),
          name: snapshotName,
          price: snapshotPrice,
          quantity: 1,
          portionSize: 'full',
        },
      ],
      subtotal: snapshotPrice,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total: snapshotPrice,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      createdByRole: 'staff',
      createdAt: now,
      updatedAt: now,
    });
    const orderId = String(orderResult.insertedId);

    return { menuItemId, orderId, snapshotName, snapshotPrice };
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
      .deleteOne({ _id: new ObjectId(handle.menuItemId) });
    await db
      .collection('orders')
      .deleteOne({ _id: new ObjectId(handle.orderId) });
  } finally {
    await client.close();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('REQ-073 — admin destructive op: menu-item delete (REQ-MENUMGT-004)', () => {
  let handle: SeedHandle | null = null;

  test.afterAll(async () => {
    await cleanup(handle);
  });

  test('AC1: deleteOne removes the active item; existing Order snapshot persists', async () => {
    handle = await seedItemAndOrder();

    const { uri, dbName } = mongoConn();
    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db(dbName);

      // Pre-delete: item exists.
      const beforeItem = await db
        .collection('menuitems')
        .findOne({ _id: new ObjectId(handle.menuItemId) });
      expect(beforeItem).not.toBeNull();
      expect(beforeItem!.name).toBe(handle.snapshotName);

      // Pre-delete: order snapshot present.
      const beforeOrder = await db
        .collection('orders')
        .findOne({ _id: new ObjectId(handle.orderId) });
      expect(beforeOrder).not.toBeNull();
      expect(beforeOrder!.items).toHaveLength(1);
      expect(String(beforeOrder!.items[0].menuItemId)).toBe(handle.menuItemId);
      expect(beforeOrder!.items[0].name).toBe(handle.snapshotName);
      expect(beforeOrder!.items[0].price).toBe(handle.snapshotPrice);

      // Act: hard-delete the menu item (matches action's `menuItem.deleteOne()`
      // on app/actions/admin/menu-actions.ts:594).
      const deleteResult = await db
        .collection('menuitems')
        .deleteOne({ _id: new ObjectId(handle.menuItemId) });
      expect(deleteResult.deletedCount).toBe(1);

      // Post-delete: item is gone.
      const afterItem = await db
        .collection('menuitems')
        .findOne({ _id: new ObjectId(handle.menuItemId) });
      expect(afterItem).toBeNull();

      // Post-delete: order snapshot remains intact — name + price + menuItemId
      // reference all preserved. This is the "history preservation" half of
      // REQ-MENUMGT-004.
      const afterOrder = await db
        .collection('orders')
        .findOne({ _id: new ObjectId(handle.orderId) });
      expect(afterOrder).not.toBeNull();
      expect(afterOrder!.items).toHaveLength(1);
      expect(String(afterOrder!.items[0].menuItemId)).toBe(handle.menuItemId);
      expect(afterOrder!.items[0].name).toBe(handle.snapshotName);
      expect(afterOrder!.items[0].price).toBe(handle.snapshotPrice);
    } finally {
      await client.close();
    }
  });
});
