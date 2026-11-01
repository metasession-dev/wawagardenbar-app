/**
 * @requirement REQ-116 — marketing-only STOP and START (AC6)
 *
 * Transport-layer spec. STOP clears `whatsappMarketing` only (order and
 * booking messages continue); START restores marketing, stamps the
 * timestamp and records the source `whatsapp_inbound`.
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

async function seedOptedInCustomer(digits: string) {
  phones.push(digits);
  await withDb((db) =>
    db.collection('users').insertOne({
      phone: `+${digits}`,
      phoneVerified: true,
      lastLoginAt: new Date(),
      isGuest: false,
      accountStatus: 'active',
      preferences: {
        communicationPreferences: {
          whatsappTransactional: true,
          whatsappMarketing: true,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
}

async function prefs(digits: string) {
  const user = await withDb((db) =>
    db.collection('users').findOne({ phone: `+${digits}` })
  );
  return user?.preferences as
    | {
        communicationPreferences: {
          whatsappTransactional: boolean;
          whatsappMarketing: boolean;
        };
        communicationPreferencesUpdatedAt?: Date;
        communicationPreferencesSource?: string;
      }
    | undefined;
}

test.describe('[REQ-116] WhatsApp STOP / START', () => {
  test.afterAll(async () => {
    await withDb(async (db) => {
      await db
        .collection('incomingmessages')
        .deleteMany({ messageId: { $in: messageIds } });
      await db
        .collection('users')
        .deleteMany({ phone: { $in: phones.map((p) => `+${p}`) } });
    });
  });

  test('[REQ-116][AC6] STOP clears marketing only; START restores it with source whatsapp_inbound', async ({
    request,
  }) => {
    tagTest('REQ-116', 6);
    const digits = '234' + String(Date.now()).slice(-10);
    await seedOptedInCustomer(digits);

    const stopId = unique('wamid.E2E116STOP');
    messageIds.push(stopId);
    expect(
      await postSignedWebhook(
        request,
        metaInboundPayload({ from: digits, body: 'STOP', id: stopId })
      )
    ).toBe(200);

    const afterStop = await prefs(digits);
    expect(afterStop?.communicationPreferences.whatsappMarketing).toBe(false);
    expect(afterStop?.communicationPreferences.whatsappTransactional).toBe(
      true
    );

    const startId = unique('wamid.E2E116START');
    messageIds.push(startId);
    expect(
      await postSignedWebhook(
        request,
        metaInboundPayload({ from: digits, body: 'START', id: startId })
      )
    ).toBe(200);

    const afterStart = await prefs(digits);
    expect(afterStart?.communicationPreferences.whatsappMarketing).toBe(true);
    expect(afterStart?.communicationPreferences.whatsappTransactional).toBe(
      true
    );
    expect(afterStart?.communicationPreferencesSource).toBe('whatsapp_inbound');
    expect(afterStart?.communicationPreferencesUpdatedAt).toBeTruthy();
  });
});
