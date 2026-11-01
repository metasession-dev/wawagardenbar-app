/**
 * @requirement REQ-116 — inbound idempotency and multi-entry payloads (AC4, AC5)
 *
 * Transport-layer spec. The same `wamid` delivered twice yields exactly one
 * IncomingMessage row and one support ticket; a payload with several
 * entry[] / changes[] items has every message processed.
 */
import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import {
  metaInboundPayload,
  postSignedWebhook,
} from '../helpers/whatsapp-webhook';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

async function withDb<T>(
  fn: (db: ReturnType<MongoClient['db']>) => Promise<T>
): Promise<T> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await fn(client.db(dbName));
  } finally {
    await client.close();
  }
}

const phones: string[] = [];
const messageIds: string[] = [];
const unique = (prefix: string) =>
  `${prefix}${Date.now()}${Math.floor(Math.random() * 1e4)}`;

/** An active customer, so a plain message routes to the ticket branch. */
async function seedActiveCustomer(digits: string) {
  phones.push(digits);
  await withDb((db) =>
    db.collection('users').insertOne({
      phone: `+${digits}`,
      phoneVerified: true,
      lastLoginAt: new Date(),
      isGuest: false,
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
}

test.describe('[REQ-116] WhatsApp inbound idempotency', () => {
  test.afterAll(async () => {
    await withDb(async (db) => {
      await db
        .collection('incomingmessages')
        .deleteMany({ messageId: { $in: messageIds } });
      await db.collection('supporttickets').deleteMany({
        customerPhone: { $in: phones.flatMap((p) => [p, `+${p}`]) },
      });
      await db
        .collection('users')
        .deleteMany({ phone: { $in: phones.flatMap((p) => [p, `+${p}`]) } });
    });
  });

  test('[REQ-116][AC4] the same wamid delivered twice creates one row and one ticket', async ({
    request,
  }) => {
    tagTest('REQ-116', 4);
    const digits = '234' + String(Date.now()).slice(-10);
    await seedActiveCustomer(digits);
    const id = unique('wamid.E2E116DUP');
    messageIds.push(id);
    const body = `late order ${id}`;
    const payload = metaInboundPayload({ from: digits, body, id });

    expect(await postSignedWebhook(request, payload)).toBe(200);
    expect(await postSignedWebhook(request, payload)).toBe(200);

    const rows = await withDb((db) =>
      db.collection('incomingmessages').countDocuments({ messageId: id })
    );
    const tickets = await withDb((db) =>
      db.collection('supporttickets').countDocuments({ message: body })
    );
    expect(rows).toBe(1);
    expect(tickets).toBe(1);
  });

  test('[REQ-116][AC5] every message in a multi-entry payload is processed', async ({
    request,
  }) => {
    tagTest('REQ-116', 5);
    const digitsA = '234' + String(Date.now()).slice(-10);
    const digitsB = '234' + String(Date.now() + 1).slice(-10);
    await seedActiveCustomer(digitsA);
    await seedActiveCustomer(digitsB);
    const idA = unique('wamid.E2E116MULTA');
    const idB = unique('wamid.E2E116MULTB');
    messageIds.push(idA, idB);
    const a = metaInboundPayload({
      from: digitsA,
      body: `multi ${idA}`,
      id: idA,
    });
    const b = metaInboundPayload({
      from: digitsB,
      body: `multi ${idB}`,
      id: idB,
    });
    const combined = { ...a, entry: [...a.entry, ...b.entry] };

    expect(await postSignedWebhook(request, combined)).toBe(200);

    const stored = await withDb((db) =>
      db
        .collection('incomingmessages')
        .countDocuments({ messageId: { $in: [idA, idB] } })
    );
    expect(stored).toBe(2);
  });
});
