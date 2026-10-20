/**
 * @requirement REQ-111 — account-recovery routing for inbound WhatsApp
 * messages (scoped slice of #933)
 *
 * AC1 — an inbound WhatsApp message from an unrecognized phone whose body
 * contains an email matching a *different* existing account's phone is
 * classified `phone_mismatch` and triggers an `account_recovery` template
 * send directly to the inbound sender (`WhatsAppService.sendMessage`, not
 * `NotificationService.send`).
 *
 * AC4 — regression: a brand-new phone with no identifying signal in the
 * body is still classified `new` and still receives `welcome_new_user`,
 * unchanged from pre-REQ-111 behaviour.
 *
 * Transport-layer spec — no `page` object. `ENABLE_WHATSAPP_NOTIFICATIONS`
 * is unset in the e2e env, so `WhatsAppService.sendMessage()` short-circuits
 * with `errorCode: 'SERVICE_DISABLED'` before any real network call; the
 * persisted `IncomingMessage.actionTaken` is the DB-observable proxy for
 * "the correct template send was attempted" (same safety property
 * `e2e/support-ticket-whatsapp-inbound.spec.ts` already relies on).
 *
 * The webhook validates `x-hub-signature-256` using `WHATSAPP_APP_SECRET`
 * when set; local dev leaves it unset, so this spec only runs locally
 * (same convention as the sibling support-ticket spec).
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { tagTest } from './helpers/test-tags';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

let uniqueDigitsCounter = 0;
function uniqueDigits(): string {
  uniqueDigitsCounter += 1;
  return (
    String(Date.now()).slice(-8) +
    String(uniqueDigitsCounter % 10) +
    String(Math.floor(Math.random() * 10))
  );
}

function metaInboundPayload(opts: { from: string; body: string; id: string }) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '0',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550100000',
                phone_number_id: '0',
              },
              contacts: [
                {
                  profile: { name: 'E2E Customer' },
                  wa_id: opts.from,
                },
              ],
              messages: [
                {
                  from: opts.from,
                  id: opts.id,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: opts.body },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function postInbound(
  request: APIRequestContext,
  payload: unknown
): Promise<number> {
  const response = await request.post('/api/webhooks/whatsapp', {
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256':
        'sha256=0000000000000000000000000000000000000000000000000000000000000000',
    },
    data: payload,
  });
  return response.status();
}

async function readIncomingMessageByBody(body: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await client
      .db(dbName)
      .collection('incomingmessages')
      .findOne({ body });
  } finally {
    await client.close();
  }
}

async function seedOldAccount(opts: {
  phone: string;
  email: string;
}): Promise<string> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const result = await client.db(dbName).collection('users').insertOne({
      phone: opts.phone,
      email: opts.email,
      phoneVerified: true,
      lastLoginAt: new Date(),
      isGuest: false,
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return String(result.insertedId);
  } finally {
    await client.close();
  }
}

async function deleteUserByPhone(phone: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db(dbName).collection('users').deleteMany({ phone });
  } finally {
    await client.close();
  }
}

async function deleteIncomingMessagesByFrom(from: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db(dbName).collection('incomingmessages').deleteMany({ from });
  } finally {
    await client.close();
  }
}

test.describe('REQ-111 WhatsApp inbound → account-recovery routing', () => {
  const seededPhones: string[] = [];
  const seededIncomingFrom: string[] = [];

  test.afterEach(async () => {
    for (const phone of seededPhones) {
      await deleteUserByPhone(phone);
    }
    for (const from of seededIncomingFrom) {
      await deleteIncomingMessagesByFrom(from);
    }
    seededPhones.length = 0;
    seededIncomingFrom.length = 0;
  });

  test('AC1 — unrecognized phone + old account email in body → phone_mismatch, sent_account_recovery, userId resolves to old account', async ({
    request,
  }) => {
    tagTest('REQ-111', 1);

    test.skip(
      !!process.env.BASE_URL,
      'WhatsApp webhook signature requires server-secret knowledge; only runs against local dev where the secret is unset.'
    );

    const oldPhone = uniqueDigits();
    const newPhone = uniqueDigits();
    const email = `e2e-recovery-${Date.now()}@example.com`;
    seededPhones.push(oldPhone, newPhone);
    seededIncomingFrom.push(newPhone);

    const oldAccountId = await seedOldAccount({ phone: oldPhone, email });

    const body = `Hi it's ${email}, I lost my old phone, can you help?`;
    const messageId = `wamid.E2E-REQ111-AC1-${Date.now()}`;

    const status = await postInbound(
      request,
      metaInboundPayload({ from: newPhone, body, id: messageId })
    );
    expect(status).toBe(200);

    const incoming = await readIncomingMessageByBody(body);
    expect(incoming).toBeTruthy();
    expect(incoming?.classifiedState).toBe('phone_mismatch');
    expect(incoming?.actionTaken).toBe('sent_account_recovery');
    expect(incoming?.userId).toBe(oldAccountId);
    expect(incoming?.from).toBe(newPhone);
  });

  test('AC4 — brand-new phone, no identifying signal in body → unchanged "new" + sent_welcome_new_user (regression)', async ({
    request,
  }) => {
    tagTest('REQ-111', 4);

    test.skip(
      !!process.env.BASE_URL,
      'WhatsApp webhook signature requires server-secret knowledge; only runs against local dev where the secret is unset.'
    );

    const newPhone = uniqueDigits();
    seededIncomingFrom.push(newPhone);

    const body = 'hi';
    const messageId = `wamid.E2E-REQ111-AC4-${Date.now()}`;

    const status = await postInbound(
      request,
      metaInboundPayload({ from: newPhone, body, id: messageId })
    );
    expect(status).toBe(200);

    const incoming = await readIncomingMessageByBody(body);
    expect(incoming).toBeTruthy();
    expect(incoming?.classifiedState).toBe('new');
    expect(incoming?.actionTaken).toBe('sent_welcome_new_user');

    // This run auto-creates a User row for newPhone — clean it up too.
    seededPhones.push(newPhone);
  });
});
