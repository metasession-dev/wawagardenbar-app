/**
 * @requirement REQ-064 — Support ticket model + WA-fed staff queue (#117 P3 #17)
 *
 * AC4 + AC5 — Staff queue + ticket detail + reply thread.
 *
 *   AC4: a seeded ticket appears in the queue with the correct status badge,
 *        source pill, subject, and customer contact.
 *   AC5: clicking a row opens the detail page rendering message + (empty)
 *        replies; CSR posts a reply → reply appears in the conversation
 *        thread; CSR changes status to `resolved` → status select updates.
 *
 * Seeds a ticket directly via Mongo so the test doesn't depend on the
 * customer-submit flow (which itself depends on a customer auth session,
 * blocked by the PIN-flow SMS-fatal constraint).
 *
 * Regression — exercises the full staff persistence path; smoke covers RBAC.
 *
 * @requirement REQ-064
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { csrTest, isAuthenticated } from './kitchen/helpers';
import { evidenceShot } from './helpers/evidence';
import { tagTest } from './helpers/test-tags';
import { pollForDoc } from './helpers/db-assertions';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

async function seedTicket(): Promise<{
  ticketId: string;
  ticketNumber: string;
}> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const tickets = client.db(dbName).collection('supporttickets');
    const ticketNumber = `TKT-E2E-${Date.now()}`;
    const now = new Date();
    const result = await tickets.insertOne({
      ticketNumber,
      userId: null,
      customerEmail: `e2e-customer-${Date.now()}@example.com`,
      customerPhone: null,
      source: 'web',
      category: 'order-issue',
      subject: 'E2E seeded ticket — staff flow',
      message:
        'Hello, my order this morning had a missing item. Please advise.',
      orderId: null,
      status: 'open',
      priority: 'normal',
      assignedTo: null,
      replies: [],
      createdAt: now,
      updatedAt: now,
    });
    return { ticketId: String(result.insertedId), ticketNumber };
  } finally {
    await client.close();
  }
}

async function deleteTicket(ticketId: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client
      .db(dbName)
      .collection('supporttickets')
      .deleteOne({ _id: new ObjectId(ticketId) });
  } finally {
    await client.close();
  }
}

async function readTicket(ticketId: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await client
      .db(dbName)
      .collection('supporttickets')
      .findOne({ _id: new ObjectId(ticketId) });
  } finally {
    await client.close();
  }
}

function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI)
    throw new Error(
      'Expected an authenticated CSR session in CI but none was present'
    );
  skip(
    true,
    'CSR session unavailable — run scripts/seed-e2e-admins.ts + set E2E_CSR_* (local only)'
  );
}

csrTest.describe('REQ-064 staff flow — queue → detail → reply → status', () => {
  let ticketId: string | null = null;

  csrTest.afterEach(async () => {
    if (ticketId) {
      await deleteTicket(ticketId);
      ticketId = null;
    }
  });

  csrTest(
    'AC4+AC5 — seeded ticket renders in queue, opens detail, accepts reply, status change persists',
    async ({ page }: { page: Page }) => {
      guard(csrTest.skip, await isAuthenticated(page));

      const seeded = await seedTicket();
      ticketId = seeded.ticketId;

      // AC4 — queue lists the seeded ticket
      await page.goto('/dashboard/support?status=open');
      await page.waitForLoadState('networkidle');

      const row = page.getByRole('row', {
        name: new RegExp(seeded.ticketNumber, 'i'),
      });
      await expect(row).toBeVisible({ timeout: 10000 });
      await expect(row).toContainText(/E2E seeded ticket/);
      await expect(row).toContainText(/Web/);
      await expect(row).toContainText(/Open/);

      await evidenceShot(page, 'REQ-064', 4, 'queue-shows-seeded-ticket');

      // AC5 — open detail
      await page.getByRole('link', { name: seeded.ticketNumber }).click();
      await page.waitForURL(/\/dashboard\/support\/[a-f0-9]+/i);
      // CardTitle renders as a <div>, not a heading element — match by text.
      await expect(
        page.getByText('E2E seeded ticket — staff flow').first()
      ).toBeVisible();
      await expect(page.getByText(/missing item/)).toBeVisible();

      // AC5 — post a reply
      const replyTextarea = page.getByPlaceholder(/type your reply/i);
      await replyTextarea.fill(
        'Apologies for the mix-up — our kitchen lead will refund the missing item shortly.'
      );
      await page.getByRole('button', { name: /send reply/i }).click();
      // Toast title + aria-live status region both contain "Reply sent" —
      // assert via the appended thread message (the reply body), which is
      // the AC-proving signal anyway.
      await expect(page.getByText(/missing item shortly/)).toBeVisible({
        timeout: 10000,
      });

      await evidenceShot(page, 'REQ-064', 5, 'reply-thread-staff-reply');

      // AC5 — change status to resolved
      const statusSelect = page.getByRole('combobox').first();
      await statusSelect.click();
      await page.getByRole('option', { name: /^resolved$/i }).click();

      // The action revalidates the route; verify the new state on the page.
      await expect(statusSelect).toContainText(/resolved/i, { timeout: 5000 });

      // `updateSupportStatusAction` fires inside startTransition (React 18+).
      // The trigger updates synchronously; the server roundtrip is async
      // and disables the combobox while in flight (`disabled={isPending}`
      // in the Select wrapper). `networkidle` is too coarse — it can
      // settle before the action's POST starts, so the DB read below
      // raced ahead and saw 'open'. Waiting for the combobox to become
      // re-enabled is the deterministic signal that the action's full
      // server roundtrip (including DB write + revalidatePath) is done.
      await expect(statusSelect).not.toBeDisabled({ timeout: 10000 });

      // DB-side verification: reply persisted + status flipped.
      const persisted = await readTicket(seeded.ticketId);
      expect(persisted?.status).toBe('resolved');
      expect(
        (persisted?.replies as Array<{ body: string }>)?.length
      ).toBeGreaterThanOrEqual(1);
      expect(
        (persisted?.replies as Array<{ body: string }>)?.[0]?.body
      ).toContain('missing item shortly');
    }
  );

  csrTest(
    '[US-01.3] AC2 — a staff reply logs support_reply with header [ticket no.] and 3 body params',
    async ({ page }: { page: Page }) => {
      tagTest('REQ-115', 2);
      guard(csrTest.skip, await isAuthenticated(page));

      // A ticket that belongs to a customer, so the reply is notified.
      // CI runs with ENABLE_WHATSAPP_NOTIFICATIONS=false: the WhatsApp send
      // short-circuits, but NotificationService still records the template
      // key and the exact parameters in NotificationLog (Level 1).
      const { uri, dbName } = mongoConn();
      const client = new MongoClient(uri);
      let customerId: string | null = null;
      const replyText = 'We have added a replacement to your account.';
      try {
        await client.connect();
        const db = client.db(dbName);
        const user = await db.collection('users').insertOne({
          phone: `+234${String(Date.now()).slice(-9)}0`,
          firstName: 'Ada',
          phoneVerified: true,
          isGuest: false,
          accountStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        customerId = String(user.insertedId);

        const ticketNumber = `TKT-E2E-${Date.now()}`;
        const now = new Date();
        const ticket = await db.collection('supporttickets').insertOne({
          ticketNumber,
          userId: customerId,
          customerEmail: null,
          customerPhone: null,
          source: 'web',
          category: 'order-issue',
          subject: 'Missing item in order',
          message: 'My order had a missing item.',
          orderId: null,
          status: 'open',
          priority: 'normal',
          assignedTo: null,
          replies: [],
          createdAt: now,
          updatedAt: now,
        });
        ticketId = String(ticket.insertedId);

        await page.goto(`/dashboard/support/${ticketId}`);
        await page.getByPlaceholder(/type your reply/i).fill(replyText);
        await page.getByRole('button', { name: /send reply/i }).click();
        await expect(page.getByText(replyText)).toBeVisible({ timeout: 10000 });
        await evidenceShot(page, 'REQ-115', 2, 'support-reply-sent');

        const log = await pollForDoc<{
          channel: string;
          templateParams: { header: string[]; body: string[] };
        }>(
          'notificationlogs',
          {
            userId: customerId,
            templateKey: 'support_reply',
            channel: 'whatsapp',
          },
          { timeoutMs: 10000 }
        );
        expect(log, 'a support_reply NotificationLog row').toBeTruthy();
        expect(log!.channel).toBe('whatsapp');
        expect(log!.templateParams.header).toEqual([ticketNumber]);
        expect(log!.templateParams.body).toEqual([
          'Ada',
          'Missing item in order',
          replyText,
        ]);
      } finally {
        if (customerId) {
          await client
            .db(dbName)
            .collection('notificationlogs')
            .deleteMany({ userId: customerId });
          await client
            .db(dbName)
            .collection('users')
            .deleteOne({ _id: new ObjectId(customerId) });
        }
        await client.close();
      }
    }
  );
});
