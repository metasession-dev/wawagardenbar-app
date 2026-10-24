/**
 * @requirement REQ-115 — WA-01 Phase 0, AC5 (ADR-006)
 *
 * Meta's inbound `from` has no '+'; web sign-in stores numbers as typed.
 * The router must recognise the same person whichever way their number was
 * stored, and must never create a second user for them.
 *
 * Transport-layer spec — no `page`. Assertion surface: `IncomingMessage`
 * (classified state, resolved user) and the `users` collection (no duplicate).
 *
 * @requirement REQ-115
 */
import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { mongoConn, pollForDoc } from '../helpers/db-assertions';
import {
  metaInboundPayload,
  postSignedWebhook,
} from '../helpers/whatsapp-webhook';

let counter = 0;
/** Local part of a Nigerian mobile number: 8 + 9 digits, unique per call. */
function nationalNumber(): string {
  counter += 1;
  return (
    '8' +
    String(Date.now()).slice(-6) +
    String(counter % 10) +
    String(Math.floor(Math.random() * 100)).padStart(2, '0')
  );
}

async function withDb<T>(work: (db: any) => Promise<T>): Promise<T> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await work(client.db(dbName));
  } finally {
    await client.close();
  }
}

async function seedActiveCustomer(storedPhone: string): Promise<string> {
  return withDb(async (db) => {
    const result = await db.collection('users').insertOne({
      phone: storedPhone,
      phoneVerified: true,
      lastLoginAt: new Date(),
      isGuest: false,
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return String(result.insertedId);
  });
}

async function countUsersForNumber(national: string): Promise<number> {
  return withDb((db) =>
    db.collection('users').countDocuments({
      phone: {
        $in: [`+234${national}`, `234${national}`, `0${national}`, national],
      },
    })
  );
}

async function cleanup(national: string, from: string) {
  await withDb(async (db) => {
    await db.collection('users').deleteMany({
      phone: {
        $in: [`+234${national}`, `234${national}`, `0${national}`, national],
      },
    });
    await db.collection('incomingmessages').deleteMany({ from });
    await db.collection('supporttickets').deleteMany({
      customerPhone: { $in: [from, `+${from}`] },
    });
  });
}

test.describe('REQ-115 inbound WhatsApp phone matching', () => {
  test.skip(
    !!process.env.BASE_URL && !process.env.WHATSAPP_APP_SECRET,
    'WhatsApp webhook signature needs WHATSAPP_APP_SECRET when targeting a remote server.'
  );

  test('[US-01.5] a user saved as +234… is found when the message arrives from 234… (no +)', async ({
    request,
  }) => {
    tagTest('REQ-115', 5);

    const national = nationalNumber();
    const from = `234${national}`;
    const userId = await seedActiveCustomer(`+234${national}`);
    const body = `where is my order ${Date.now()}`;

    try {
      const status = await postSignedWebhook(
        request,
        metaInboundPayload({
          from,
          body,
          id: `wamid.E2E-REQ115-US015-${Date.now()}`,
        })
      );
      expect(status).toBe(200);

      const incoming = await pollForDoc<{
        classifiedState: string;
        userId: string;
      }>('incomingmessages', { body });
      expect(incoming, 'the inbound message is recorded').toBeTruthy();
      expect(incoming!.classifiedState).toBe('active');
      expect(incoming!.userId).toBe(userId);
      expect(await countUsersForNumber(national)).toBe(1);
    } finally {
      await cleanup(national, from);
    }
  });

  test('[US-01.5] a user still stored in the legacy local form (0…) is not duplicated', async ({
    request,
  }) => {
    tagTest('REQ-115', 5);

    const national = nationalNumber();
    const from = `234${national}`;
    const userId = await seedActiveCustomer(`0${national}`);
    const body = `legacy format check ${Date.now()}`;

    try {
      const status = await postSignedWebhook(
        request,
        metaInboundPayload({
          from,
          body,
          id: `wamid.E2E-REQ115-US015b-${Date.now()}`,
        })
      );
      expect(status).toBe(200);

      const incoming = await pollForDoc<{
        classifiedState: string;
        userId: string;
      }>('incomingmessages', { body });
      expect(incoming!.classifiedState).toBe('active');
      expect(incoming!.userId).toBe(userId);
      expect(await countUsersForNumber(national)).toBe(1);
    } finally {
      await cleanup(national, from);
    }
  });

  test('[US-01.5] a genuinely new sender is created once, in canonical +E.164 form', async ({
    request,
  }) => {
    tagTest('REQ-115', 5);

    const national = nationalNumber();
    const from = `234${national}`;
    const body = `first message ${Date.now()}`;

    try {
      const status = await postSignedWebhook(
        request,
        metaInboundPayload({
          from,
          body,
          id: `wamid.E2E-REQ115-US015c-${Date.now()}`,
        })
      );
      expect(status).toBe(200);

      const incoming = await pollForDoc<{ classifiedState: string }>(
        'incomingmessages',
        { body }
      );
      expect(incoming!.classifiedState).toBe('new');
      expect(await countUsersForNumber(national)).toBe(1);

      const stored = await withDb((db) =>
        db.collection('users').findOne({ phone: `+234${national}` })
      );
      expect(stored, 'stored with the canonical + prefix').toBeTruthy();
    } finally {
      await cleanup(national, from);
    }
  });
});
