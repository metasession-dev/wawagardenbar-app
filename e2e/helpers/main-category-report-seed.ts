/**
 * @requirement REQ-076 — Per-main-category report seed helpers
 *
 * Shared seed + cleanup utilities for REQ-076 specs. Pattern matches
 * `e2e/admin/main-categories-config.spec.ts` (REQ-075) and
 * `e2e/admin/menu-item-delete.spec.ts` (REQ-073) — connect to UAT Mongo
 * directly, seed synthetic data prefixed `e2e-req076-*`, return handles
 * so `afterAll` can clean every `_id`.
 *
 * All seeds use a SYNTHETIC PAST DATE (2020-01-01) that's guaranteed not
 * to collide with real UAT orders, so per-main report numbers are
 * deterministic to the seed.
 */
import { MongoClient, ObjectId } from 'mongodb';

export const SYNTHETIC_DATE = new Date('2020-01-01T12:00:00Z');
export const SYNTHETIC_DATE_ISO = '2020-01-01';

export function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

export async function withDb<T>(work: (db: any) => Promise<T>): Promise<T> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await work(client.db(dbName));
  } finally {
    await client.close();
  }
}

export interface SeededMenuItem {
  _id: string;
  name: string;
  mainCategory: string;
  category: string;
  price: number;
  costPerUnit: number;
}

export interface SeededOrder {
  _id: string;
  orderNumber: string;
}

export interface SeededReportFixture {
  menuItemIds: string[];
  orderIds: string[];
  items: Record<string, SeededMenuItem>;
  expectedFoodRevenue: number;
  expectedDrinksRevenue: number;
  expectedFoodCost: number;
  expectedDrinksCost: number;
  expectedFoodItemCount: number;
  expectedDrinksItemCount: number;
  expectedFoodOrderCount: number;
  expectedDrinksOrderCount: number;
}

/**
 * Seed a deterministic mix of paid orders on the synthetic date.
 *
 * Composition:
 *   - 2 Food orders (jollof ×3 + suya ×2 = 5 food items; second order has
 *     jollof ×1 — Food totals account for cross-order aggregation)
 *   - 1 Drinks order (beer ×4)
 *   - 1 Mixed order (jollof ×1 food + beer ×1 drinks — counts toward
 *     BOTH per-main orderCount; documents the multi-main caveat)
 *
 * Math:
 *   Food revenue   = (3 × 4500) + (1 × 4500) + (2 × 3000) + (1 × 4500)
 *                  = 13500 + 4500 + 6000 + 4500 = 28500
 *   Food cost      = (3 × 400)  + (1 × 400)  + (2 × 800)  + (1 × 400)
 *                  = 1200 + 400 + 1600 + 400 = 3600
 *   Food itemCount = 3 + 1 + 2 + 1 = 7
 *   Food orders    = 3 (orders 1, 2, 4)
 *
 *   Drinks revenue   = (4 × 1500) + (1 × 1500) = 6000 + 1500 = 7500
 *   Drinks cost      = (4 × 300) + (1 × 300)  = 1200 + 300 = 1500
 *   Drinks itemCount = 4 + 1 = 5
 *   Drinks orders    = 2 (orders 3, 4)
 */
