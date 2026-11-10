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
