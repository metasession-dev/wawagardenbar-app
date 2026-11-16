/**
 * @requirement REQ-120 — seed helpers for customer-order specs
 */
import { ObjectId } from 'mongodb';
import { withMongo } from './db-assertions';

/** An in-stock menu item at a known price; returns its id. */
export async function seedPricedMenuItem(price: number): Promise<string> {
  const _id = new ObjectId();
  await withMongo(async (db) => {
    await db.collection('menuitems').insertOne({
      _id,
      kind: 'menu-item',
      name: `E2E Order Item ${price}`,
      description: 'REQ-120 e2e item',
      price,
      mainCategory: 'food',
      category: 'food',
      subcategory: 'starters',
      isAvailable: true,
      isOutOfStock: false,
      preparationTime: 10,
      displayPriority: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
  return _id.toString();
}

export async function cleanupMenuItem(id: string): Promise<void> {
  await withMongo(async (db) => {
    await db.collection('menuitems').deleteOne({ _id: new ObjectId(id) });
  });
}

export async function ordersWithKey(key: string): Promise<any[]> {
  return withMongo(async (db) =>
    db.collection('orders').find({ idempotencyKey: key }).toArray()
  );
}

export async function deleteOrdersWithKeyPrefix(prefix: string): Promise<void> {
  await withMongo(async (db) => {
    await db
      .collection('orders')
      .deleteMany({ idempotencyKey: { $regex: `^${prefix}` } });
  });
}

/**
 * REQ-122 — a minimal unpaid order with a payment reference, so a signed
 * provider webhook can mark it paid exactly as in production. `origin`
 * decides whether staff are alerted (customer) or not (staff).
 */
export async function seedUnpaidOrder(opts: {
  userId: string;
  itemId: string;
  total?: number;
  origin?: 'customer' | 'staff';
}): Promise<{ _id: ObjectId; orderNumber: string; total: number }> {
  const _id = new ObjectId();
  const total = opts.total ?? 5000;
  const orderNumber = `WG${String(Date.now()).slice(-10)}`;
  await withMongo(async (db) => {
    await db.collection('orders').insertOne({
      _id,
      orderNumber,
      userId: new ObjectId(opts.userId),
      origin: opts.origin ?? 'customer',
      channel: 'web',
      orderType: 'dine-in',
      items: [
        {
          menuItemId: new ObjectId(opts.itemId),
          name: 'E2E Order Item',
          price: total,
          quantity: 1,
          portionSize: 'full',
          portionMultiplier: 1,
          customizations: [],
          subtotal: total,
          costPerUnit: 0,
          totalCost: 0,
          grossProfit: 0,
          profitMargin: 0,
        },
      ],
      subtotal: total,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total,
      dineInDetails: { tableNumber: 'T-E2E-122' },
      estimatedWaitTime: 20,
      status: 'pending',
      paymentStatus: 'pending',
      statusHistory: [],
      idempotencyKey: `e2e-122-${_id.toString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
  return { _id, orderNumber, total };
}

export async function cleanupOrderAndAlerts(orderId: ObjectId): Promise<void> {
  await withMongo(async (db) => {
    await db.collection('orders').deleteOne({ _id: orderId });
    await db
      .collection('staffnotifications')
      .deleteMany({ refId: orderId.toString() });
  });
}