export async function seedReportFixture(
  prefix: string
): Promise<SeededReportFixture> {
  return withDb(async (db) => {
    // Three menu items — synthetic, unique names.
    const itemsInsert = await db.collection('menuitems').insertMany([
      {
        kind: 'menu-item',
        name: `${prefix}-jollof`,
        description: 'REQ-076 seed',
        mainCategory: 'food',
        category: 'rice-dishes',
        price: 4500,
        costPerUnit: 400,
        preparationTime: 1,
        isAvailable: true,
      },
      {
        kind: 'menu-item',
        name: `${prefix}-suya`,
        description: 'REQ-076 seed',
        mainCategory: 'food',
        category: 'starters',
        price: 3000,
        costPerUnit: 800,
        preparationTime: 1,
        isAvailable: true,
      },
      {
        kind: 'menu-item',
        name: `${prefix}-beer`,
        description: 'REQ-076 seed',
        mainCategory: 'drinks',
        category: 'beer-local',
        price: 1500,
        costPerUnit: 300,
        preparationTime: 1,
        isAvailable: true,
      },
    ]);

    const jollofId = String(itemsInsert.insertedIds[0]);
    const suyaId = String(itemsInsert.insertedIds[1]);
    const beerId = String(itemsInsert.insertedIds[2]);

    const items: Record<string, SeededMenuItem> = {
      jollof: {
        _id: jollofId,
        name: `${prefix}-jollof`,
        mainCategory: 'food',
        category: 'rice-dishes',
        price: 4500,
        costPerUnit: 400,
      },
      suya: {
        _id: suyaId,
        name: `${prefix}-suya`,
        mainCategory: 'food',
        category: 'starters',
        price: 3000,
        costPerUnit: 800,
      },
      beer: {
        _id: beerId,
        name: `${prefix}-beer`,
        mainCategory: 'drinks',
        category: 'beer-local',
        price: 1500,
        costPerUnit: 300,
      },
    };

    // Unique short suffix for orderNumber (which has a unique index +
    // typically caps around 12 chars in the existing schema). Use a
    // compact run-id derived from Date.now base36 + the order index so
    // every order gets a unique key even if multiple specs run in the
    // same process. e2e-req076-spec2-… is too long for the 12-char
    // budget, so we use a shorter compound: "EQ" + base36 timestamp
    // suffix + index.
    const runShort = Date.now().toString(36).slice(-6);
    function mkOrder(
      n: number,
      orderItems: Array<{
        item: SeededMenuItem;
        quantity: number;
      }>
    ) {
      const subtotal = orderItems.reduce(
        (s, i) => s + i.item.price * i.quantity,
        0
      );
      const totalCost = orderItems.reduce(
        (s, i) => s + i.item.costPerUnit * i.quantity,
        0
      );
      // 12-char order number: "EQ" + 6-char runShort + index padded
      // e.g. "EQabc12305" — unique across this run's 4 orders
      const orderNumber = `EQ${runShort}${String(n).padStart(3, '0')}`;
      return {
        orderNumber,
        orderType: 'pickup',
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        businessDate: SYNTHETIC_DATE,
        paidAt: SYNTHETIC_DATE,
        createdAt: SYNTHETIC_DATE,
        updatedAt: SYNTHETIC_DATE,
        items: orderItems.map(({ item, quantity }) => ({
          menuItemId: new ObjectId(item._id),
          name: item.name,
          price: item.price,
          quantity,
          costPerUnit: item.costPerUnit,
          portionSize: 'full',
        })),
        subtotal,
        serviceFee: 0,
        tax: 0,
        deliveryFee: 0,
        discount: 0,
        tipAmount: 0,
        total: subtotal,
        totalCost,
        grossProfit: subtotal - totalCost,
        profitMargin:
          subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0,
        operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
        createdByRole: 'staff',
      };
    }

    const ordersInsert = await db.collection('orders').insertMany([
      mkOrder(1, [{ item: items.jollof, quantity: 3 }]),
      mkOrder(2, [
        { item: items.jollof, quantity: 1 },
        { item: items.suya, quantity: 2 },
      ]),
      mkOrder(3, [{ item: items.beer, quantity: 4 }]),
      mkOrder(4, [
        { item: items.jollof, quantity: 1 },
        { item: items.beer, quantity: 1 },
      ]),
    ]);

    return {
      menuItemIds: [jollofId, suyaId, beerId],
      orderIds: Object.values(ordersInsert.insertedIds).map((id) => String(id)),
      items,
      expectedFoodRevenue: 28500,
      expectedDrinksRevenue: 7500,
      expectedFoodCost: 3600,
      expectedDrinksCost: 1500,
      expectedFoodItemCount: 7,
      expectedDrinksItemCount: 5,
      expectedFoodOrderCount: 3,
      expectedDrinksOrderCount: 2,
    };
  });
}

export async function cleanupReportFixture(
  fixture: SeededReportFixture | null
): Promise<void> {
  if (!fixture) return;
  await withDb(async (db) => {
    if (fixture.orderIds.length > 0) {
      await db.collection('orders').deleteMany({
        _id: { $in: fixture.orderIds.map((id) => new ObjectId(id)) },
      });
    }
    if (fixture.menuItemIds.length > 0) {
      await db.collection('menuitems').deleteMany({
        _id: { $in: fixture.menuItemIds.map((id) => new ObjectId(id)) },
      });
    }
  });
}

/**
 * Seed a synthetic admin user with a specific `mainCategoryReportAccess`
 * permission shape. Returns the user `_id` + plaintext password for the
 * spec to log in with.
 */
export interface SeededAdmin {
  _id: string;
  username: string;
  password: string;
}

export async function seedAdminWithReportAccess(
  prefix: string,
  access: string[] | undefined | null
): Promise<SeededAdmin> {
  // The user-model expects a bcrypt hash for `password`. We import bcrypt
  // here at module-resolve time via Mongo's natural shape — the spec
  // logs in via the form, so the hash must match what the seeded
  // password will resolve to.
  const bcrypt = require('bcrypt');
  const plain = `e2e-${prefix}-pw-${Date.now().toString(36)}`;
  const hashed = await bcrypt.hash(plain, 10);

  // Build the permissions object. `undefined` access → field absent.
  const permissions: Record<string, unknown> = {
    orderManagement: true,
    menuManagement: false,
    inventoryManagement: false,
    rewardsAndLoyalty: false,
    reportsAndAnalytics: true,
    expensesManagement: false,
    settingsAndConfiguration: false,
    kitchenManagement: false,
    incidentsAccess: true,
  };
  if (access !== undefined) {
    permissions.mainCategoryReportAccess = access;
  }

  const username = `${prefix}-${Date.now().toString(36)}`;

  return withDb(async (db) => {
    const result = await db.collection('users').insertOne({
      username,
      email: `${username}@e2e-req076.local`,
      password: hashed,
      firstName: 'E2E',
      lastName: 'REQ-076',
      role: 'admin',
      isAdmin: true,
      accountStatus: 'active',
      isEmailVerified: true,
      isVerified: true,
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return {
      _id: String(result.insertedId),
      username,
      password: plain,
    };
  });
}

export async function readAdminPermissions(
  adminId: string
): Promise<Record<string, unknown> | null> {
  return withDb(async (db) => {
    const user = await db
      .collection('users')
      .findOne({ _id: new ObjectId(adminId) });
    return (user?.permissions as Record<string, unknown>) ?? null;
  });
}

export async function cleanupAdmins(adminIds: string[]): Promise<void> {
  if (adminIds.length === 0) return;
  await withDb(async (db) => {
    await db.collection('users').deleteMany({
      _id: { $in: adminIds.map((id) => new ObjectId(id)) },
    });
  });
}
