/**
 * @requirement REQ-064 — Support ticket model + WA-fed staff queue (#117 P3 #17)
 *
 * AC3 — REQ-056's WhatsApp inbound bridge: a `support_text`-classifying
 * inbound message arriving at `/api/webhooks/whatsapp` auto-creates a
 * SupportTicket via `SupportTicketService.createFromWhatsAppInbound`.
 *
 * The webhook handler skips signature verification when
 * `WHATSAPP_APP_SECRET` is unset (a local-only convenience that the
 * production env ALWAYS has set). E2E env doesn't set the secret, so
 * the test POSTs a real Meta-shaped payload and asserts the side-effect.
 *
 * Verifies: ticket persists with source=`whatsapp`, category=`whatsapp-inbound`,
 * subject = body preview, customerPhone = the inbound `from` number, and
 * the row appears in the staff queue under the `whatsapp` source filter.
 *
 * Regression — exercises a cross-system path that's only fully proven end-to-end.
 *
 * @requirement REQ-064
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { csrTest, isAuthenticated } from './kitchen/helpers';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

function uniqueDigits(): string {
  return String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 10));
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

async function readTicketByMessage(message: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await client
      .db(dbName)
      .collection('supporttickets')
      .findOne({ message });
  } finally {
    await client.close();
  }
}

async function deleteTicketsByPhone(phone: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client
      .db(dbName)
      .collection('supporttickets')
      .deleteMany({ customerPhone: phone });
  } finally {
    await client.close();
  }
}

async function postInbound(
  request: APIRequestContext,
  payload: unknown
): Promise<number> {
  // Use a known-bad signature; the route skips verification when
  // WHATSAPP_APP_SECRET is unset in test env.
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

function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI)
    throw new Error('Expected an authenticated CSR session in CI');
  skip(true, 'CSR session unavailable (local only)');
}

csrTest.describe('REQ-064 WhatsApp inbound → support ticket bridge', () => {
  let phone: string | null = null;

  csrTest.afterEach(async () => {
    if (phone) {
      await deleteTicketsByPhone(phone);
      phone = null;
    }
  });

  csrTest(
    'AC3 — inbound support_text creates a SupportTicket and surfaces in the staff queue',
    async ({ page, request }) => {
      // The webhook validates `x-hub-signature-256` server-side using
      // `WHATSAPP_APP_SECRET` — when set (the prod-shape configuration that
      // UAT mirrors), the test can't fake a valid signature without knowing
      // the server's secret. The local convenience of "skip-when-unset"
      // means this E2E only runs against a target whose secret is unset
      // (local dev). The bridge logic itself is covered by the unit test
      // in `__tests__/services/whatsapp-inbound.support-ticket.test.ts`.
      csrTest.skip(
        !!process.env.BASE_URL,
        'WhatsApp webhook signature requires server-secret knowledge; only runs against local dev where the secret is unset.'
      );

      guard(csrTest.skip, await isAuthenticated(page));

      phone = uniqueDigits();
      const body =
        'Hi, I think the delivery I got an hour ago was missing the sides, can someone check please?';
      const messageId = `wamid.E2E-${Date.now()}`;

      const status = await postInbound(
        request,
        metaInboundPayload({ from: phone, body, id: messageId })
      );
      expect(status).toBe(200);

      // The inbound handler does its work synchronously per the existing
      // service contract; the ticket should be visible immediately.
      const ticket = await readTicketByMessage(body);
      expect(ticket).toBeTruthy();
      expect(ticket?.source).toBe('whatsapp');
      expect(ticket?.category).toBe('whatsapp-inbound');
      expect(ticket?.customerPhone).toBe(phone);
      // Subject is the body preview — short bodies pass through verbatim.
      // Long bodies get sliced to 60 chars + ellipsis.
      const subject = ticket?.subject as string;
      expect(subject.length).toBeLessThanOrEqual(60);
      expect(body).toContain(subject.replace(/\.\.\.$/, ''));

      // Visible in the staff queue under the whatsapp filter.
      await page.goto('/dashboard/support?source=whatsapp&status=all');
      await page.waitForLoadState('networkidle');
      const row = page.getByRole('row', {
        name: new RegExp(ticket?.ticketNumber as string, 'i'),
      });
      await expect(row).toBeVisible({ timeout: 10000 });
      await expect(row).toContainText(/WhatsApp/);
    }
  );
});
