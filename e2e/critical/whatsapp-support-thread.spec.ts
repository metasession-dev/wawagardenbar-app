/**
 * @requirement REQ-118 — WhatsApp support: one thread per customer, a reply
 * mode chosen by the 24-hour window, and the human-handoff SLA (WA-10).
 *
 * Drives the signed webhook (`WHATSAPP_APP_SECRET`, fail-closed since
 * REQ-116) and the staff UI. WhatsApp sends are disabled in the e2e
 * environment: `NotificationService` still records each attempt in
 * `NotificationLog` with the mode and exact parameters, which is what the
 * reply-mode assertions read. The live send of both modes is the UAT
 * round-trip (REQ-118 AC4 is an operator task).
 *
 * Every spec creates its own customer and rows and removes them afterwards
 * (the support queue and NotificationLog are shared).
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { randomInt, randomUUID } from 'crypto';
import { csrTest, isAuthenticated } from '../kitchen/helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { pollForDoc } from '../helpers/db-assertions';
import {
  metaInboundPayload,
  postSignedWebhook,
} from '../helpers/whatsapp-webhook';

const HOUR = 60 * 60 * 1000;

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

// Unique across parallel workers: the clock alone can repeat in the same
// millisecond, and a repeated wamid is dropped as a duplicate delivery.
function uniqueDigits(): string {
  return '234' + String(randomInt(0, 1e10)).padStart(10, '0');
}

function wamid(): string {
  return `wamid.E2E-118-${randomUUID()}`;
}

/** An `active` customer, the state in which an inbound message becomes a ticket. */
async function seedActiveCustomer(phone: string): Promise<string> {
  return withDb(async (db) => {
    const result = await db.collection('users').insertOne({
      phone,
      firstName: 'Ada',
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

async function ticketsForPhone(phone: string) {
  return withDb((db) =>
    db
      .collection('supporttickets')
      .find({ customerPhone: phone })
      .sort({ createdAt: 1 })
      .toArray()
  );
}

async function cleanup(phone: string, userId: string | null) {
  await withDb(async (db) => {
    await db.collection('supporttickets').deleteMany({ customerPhone: phone });
    await db.collection('incomingmessages').deleteMany({ from: phone });
    if (userId) {
      await db.collection('notificationlogs').deleteMany({ userId });
      await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    }
  });
}

function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI)
    throw new Error('Expected an authenticated CSR session in CI');
  skip(true, 'CSR session unavailable (local only)');
}

async function send(
  request: APIRequestContext,
  phone: string,
  body: string,
  extra: { type?: 'text' | 'interactive'; buttonPayload?: string } = {}
) {
  const status = await postSignedWebhook(
    request,
    metaInboundPayload({ from: phone, body, id: wamid(), ...extra })
  );
  expect(status).toBe(200);
}

test.describe('[REQ-118] WhatsApp support thread, reply mode and handoff', () => {
  let phone: string | null = null;
  let userId: string | null = null;

  csrTest.afterEach(async () => {
    if (phone) await cleanup(phone, userId);
    phone = null;
    userId = null;
  });

  csrTest(
    '[REQ-118][AC1] further messages append to the one open ticket; a resolved ticket reopens within 72 hours and a new one starts after (US-A4.7)',
    async ({ page, request }: { page: Page; request: APIRequestContext }) => {
      tagTest('REQ-118', 1);
      guard(csrTest.skip, await isAuthenticated(page));
      phone = uniqueDigits();
      userId = await seedActiveCustomer(phone);

      await send(request, phone, 'My order is missing the sides');
      await send(request, phone, 'It was about an hour ago');
      await send(request, phone, 'Order number is 4821');

      const [thread, ...rest] = await ticketsForPhone(phone);
      expect(rest, 'no second ticket while one is open').toHaveLength(0);
      const replies = thread.replies as Array<{
        authorRole: string;
        body: string;
      }>;
      expect(replies.map((r) => r.authorRole)).toEqual([
        'customer',
        'customer',
      ]);
      expect(replies.map((r) => r.body)).toEqual([
        'It was about an hour ago',
        'Order number is 4821',
      ]);

      await page.goto('/dashboard/support?source=whatsapp&status=all');
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByRole('row', { name: new RegExp(thread.ticketNumber, 'i') })
      ).toHaveCount(1);
      await evidenceShot(page, 'REQ-118', 1, 'one-ticket-three-messages');

      // Resolved an hour ago: the customer's next message reopens it.
      await withDb((db) =>
        db.collection('supporttickets').updateOne(
          { _id: thread._id },
          {
            $set: {
              status: 'resolved',
              resolvedAt: new Date(Date.now() - HOUR),
            },
          }
        )
      );
      await send(request, phone, 'Actually it is still not sorted');
      const afterReopen = await ticketsForPhone(phone);
      expect(afterReopen).toHaveLength(1);
      expect(afterReopen[0].status).toBe('open');

      // Resolved four days ago: outside the 72 hours, so a new ticket starts.
      await withDb((db) =>
        db.collection('supporttickets').updateOne(
          { _id: thread._id },
          {
            $set: {
              status: 'resolved',
              resolvedAt: new Date(Date.now() - 96 * HOUR),
            },
          }
        )
      );
      await send(request, phone, 'A different question about my booking');
      const afterLate = await ticketsForPhone(phone);
      expect(afterLate).toHaveLength(2);
      expect(afterLate[0].status).toBe('resolved');
      expect(afterLate[1].status).toBe('open');
    }
  );

  csrTest(
    '[REQ-118][AC2] a reply inside the 24-hour window is sent as a free message (US-B4.1)',
    async ({ page, request }: { page: Page; request: APIRequestContext }) => {
      tagTest('REQ-118', 2);
      guard(csrTest.skip, await isAuthenticated(page));
      phone = uniqueDigits();
      userId = await seedActiveCustomer(phone);
      const replyText = 'Sorry about that, a rider is bringing the sides now.';

      await send(request, phone, 'Where are my sides?');
      const [ticket] = await ticketsForPhone(phone);

      await page.goto(`/dashboard/support/${String(ticket._id)}`);
      const mode = page.getByTestId('reply-mode');
      await expect(mode).toHaveAttribute('data-mode', 'free_form');
      await expect(mode).toContainText('Free message');
      await evidenceShot(page, 'REQ-118', 2, 'reply-mode-free-message');

      await page.getByPlaceholder(/type your reply/i).fill(replyText);
      await page.getByRole('button', { name: /send reply/i }).click();
      await expect(page.getByText(replyText)).toBeVisible({ timeout: 10000 });

      const log = await pollForDoc<{
        templateParams: { header: string[]; body: string[]; mode?: string };
      }>(
        'notificationlogs',
        { userId, templateKey: 'support_reply', channel: 'whatsapp' },
        { timeoutMs: 10000 }
      );
      expect(log, 'a support_reply NotificationLog row').toBeTruthy();
      expect(log!.templateParams.mode).toBe('text');
      expect(log!.templateParams.body).toEqual([replyText]);
    }
  );

  csrTest(
    '[REQ-118][AC2] a reply after two days uses the support_reply template with the ticket number and three body parameters (US-B4.2)',
    async ({ page, request }: { page: Page; request: APIRequestContext }) => {
      tagTest('REQ-118', 2);
      guard(csrTest.skip, await isAuthenticated(page));
      phone = uniqueDigits();
      userId = await seedActiveCustomer(phone);
      const replyText = 'Your refund has been processed.';

      await send(request, phone, 'Please refund the missing sides');
      const [ticket] = await ticketsForPhone(phone);

      // The customer last wrote two days ago, outside the window.
      const twoDaysAgo = new Date(Date.now() - 48 * HOUR);
      await withDb(async (db) => {
        await db
          .collection('incomingmessages')
          .updateMany({ from: phone }, { $set: { receivedAt: twoDaysAgo } });
        await db
          .collection('supporttickets')
          .updateOne(
            { _id: ticket._id },
            { $set: { lastCustomerMessageAt: twoDaysAgo } }
          );
      });

      await page.goto(`/dashboard/support/${String(ticket._id)}`);
      const mode = page.getByTestId('reply-mode');
      await expect(mode).toHaveAttribute('data-mode', 'template');
      await expect(mode).toContainText(/Template message/);
      await evidenceShot(page, 'REQ-118', 2, 'reply-mode-template-message');

      await page.getByPlaceholder(/type your reply/i).fill(replyText);
      await page.getByRole('button', { name: /send reply/i }).click();
      await expect(page.getByText(replyText)).toBeVisible({ timeout: 10000 });

      const log = await pollForDoc<{
        templateParams: { header: string[]; body: string[]; mode?: string };
      }>(
        'notificationlogs',
        { userId, templateKey: 'support_reply', channel: 'whatsapp' },
        { timeoutMs: 10000 }
      );
      expect(log, 'a support_reply NotificationLog row').toBeTruthy();
      expect(log!.templateParams.mode).toBe('template');
      expect(log!.templateParams.header).toEqual([ticket.ticketNumber]);
      expect(log!.templateParams.body).toEqual([
        'Ada',
        ticket.subject,
        replyText,
      ]);
    }
  );

  csrTest(
    '[REQ-118][AC3] "Chat with staff" makes the ticket urgent with a 15-minute SLA and ranks it above ordinary tickets (US-A4.8)',
    async ({ page, request }: { page: Page; request: APIRequestContext }) => {
      tagTest('REQ-118', 3);
      guard(csrTest.skip, await isAuthenticated(page));
      phone = uniqueDigits();
      userId = await seedActiveCustomer(phone);

      // An ordinary ticket with no SLA, to compare the ordering against.
      const ordinaryNumber = `TKT-E2E-118-${Date.now()}`;
      await withDb((db) =>
        db.collection('supporttickets').insertOne({
          ticketNumber: ordinaryNumber,
          userId: null,
          customerEmail: 'e2e-118@example.com',
          customerPhone: `ordinary-${phone}`,
          source: 'web',
          category: 'order-issue',
          subject: 'E2E ordinary ticket',
          message: 'Ordinary',
          orderId: null,
          status: 'open',
          priority: 'normal',
          assignedTo: null,
          replies: [],
          createdAt: new Date(Date.now() - 2 * HOUR),
          updatedAt: new Date(Date.now() - 2 * HOUR),
        })
      );

      try {
        const before = Date.now();
        await send(request, phone, 'Chat with staff', {
          type: 'interactive',
          buttonPayload: 'chat_with_staff',
        });

        const [ticket] = await ticketsForPhone(phone);
        expect(ticket, 'a ticket for the handoff').toBeTruthy();
        expect(ticket.priority).toBe('urgent');
        const dueInMs = new Date(ticket.slaDueAt as Date).getTime() - before;
        expect(dueInMs).toBeGreaterThan(14 * 60_000);
        expect(dueInMs).toBeLessThan(16 * 60_000);

        await page.goto('/dashboard/support?status=all');
        await page.waitForLoadState('networkidle');
        const rows = page.getByTestId('support-ticket-row');
        const urgentRow = rows.filter({ hasText: ticket.ticketNumber });
        await expect(urgentRow).toBeVisible({ timeout: 10000 });
        await expect(urgentRow).toContainText('Urgent');
        await expect(urgentRow).toContainText(/due in/i);
        await evidenceShot(page, 'REQ-118', 3, 'urgent-ticket-with-sla');

        const order = await rows.evaluateAll(
          (els, numbers) =>
            numbers.map((n) =>
              els.findIndex((el) => el.textContent?.includes(n))
            ),
          [ticket.ticketNumber, ordinaryNumber]
        );
        expect(order[0], 'urgent ticket is listed').toBeGreaterThanOrEqual(0);
        expect(order[1], 'ordinary ticket is listed').toBeGreaterThanOrEqual(0);
        expect(order[0]).toBeLessThan(order[1]);

        // A staff reply stops the clock.
        await page.goto(`/dashboard/support/${String(ticket._id)}`);
        await page.getByPlaceholder(/type your reply/i).fill('On it now.');
        await page.getByRole('button', { name: /send reply/i }).click();
        await expect(page.getByText('On it now.')).toBeVisible({
          timeout: 10000,
        });
        await expect
          .poll(
            async () => (await ticketsForPhone(phone!))[0]?.slaDueAt ?? null,
            {
              timeout: 10000,
            }
          )
          .toBeNull();
      } finally {
        await withDb((db) =>
          db
            .collection('supporttickets')
            .deleteMany({ ticketNumber: ordinaryNumber })
        );
      }
    }
  );
});
