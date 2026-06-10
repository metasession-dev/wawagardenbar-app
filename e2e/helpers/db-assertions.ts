/**
 * Direct DB query helpers — replacement for daily-report-delta assertions.
 *
 * Pattern adopted per #352: critical-tier specs that previously asserted
 * "daily report aggregate after X = baseline + X" suffered retry-doubling
 * when their `describe.serial` blocks failed partway and re-ran (each
 * iteration's DB writes accumulated into the global aggregate). The fix
 * is to drop the aggregate-delta assertion in favour of:
 *
 *   1. Direct DB queries for the specific entity the test created
 *      (orderNumber / tabId / paidAt-since-timestamp + tipAmount).
 *   2. Cleanup of that entity in `afterEach` so the next attempt starts
 *      from a deterministic state.
 *
 * The aggregation logic (daily report sums) is unit-tested separately at
 * `__tests__/services/financial-report-service.partial-payment-no-double-count.test.ts`
 * + `financial-report-service.tip.test.ts`, so we don't lose coverage —
 * we move the aggregation correctness check to a layer that doesn't
 * depend on shared CI Mongo state.
 *
 * See SDLC/test-isolation.md for the contract + worked examples.
 */
import { MongoClient, ObjectId } from 'mongodb';

export interface MongoConn {
  uri: string;
  dbName: string;
}

export function mongoConn(): MongoConn {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

/**
 * Run a block of work inside a Mongo client lifecycle. Connects, runs,
 * closes the client even on error.
 */
export async function withMongo<T>(work: (db: any) => Promise<T>): Promise<T> {
  const conn = mongoConn();
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    return await work(client.db(conn.dbName));
  } finally {
    await client.close();
  }
}

/**
 * Poll a Mongo query until it returns a non-null result or the timeout
 * elapses. Used after a UI flow that creates a record asynchronously,
 * where the test needs to find THAT record (not just "some matching
 * record exists in the day's aggregate").
 *
 * Returns the first matching document, or null on timeout.
 */
export async function pollForDoc<T = any>(
  collection: string,
  filter: Record<string, unknown>,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<T | null> {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const intervalMs = options?.intervalMs ?? 200;
  const deadline = Date.now() + timeoutMs;
  return withMongo(async (db) => {
    while (Date.now() < deadline) {
      const doc = await db.collection(collection).findOne(filter);
      if (doc) return doc as T;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return null;
  });
}

/**
 * Find an Order created (paidAt) after `since` matching the given
 * tip / payment-method shape. Returns the first match — assumes the
 * test's parameters are distinctive enough that only ONE recent order
 * matches.
 *
 * Use this in place of "daily-report tipsBreakdown.cash delta = TIP"
 * assertions. The aggregation is unit-tested separately.
 */
export async function findRecentOrderWithTip(opts: {
  since: Date;
  tipAmount: number;
  tipPaymentMethod?: 'cash' | 'card' | 'transfer';
  paymentMethod?: 'cash' | 'card' | 'transfer';
  timeoutMs?: number;
}): Promise<any | null> {
  const filter: Record<string, unknown> = {
    paidAt: { $gte: opts.since },
    tipAmount: opts.tipAmount,
  };
  if (opts.tipPaymentMethod !== undefined) {
    filter.tipPaymentMethod = opts.tipPaymentMethod;
  }
  if (opts.paymentMethod !== undefined) {
    filter.paymentMethod = opts.paymentMethod;
  }
  return pollForDoc('orders', filter, { timeoutMs: opts.timeoutMs ?? 8000 });
}

/**
 * Find a Tab closed (closedAt) after `since` whose partialPayments
 * include a row with the given tipAmount + paymentType. Use in place of
 * close-tab tip aggregate-delta assertions.
 */
export async function findRecentTabWithTip(opts: {
  since: Date;
  tipAmount: number;
  paymentType: 'cash' | 'card' | 'transfer';
  timeoutMs?: number;
}): Promise<any | null> {
  return pollForDoc(
    'tabs',
    {
      closedAt: { $gte: opts.since },
      partialPayments: {
        $elemMatch: {
          tipAmount: opts.tipAmount,
          paymentType: opts.paymentType,
        },
      },
    },
    { timeoutMs: opts.timeoutMs ?? 8000 }
  );
}

/**
 * Find an Order paid after `since` with the given total + paymentMethod.
 * Used by revenue-tracking specs to find the order they just created
 * (without depending on a daily-report aggregate).
 */
export async function findRecentPaidOrder(opts: {
  since: Date;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  timeoutMs?: number;
}): Promise<any | null> {
  return pollForDoc(
    'orders',
    {
      paidAt: { $gte: opts.since },
      total: opts.total,
      paymentMethod: opts.paymentMethod,
      paymentStatus: 'paid',
    },
    { timeoutMs: opts.timeoutMs ?? 8000 }
  );
}

/**
 * Delete an Order by _id (cleanup helper for afterEach / afterAll).
 * Idempotent — safe to call even if the order has already been removed.
 */
export async function deleteOrderById(
  orderId: string | ObjectId
): Promise<void> {
  await withMongo(async (db) => {
    const _id = typeof orderId === 'string' ? new ObjectId(orderId) : orderId;
    await db.collection('orders').deleteOne({ _id });
  });
}

/**
 * Delete a Tab by _id (cleanup helper for afterEach / afterAll).
 * Cascades to orders attached to the tab to prevent orphans.
 */
export async function deleteTabById(tabId: string | ObjectId): Promise<void> {
  await withMongo(async (db) => {
    const _id = typeof tabId === 'string' ? new ObjectId(tabId) : tabId;
    const tab = await db.collection('tabs').findOne({ _id });
    if (tab?.orders?.length) {
      await db.collection('orders').deleteMany({
        _id: { $in: tab.orders.map((id: any) => new ObjectId(String(id))) },
      });
    }
    await db.collection('tabs').deleteOne({ _id });
  });
}

/**
 * Delete all Orders whose `paymentReference` matches the given prefix.
 * Useful for bulk-cleanup of test-prefixed payment references like
 * `E2E-POS-${Date.now()}` or `REQ035-TIP-TEST`.
 */
export async function deleteOrdersByReferencePrefix(
  prefix: string
): Promise<number> {
  return withMongo(async (db) => {
    const result = await db
      .collection('orders')
      .deleteMany({ paymentReference: { $regex: `^${escapeRegExp(prefix)}` } });
    return result.deletedCount ?? 0;
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
