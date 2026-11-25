/**
 * @requirement REQ-126 — helpers for the WhatsApp order-link and status-enquiry
 * specs: an `active` customer (the state in which an inbound message is routed
 * rather than welcomed), a signed inbound message, and reads of what the router
 * recorded. Transport-layer helper: no `page` object.
 */
import { randomInt, randomUUID } from 'crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { withMongo } from './db-assertions';
import { metaInboundPayload, postSignedWebhook } from './whatsapp-webhook';

export function uniqueDigits(): string {
  return '234' + String(randomInt(0, 1e10)).padStart(10, '0');
}

export interface ActiveCustomer {
  phone: string;
  userId: string;
}

/** An `active` customer; `optedOut` clears marketing consent (what STOP does). */
export async function seedActiveCustomer(
  opts: { optedOut?: boolean } = {}
): Promise<ActiveCustomer> {
  const phone = uniqueDigits();
  const userId = await withMongo(async (db) => {
    const result = await db.collection('users').insertOne({
      phone,
      firstName: 'Ada',
      phoneVerified: true,
      lastLoginAt: new Date(),
      isGuest: false,
      accountStatus: 'active',
      ...(opts.optedOut
        ? {
            preferences: {
              communicationPreferences: {
                whatsappTransactional: true,
                whatsappMarketing: false,
              },
            },
          }
        : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return String(result.insertedId);
  });
  return { phone, userId };
}

export async function cleanupCustomer(customer: ActiveCustomer): Promise<void> {
  await withMongo(async (db) => {
    const tickets = await db
      .collection('supporttickets')
      .find({ customerPhone: customer.phone })
      .project({ _id: 1 })
      .toArray();
    await db
      .collection('staffnotifications')
      .deleteMany({ refId: { $in: tickets.map((t: any) => String(t._id)) } });
    await db
      .collection('supporttickets')
      .deleteMany({ customerPhone: customer.phone });
    await db
      .collection('incomingmessages')
      .deleteMany({ from: customer.phone });
    await db
      .collection('notificationlogs')
      .deleteMany({ userId: customer.userId });
    await db
      .collection('users')
      .deleteOne({ _id: new ObjectId(customer.userId) });
  });
}

/** Send one signed inbound text; returns its wamid. */
export async function sendInbound(
  request: APIRequestContext,
  phone: string,
  body: string
): Promise<string> {
  const id = `wamid.E2E-126-${randomUUID()}`;
  const status = await postSignedWebhook(
    request,
    metaInboundPayload({ from: phone, body, id })
  );
  expect(status).toBe(200);
  return id;
}

/** The audit row for a message, once the router has finished with it. */
export async function incomingRow(messageId: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let row: any = null;
  while (Date.now() < deadline) {
    row = await withMongo((db) =>
      db.collection('incomingmessages').findOne({ messageId })
    );
    if (row && row.actionTaken !== 'processing') return row;
    await new Promise((r) => setTimeout(r, 250));
  }
  return row;
}

export async function ticketsFor(phone: string): Promise<any[]> {
  return withMongo((db) =>
    db
      .collection('supporttickets')
      .find({ customerPhone: phone })
      .sort({ createdAt: 1 })
      .toArray()
  );
}

export async function staffAlertsForTicket(ticketId: string): Promise<any[]> {
  return withMongo((db) =>
    db
      .collection('staffnotifications')
      .find({ refModel: 'SupportTicket', refId: ticketId })
      .toArray()
  );
}
