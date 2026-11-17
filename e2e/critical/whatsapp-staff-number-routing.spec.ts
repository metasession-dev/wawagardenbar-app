/**
 * @requirement REQ-122 - Verified staff numbers are not customers (AC8)
 * @srs REQ-WA-015, REQ-WA-005
 *
 * Transport-layer spec (no `page`): signed Meta webhooks to the running app.
 * A message from a staff member's verified alert number creates no support
 * ticket, no welcome and no customer account; an unverified number, or any
 * other sender, is routed as a customer exactly as before. WhatsApp itself is
 * off in this environment, so the asserted behaviour is the persisted routing
 * outcome on the IncomingMessage row and the absence of customer records.
 */
import { test, expect } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { withMongo } from '../helpers/db-assertions';
import {
  metaInboundPayload,
  postSignedWebhook,
} from '../helpers/whatsapp-webhook';
import {
  createStaff,
  deleteStaff,
  type ThrowawayStaff,
} from '../helpers/staff-roles';

const staff: ThrowawayStaff[] = [];
const phones: string[] = [];
const unique = (prefix: string) =>
  `${prefix}${Date.now()}${Math.floor(Math.random() * 1e4)}`;
/** 234 + 10 digits, as Meta sends it (no plus). */
function newDigits(): string {
  const d = `234805${String(Date.now()).slice(-7)}${Math.floor(Math.random() * 10)}`;
  phones.push(d);
  return d;
}

test.afterAll(async () => {
  await deleteStaff(...staff.map((s) => s.id));
  await withMongo(async (db) => {
    for (const digits of phones) {
      const variants = [digits, `+${digits}`, `0${digits.slice(3)}`];
      await db
        .collection('incomingmessages')
        .deleteMany({ from: { $in: variants } });
      await db
        .collection('supporttickets')
        .deleteMany({ customerPhone: { $in: variants } });
      await db.collection('users').deleteMany({ phone: { $in: variants } });
    }
  });
});

async function staffWithAlertNumber(digits: string, verified: boolean) {
  const member = await createStaff('route', ['csr']);
  staff.push(member);
  await withMongo(async (db) => {
    await db.collection('users').updateOne(
      { _id: new ObjectId(member.id) },
      {
        $set: {
          alertPhone: `+${digits}`,
          alertPhoneVerified: verified,
          alertsEnabled: true,
          ...(verified ? { alertConsentAt: new Date() } : {}),
        },
      }
    );
  });
  return member;
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

async function customerRecords(digits: string) {
  const variants = [digits, `+${digits}`, `0${digits.slice(3)}`];
  return withMongo(async (db) => ({
    tickets: await db
      .collection('supporttickets')
      .countDocuments({ customerPhone: { $in: variants } }),
    users: await db.collection('users').countDocuments({
      phone: { $in: variants },
      role: 'customer',
    }),
  }));
}

test.describe('[REQ-122] WhatsApp routing of staff numbers', () => {
  test('[REQ-122][AC8] [US-B5.11] a message from a verified staff alert number creates no ticket, welcome or customer account', async ({
    request,
  }) => {
    tagTest('REQ-122', 8);
    const digits = newDigits();
    await staffWithAlertNumber(digits, true);
    const messageId = `wamid.${unique('staff')}`;

    const status = await postSignedWebhook(
      request,
      metaInboundPayload({
        from: digits,
        id: messageId,
        body: 'Hello, is anyone there?',
      })
    );
    expect(status).toBe(200);

    const row = await incoming(messageId);
    expect(row).not.toBeNull();
    // Routed as staff: one fixed reply, nothing else.
    expect(row?.actionTaken).toBe('staff_number_ack');
    expect(row?.userId ?? null).toBeNull();
    expect(await customerRecords(digits)).toEqual({ tickets: 0, users: 0 });
  });

  test('[REQ-122][AC8] a number that is saved but not yet verified is still routed as a customer', async ({
    request,
  }) => {
    tagTest('REQ-122', 8);
    const digits = newDigits();
    await staffWithAlertNumber(digits, false);
    const messageId = `wamid.${unique('unv')}`;

    const status = await postSignedWebhook(
      request,
      metaInboundPayload({
        from: digits,
        id: messageId,
        body: 'my order is late',
      })
    );
    expect(status).toBe(200);
    const row = await incoming(messageId);
    expect(row).not.toBeNull();
    expect(row?.actionTaken).not.toBe('staff_number_ack');
    // Handled by the customer pipeline (an account and/or a ticket now exists).
    const records = await customerRecords(digits);
    expect(records.users + records.tickets).toBeGreaterThan(0);
  });

  test('[REQ-122][AC8] an ordinary customer message is routed exactly as before', async ({
    request,
  }) => {
    tagTest('REQ-122', 8);
    const digits = newDigits();
    const messageId = `wamid.${unique('cust')}`;
    await postSignedWebhook(
      request,
      metaInboundPayload({
        from: digits,
        id: messageId,
        body: 'what time do you open?',
      })
    );
    const row = await incoming(messageId);
    expect(row).not.toBeNull();
    expect(row?.actionTaken).not.toBe('staff_number_ack');
    expect(row?.classifiedState).toBe('new');
  });
});
