/**
 * @requirement REQ-128 — helpers for the refund specs (WA-11).
 *
 * Paid Paystack customer orders, the refund rows the app wrote, and the
 * `refund.processed` / `refund.failed` webhooks. The Paystack call itself is
 * simulated by the app when the e2e secret (`sk_test_e2e_…`, installed with
 * `installPaystackSecret`) is configured, so no money and no network is used.
 */
import { ObjectId } from 'mongodb';
import { withMongo } from './db-assertions';
import {
  seedPaystackOrder,
  postPaystackWebhook,
  type PaystackOrder,
} from './paystack-lifecycle';

/** A customer order that is already paid through Paystack, at the given status. */
export async function seedPaidPaystackOrder(opts: {
  userId: string;
  itemId: string;
  status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out-for-delivery';
  total?: number;
}): Promise<PaystackOrder> {
  const order = await seedPaystackOrder({
    userId: opts.userId,
    itemId: opts.itemId,
    total: opts.total ?? 5000,
  });
  await withMongo((db) =>
    db.collection('orders').updateOne(
      { _id: order._id },
      {
        $set: {
          status: opts.status ?? 'confirmed',
          paymentStatus: 'paid',
          paymentProvider: 'paystack',
          paidAt: new Date(),
          refundReservedKobo: 0,
        },
      }
    )
  );
  return order;
}

export async function refundsFor(orderId: ObjectId): Promise<any[]> {
  return withMongo((db) =>
    db.collection('refunds').find({ orderId }).sort({ createdAt: 1 }).toArray()
  );
}

/** Poll until `count` refund rows exist for the order. */
export async function waitForRefunds(
  orderId: ObjectId,
  count: number,
  timeoutMs = 15_000
): Promise<any[]> {
  const deadline = Date.now() + timeoutMs;
  let rows: any[] = [];
  while (Date.now() < deadline) {
    rows = await refundsFor(orderId);
    if (rows.length >= count) return rows;
    await new Promise((r) => setTimeout(r, 300));
  }
  return rows;
}

export function refundWebhookBody(
  event: 'refund.processed' | 'refund.failed',
  refund: {
    paystackRefundId?: string;
    transactionReference?: string;
    amountKobo: number;
  }
): string {
  return JSON.stringify({
    event,
    data: {
      id: refund.paystackRefundId,
      transaction_reference: refund.transactionReference,
      amount: refund.amountKobo,
      status: event === 'refund.processed' ? 'processed' : 'failed',
    },
  });
}

export async function sendRefundWebhook(
  event: 'refund.processed' | 'refund.failed',
  refund: {
    paystackRefundId?: string;
    transactionReference?: string;
    amountKobo: number;
  }
) {
  return postPaystackWebhook(refundWebhookBody(event, refund));
}

export async function readTicket(
  ticketId: string | ObjectId
): Promise<any | null> {
  return withMongo((db) =>
    db
      .collection('supporttickets')
      .findOne({ _id: new ObjectId(String(ticketId)) })
  );
}

export async function refundTicketsFor(orderId: ObjectId): Promise<any[]> {
  return withMongo((db) =>
    db
      .collection('supporttickets')
      .find({ category: 'refund', orderId: orderId.toString() })
      .toArray()
  );
}

export async function cleanupRefundData(
  orderIds: ObjectId[],
  ticketIds: string[] = []
): Promise<void> {
  await withMongo(async (db) => {
    await db.collection('refunds').deleteMany({ orderId: { $in: orderIds } });
    const refs = [...orderIds.map(String), ...ticketIds];
    await db
      .collection('staffnotifications')
      .deleteMany({ refId: { $in: refs } });
    await db.collection('supporttickets').deleteMany({
      category: 'refund',
      orderId: { $in: orderIds.map(String) },
    });
    await db.collection('processedwebhookevents').deleteMany({
      eventType: { $in: ['refund.processed', 'refund.failed'] },
    });
  });
}
