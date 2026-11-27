/**
 * @requirement REQ-129 — WA-13: a booking message on WhatsApp gets the /book link
 * @srs REQ-WA-020
 *
 * Transport-layer spec (no `page`): a signed Meta webhook is posted and the
 * persisted `IncomingMessage` (intent and action taken) is the assertion
 * surface. CI runs with ENABLE_WHATSAPP_NOTIFICATIONS=false, so the reply is
 * attempted and recorded as sent or failed, never delivered. Ordering,
 * cancelling and status enquiries keep priority, and a long complaint that
 * mentions a table is still support text.
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import { withMongo } from '../helpers/db-assertions';
import {
  cleanupSeededCustomer,
  seedVerifiedCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  metaInboundPayload,
  postSignedWebhook,
} from '../helpers/whatsapp-webhook';

let counter = 0;
function newDigits(): string {
  counter += 1;
  return (
    '234' +
    String(Date.now()).slice(-8) +
    String(counter % 10) +
    String(Math.floor(Math.random() * 10))
  );
}

async function incoming(messageId: string) {
  for (let i = 0; i < 40; i++) {
    const row = await withMongo(async (db) =>
      db.collection('incomingmessages').findOne({ messageId })
    );
    if (row && row.actionTaken && row.actionTaken !== 'processing') return row;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function ticketsFor(digits: string) {
  return withMongo(async (db) =>
    db.collection('supporttickets').countDocuments({
      customerPhone: { $in: [digits, `+${digits}`] },
    })
  );
}

test.describe('[REQ-129] WhatsApp booking intent', () => {
  const customers: SeededCustomerForSession[] = [];
  const digitsUsed: string[] = [];

  test.afterAll(async () => {
    for (const c of customers) await cleanupSeededCustomer(c);
    await withMongo(async (db) => {
      for (const d of digitsUsed) {
        await db
          .collection('supporttickets')
          .deleteMany({ customerPhone: { $in: [d, `+${d}`] } });
        await db.collection('incomingmessages').deleteMany({ from: d });
      }
    });
  });

  async function send(request: any, body: string) {
    const digits = newDigits();
    digitsUsed.push(digits);
    customers.push(await seedVerifiedCustomer({ phone: `+${digits}` }));
    const messageId = `wamid.E2E-REQ129-${Date.now()}-${counter}`;
    const status = await postSignedWebhook(
      request,
      metaInboundPayload({ from: digits, id: messageId, body })
    );
    expect(status).toBe(200);
    const row = await incoming(messageId);
    expect(row, 'the incoming message should be recorded').not.toBeNull();
    return { row: row!, digits };
  }

  test('[REQ-129][AC3] [US-A5.7] "I want to book a table" is answered with the /book link and opens no ticket', async ({
    request,
  }) => {
    tagTest('REQ-129', 3);
    const { row, digits } = await send(request, 'I want to book a table');
    expect(row.classifiedIntent).toBe('booking');
    // WhatsApp is off in CI, so the reply is recorded as failed, not sent.
    expect(row.actionTaken).toMatch(/^booking_link_(sent|failed:[A-Z_]+)$/);
    expect(await ticketsFor(digits)).toBe(0);
  });

  test.describe('other words keep their own intent', () => {
    for (const [body, intent] of [
      ['Reservation please', 'booking'],
      ['planning a birthday party', 'booking'],
      ['where is my order', 'order_status'],
      ['order', 'order_start'],
    ] as const) {
      test(`[REQ-129][AC3] "${body}" is ${intent}`, async ({ request }) => {
        tagTest('REQ-129', 3);
        const { row } = await send(request, body);
        expect(row.classifiedIntent).toBe(intent);
      });
    }
  });

  test('[REQ-129][AC3] a long complaint that mentions a table is support text and still opens a ticket', async ({
    request,
  }) => {
    tagTest('REQ-129', 3);
    const { row, digits } = await send(
      request,
      'The table we were given yesterday was wobbly and the waiter ignored us for most of the evening'
    );
    expect(row.classifiedIntent).toBe('support_text');
    expect(row.actionTaken).not.toMatch(/^booking_link/);
    expect(await ticketsFor(digits)).toBeGreaterThanOrEqual(1);
  });
});
