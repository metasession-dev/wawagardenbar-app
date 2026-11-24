/**
 * @requirement REQ-124 — seed helpers for order status notifications, signed
 * tracking links and the serving check (WA-08, #970).
 */
import { ObjectId } from 'mongodb';
import { withMongo } from './db-assertions';
import { seedUnpaidOrder } from './customer-order-seed';

export interface SeedOrderOptions {
  userId: string;
  itemId: string;
  origin?: 'customer' | 'staff';
  orderType?: 'dine-in' | 'pickup' | 'delivery';
  status?: string;
  paid?: boolean;
  /** Dine-in table; `null` removes the table from the order. */
  tableNumber?: string | null;
  /** Remove the account link (a staff order with no customer). */
  noUser?: boolean;
  guestName?: string;
  tabId?: ObjectId;
  delivery?: {
    street: string;
    city: string;
    state: string;
    instructions?: string;
  };
}

export async function seedOrder(
  opts: SeedOrderOptions
): Promise<{ _id: ObjectId; orderNumber: string }> {
  // seedUnpaidOrder numbers orders by the millisecond: keep them distinct.
  await new Promise((r) => setTimeout(r, 5));
  const base = await seedUnpaidOrder({
    userId: opts.userId,
    itemId: opts.itemId,
    origin: opts.origin ?? 'customer',
  });
  const set: Record<string, unknown> = {
    orderType: opts.orderType ?? 'dine-in',
    status: opts.status ?? 'confirmed',
    notifiedStatuses: [],
  };
  const unset: Record<string, ''> = {};
  if (opts.paid !== false) {
    set.paymentStatus = 'paid';
    set.paidAt = new Date();
  }
  if (
    opts.tableNumber === null ||
    opts.orderType === 'pickup' ||
    opts.orderType === 'delivery'
  ) {
    unset.dineInDetails = '';
  } else if (opts.tableNumber) {
    set['dineInDetails.tableNumber'] = opts.tableNumber;
  }
  if (opts.noUser) unset.userId = '';
  if (opts.guestName) set.guestName = opts.guestName;
  if (opts.tabId) set.tabId = opts.tabId;
  if (opts.delivery) {
    set.deliveryDetails = {
      address: {
        street: opts.delivery.street,
        city: opts.delivery.city,
        state: opts.delivery.state,
        country: 'Nigeria',
      },
      deliveryInstructions: opts.delivery.instructions,
    };
  }
  await withMongo((db) =>
    db
      .collection('orders')
      .updateOne(
        { _id: base._id },
        { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }
      )
  );
  return { _id: base._id, orderNumber: base.orderNumber };
}

/** A minimal open tab with a table and a customer name. */
export async function seedTab(opts: {
  tableNumber: string;
  customerName?: string;
}): Promise<ObjectId> {
  const _id = new ObjectId();
  await withMongo((db) =>
    db.collection('tabs').insertOne({
      _id,
      tabNumber: `E2E-124-${_id.toString().slice(-8)}`,
      tableNumber: opts.tableNumber,
      ...(opts.customerName ? { customerName: opts.customerName } : {}),
      status: 'open',
      orders: [],
      subtotal: 0,
      tax: 0,
      serviceFee: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total: 0,
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
  return _id;
}

export async function cleanupTab(id: ObjectId): Promise<void> {
  await withMongo((db) => db.collection('tabs').deleteOne({ _id: id }));
}

/** A customer message from `phone` received `minutesAgo` ago: opens the 24-hour window. */
export async function seedInboundMessage(opts: {
  phone: string;
  userId: string;
  minutesAgo?: number;
}): Promise<string> {
  const messageId = `e2e-124-${new ObjectId().toString()}`;
  await withMongo((db) =>
    db.collection('incomingmessages').insertOne({
      from: opts.phone,
      body: 'hello',
      messageType: 'text',
      messageId,
      classifiedState: 'active',
      classifiedIntent: 'support_text',
      actionTaken: 'e2e',
      userId: opts.userId,
      receivedAt: new Date(Date.now() - (opts.minutesAgo ?? 5) * 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
  return messageId;
}

export async function cleanupInboundMessage(messageId: string): Promise<void> {
  await withMongo((db) =>
    db.collection('incomingmessages').deleteOne({ messageId })
  );
}

export async function cleanupNotificationRows(userId: string): Promise<void> {
  await withMongo((db) =>
    db.collection('notificationlogs').deleteMany({ userId })
  );
}

export async function readOrderStatus(id: ObjectId): Promise<string | null> {
  const o = await withMongo<any>((db) =>
    db.collection('orders').findOne({ _id: id }, { projection: { status: 1 } })
  );
  return o?.status ?? null;
}

export async function waitForOrderStatus(
  id: ObjectId,
  status: string,
  timeoutMs = 10_000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await readOrderStatus(id)) === status) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}
