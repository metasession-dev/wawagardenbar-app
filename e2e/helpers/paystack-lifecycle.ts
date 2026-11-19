/**
 * @requirement REQ-123 — helpers for the Paystack payment lifecycle specs.
 *
 * The Paystack webhook secret is read by the server from SystemSettings
 * (`payment-gateway-config`), not from the environment, so a spec that signs a
 * webhook must first install a known test secret and restore the original
 * afterwards. Webhooks are signed over the RAW body (`JSON.stringify(payload)`
 * is exactly the bytes sent).
 */
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { withMongo } from './db-assertions';
import { seedUnpaidOrder } from './customer-order-seed';

export const PAYSTACK_E2E_SECRET = 'sk_test_e2e_req123_secret';
const SETTINGS_KEY = 'payment-gateway-config';

export function baseUrl(): string {
  return (
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/**
 * Install a known Paystack secret in SystemSettings and return a function that
 * restores whatever was there before (or removes the row when there was none).
 */
export async function installPaystackSecret(): Promise<() => Promise<void>> {
  const original = await withMongo<any>((db) =>
    db.collection('systemsettings').findOne({ key: SETTINGS_KEY })
  );
  await withMongo((db) =>
    db.collection('systemsettings').updateOne(
      { key: SETTINGS_KEY },
      {
        $set: {
          value: {
            activeProvider: original?.value?.activeProvider ?? 'monnify',
            paystack: {
              enabled: true,
              mode: 'test',
              publicKey: 'pk_test_e2e_req123',
              secretKey: PAYSTACK_E2E_SECRET,
            },
            monnify: { enabled: true },
          },
          updatedAt: new Date(),
        },
        $setOnInsert: { key: SETTINGS_KEY, createdAt: new Date() },
      },
      { upsert: true }
    )
  );
  return async () => {
    await withMongo(async (db) => {
      if (original) {
        await db
          .collection('systemsettings')
          .replaceOne({ key: SETTINGS_KEY }, original);
      } else {
        await db.collection('systemsettings').deleteOne({ key: SETTINGS_KEY });
      }
    });
  };
}

export function chargeSuccessBody(opts: {
  reference: string;
  amountKobo: number;
  eventId: number;
}): string {
  return JSON.stringify({
    event: 'charge.success',
    data: {
      id: opts.eventId,
      reference: opts.reference,
      status: 'success',
      amount: opts.amountKobo,
      channel: 'card',
      paid_at: new Date().toISOString(),
    },
  });
}

/** POST a webhook signed (HMAC-SHA512) over exactly `rawBody`. */
export async function postPaystackWebhook(
  rawBody: string,
  secret: string = PAYSTACK_E2E_SECRET
): Promise<{ status: number; body: { message?: string; error?: string } }> {
  const signature = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');
  const res = await fetch(`${baseUrl()}/api/webhooks/paystack`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-paystack-signature': signature,
    },
    body: rawBody,
  });
  let body: { message?: string; error?: string } = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON body: leave empty
  }
  return { status: res.status, body };
}

export interface PaystackOrder {
  _id: ObjectId;
  orderNumber: string;
  total: number;
  reference: string;
}

/** An unpaid customer order that already carries a Paystack reference. */
export async function seedPaystackOrder(opts: {
  userId: string;
  itemId: string;
  total?: number;
  reference?: string;
  /** Minutes the order is made to look old (for the payment-link job). */
  ageMinutes?: number;
  stored?: { checkoutUrl: string; accessCode: string };
}): Promise<PaystackOrder> {
  const order = await seedUnpaidOrder({
    userId: opts.userId,
    itemId: opts.itemId,
    total: opts.total ?? 5000,
    origin: 'customer',
  });
  const reference =
    opts.reference ?? `E2E-REQ123-${order._id.toString().slice(-8)}`;
  await withMongo((db) =>
    db.collection('orders').updateOne(
      { _id: order._id },
      {
        $set: {
          paymentReference: reference,
          ...(opts.ageMinutes
            ? {
                createdAt: new Date(Date.now() - opts.ageMinutes * 60_000),
              }
            : {}),
          ...(opts.stored
            ? {
                paymentProvider: 'paystack',
                checkoutUrl: opts.stored.checkoutUrl,
                paystackAccessCode: opts.stored.accessCode,
              }
            : {}),
        },
      }
    )
  );
  return { ...order, reference };
}

export async function readOrder(orderId: ObjectId): Promise<any | null> {
  return withMongo((db) => db.collection('orders').findOne({ _id: orderId }));
}

export async function notificationRows(
  userId: string,
  templateKey: string
): Promise<any[]> {
  return withMongo((db) =>
    db
      .collection('notificationlogs')
      .find({ userId, templateKey })
      .sort({ attemptedAt: 1 })
      .toArray()
  );
}

/** Poll until `count` rows for the template exist (the log write is async). */
export async function waitForNotificationRows(
  userId: string,
  templateKey: string,
  count: number,
  timeoutMs = 10_000
): Promise<any[]> {
  const deadline = Date.now() + timeoutMs;
  let rows: any[] = [];
  while (Date.now() < deadline) {
    rows = await notificationRows(userId, templateKey);
    if (rows.length >= count) return rows;
    await new Promise((r) => setTimeout(r, 300));
  }
  return rows;
}

export async function processedEventCount(eventId: number): Promise<number> {
  return withMongo((db) =>
    db
      .collection('processedwebhookevents')
      .countDocuments({ eventId: String(eventId) })
  );
}

export async function incidentsFor(
  entityId: string,
  kind: string
): Promise<any[]> {
  return withMongo((db) =>
    db.collection('incidentevents').find({ entityId, kind }).toArray()
  );
}

export async function cleanupPaystackOrder(
  order: PaystackOrder,
  userId: string,
  eventIds: number[] = []
): Promise<void> {
  await withMongo(async (db) => {
    await db.collection('orders').deleteOne({ _id: order._id });
    await db
      .collection('staffnotifications')
      .deleteMany({ refId: order._id.toString() });
    await db.collection('notificationlogs').deleteMany({ userId });
    await db
      .collection('incidentevents')
      .deleteMany({ entityId: order._id.toString() });
    if (eventIds.length) {
      await db
        .collection('processedwebhookevents')
        .deleteMany({ eventId: { $in: eventIds.map(String) } });
    }
  });
}
