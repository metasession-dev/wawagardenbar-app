/**
 * @requirement REQ-115 — WA-01 Phase 0: existing WhatsApp defects
 *
 * AC1 — the inbound router sends `welcome_new_user` with
 * [opening time, closing time] and `welcome_back` with [first name]
 * (Meta error 131048 came from sending these with no parameters).
 *
 * Transport-layer spec — no `page`. CI runs with
 * `ENABLE_WHATSAPP_NOTIFICATIONS=false`, so nothing reaches Meta: the send is
 * attempted, short-circuits, and `NotificationService` still writes a
 * `NotificationLog` row carrying the template key and the exact parameters it
 * would have sent. That row is the assertion surface (Level 1).
 *
 * The webhook signature is verified with `WHATSAPP_APP_SECRET` when set; the
 * shared helper signs with it, so this runs wherever the secret is known.
 *
 * @requirement REQ-115
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { mongoConn, pollForDoc } from '../helpers/db-assertions';
import {
  metaInboundPayload,
  postSignedWebhook,
} from '../helpers/whatsapp-webhook';

const DAY_MS = 24 * 60 * 60 * 1000;
// `h:mm a`, e.g. "9:00 AM" / "11:30 PM".
const TIME_OF_DAY = /^(1[0-2]|[1-9]):[0-5]\d (AM|PM)$/;

let counter = 0;
/** A Meta-style sender: country code + 10 digits, no '+'. */
function senderDigits(): string {
  counter += 1;
  return (
    '234' +
    String(Date.now()).slice(-8) +
    String(counter % 10) +
    String(Math.floor(Math.random() * 10))
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

async function seedDormantCustomer(phone: string, firstName?: string) {
  return withDb(async (db) => {
    const result = await db.collection('users').insertOne({
      phone,
      ...(firstName ? { firstName } : {}),
      phoneVerified: true,
      lastLoginAt: new Date(Date.now() - 45 * DAY_MS),
      isGuest: false,
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return String(result.insertedId);
  });
}

async function cleanup(digits: string, userIds: string[]) {
  await withDb(async (db) => {
    await db
      .collection('users')
      .deleteMany({ phone: { $in: [digits, `+${digits}`] } });
    await db.collection('incomingmessages').deleteMany({ from: digits });
    if (userIds.length > 0) {
      await db
        .collection('notificationlogs')
        .deleteMany({ userId: { $in: userIds } });
    }
  });
}

test.describe('REQ-115 WhatsApp welcome templates carry their parameters', () => {
  test.skip(
    !!process.env.BASE_URL && !process.env.WHATSAPP_APP_SECRET,
    'WhatsApp webhook signature needs WHATSAPP_APP_SECRET when targeting a remote server.'
  );

  test('[US-01.1] an unknown number gets welcome_new_user with opening and closing time', async ({
    request,
  }) => {
    tagTest('REQ-115', 1);

    const digits = senderDigits();
    const messageId = `wamid.E2E-REQ115-US011-${Date.now()}`;
    let createdUserId: string | null = null;

    try {
      const status = await postSignedWebhook(
        request,
        metaInboundPayload({ from: digits, body: 'hello', id: messageId })
      );
      expect(status).toBe(200);

      const user = await pollForDoc<{ _id: ObjectId }>('users', {
        phone: { $in: [digits, `+${digits}`] },
      });
      expect(user, 'the router should auto-create the user').toBeTruthy();
      createdUserId = String(user!._id);

      const log = await pollForDoc<{
        templateKey: string;
        channel: string;
        templateParams: {
          header: string[];
          body: string[];
          buttons: unknown[];
        };
      }>('notificationlogs', {
        userId: createdUserId,
        templateKey: 'welcome_new_user',
      });
      expect(log, 'a welcome_new_user NotificationLog row').toBeTruthy();
      expect(log!.channel).toBe('whatsapp');
      expect(log!.templateParams.header).toEqual([]);
      expect(log!.templateParams.body).toHaveLength(2);
      for (const time of log!.templateParams.body) {
        expect(time).toMatch(TIME_OF_DAY);
      }
      expect(log!.templateParams.buttons).toEqual([]);

      const incoming = await pollForDoc<{ actionTaken: string }>(
        'incomingmessages',
        { from: digits }
      );
      // WhatsApp is off in CI, so the send is recorded as failed, not sent.
      expect(incoming?.actionTaken).toMatch(
        /^welcome_new_user_(sent|failed:[A-Z_]+)$/
      );
    } finally {
      await cleanup(digits, createdUserId ? [createdUserId] : []);
    }
  });

  test('[US-01.2] a dormant customer named Ada gets welcome_back with ["Ada"]', async ({
    request,
  }) => {
    tagTest('REQ-115', 1);

    const digits = senderDigits();
    const userId = await seedDormantCustomer(`+${digits}`, 'Ada');
    const messageId = `wamid.E2E-REQ115-US012-${Date.now()}`;

    try {
      const status = await postSignedWebhook(
        request,
        metaInboundPayload({ from: digits, body: 'hi again', id: messageId })
      );
      expect(status).toBe(200);

      const log = await pollForDoc<{
        templateParams: { header: string[]; body: string[] };
      }>('notificationlogs', { userId, templateKey: 'welcome_back' });
      expect(log, 'a welcome_back NotificationLog row').toBeTruthy();
      expect(log!.templateParams.body).toEqual(['Ada']);
      expect(log!.templateParams.header).toEqual([]);
    } finally {
      await cleanup(digits, [userId]);
    }
  });

  test('[US-01.2] a dormant customer with no name gets welcome_back with ["there"]', async ({
    request,
  }) => {
    tagTest('REQ-115', 1);

    const digits = senderDigits();
    const userId = await seedDormantCustomer(`+${digits}`);
    const messageId = `wamid.E2E-REQ115-US012b-${Date.now()}`;

    try {
      const status = await postSignedWebhook(
        request,
        metaInboundPayload({ from: digits, body: 'hello', id: messageId })
      );
      expect(status).toBe(200);

      const log = await pollForDoc<{ templateParams: { body: string[] } }>(
        'notificationlogs',
        { userId, templateKey: 'welcome_back' }
      );
      expect(log!.templateParams.body).toEqual(['there']);
    } finally {
      await cleanup(digits, [userId]);
    }
  });
});
