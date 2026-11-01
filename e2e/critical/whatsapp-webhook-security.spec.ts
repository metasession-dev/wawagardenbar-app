/**
 * @requirement REQ-116 — WhatsApp webhook authenticity (AC2)
 *
 * Transport-layer spec: POSTs Meta-shaped payloads at the running server.
 * A request with a missing, malformed, wrong-length or wrongly-keyed
 * signature is rejected with 403 and stores nothing; a correctly signed one
 * is accepted. (AC1, the 503 when the app secret is unset, needs a server
 * without the secret and is proven in `__tests__/api/whatsapp-webhook-route.test.ts`.)
 */
import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import {
  metaInboundPayload,
  requireAppSecret,
  signWebhookBody,
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

async function countIncoming(messageId: string): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await client
      .db(dbName)
      .collection('incomingmessages')
      .countDocuments({ messageId });
  } finally {
    await client.close();
  }
}

async function deleteIncoming(messageIds: string[]) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client
      .db(dbName)
      .collection('incomingmessages')
      .deleteMany({ messageId: { $in: messageIds } });
  } finally {
    await client.close();
  }
}

const ids: string[] = [];
const wamid = (tag: string) => {
  const id = `wamid.E2E116SEC${tag}${Date.now()}${Math.floor(Math.random() * 1e4)}`;
  ids.push(id);
  return id;
};
const sender = () => '234' + String(Date.now()).slice(-10);

test.describe('[REQ-116] WhatsApp webhook authenticity', () => {
  test.afterAll(async () => {
    await deleteIncoming(ids);
  });

  const cases: Array<[string, (raw: string) => Record<string, string>]> = [
    ['missing', () => ({})],
    ['wrong prefix', () => ({ 'x-hub-signature-256': 'sha1=abcdef' })],
    ['wrong length', () => ({ 'x-hub-signature-256': 'sha256=abc' })],
    [
      'signed with another secret',
      (raw) => ({
        'x-hub-signature-256': signWebhookBody(raw, 'not-the-app-secret'),
      }),
    ],
  ];

  for (const [name, headers] of cases) {
    test(`[REQ-116][AC2] a ${name} signature is rejected with 403 and nothing is stored`, async ({
      request,
    }) => {
      tagTest('REQ-116', 2);
      const id = wamid('REJ');
      const raw = JSON.stringify(
        metaInboundPayload({ from: sender(), body: 'hello', id })
      );
      const response = await request.post('/api/webhooks/whatsapp', {
        headers: { 'content-type': 'application/json', ...headers(raw) },
        data: raw,
      });
      expect(response.status()).toBe(403);
      expect(await countIncoming(id)).toBe(0);
    });
  }

  test('[REQ-116][AC2] a correctly signed request is accepted and stored', async ({
    request,
  }) => {
    tagTest('REQ-116', 2);
    const id = wamid('OK');
    const raw = JSON.stringify(
      metaInboundPayload({ from: sender(), body: 'hello', id })
    );
    const response = await request.post('/api/webhooks/whatsapp', {
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signWebhookBody(raw, requireAppSecret()),
      },
      data: raw,
    });
    expect(response.status()).toBe(200);
    expect(await countIncoming(id)).toBe(1);
  });
});
