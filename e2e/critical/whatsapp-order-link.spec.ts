/**
 * @requirement REQ-126 — WhatsApp "order" gets the menu link (WA-16, #1084)
 * @srs REQ-WA-017, REQ-WA-005
 *
 * All orders are made in the app. A short message asking to order is answered
 * with the menu link in every customer state, creates no ticket and starts no
 * ordering in WhatsApp; a message that merely mentions an order ("my order is
 * late") is still ordinary support text.
 *
 * WhatsApp sends are off in the e2e environment and a direct reply is not
 * logged to NotificationLog, so the specs read what the router recorded on the
 * `IncomingMessage` row (the intent and the outcome tag) and that no ticket was
 * opened. The link text itself (environment `/menu` URL) is covered by the unit
 * test `__tests__/services/whatsapp-inbound-intents.test.ts`; the live reply is
 * the UAT round-trip.
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import {
  cleanupCustomer,
  incomingRow,
  seedActiveCustomer,
  sendInbound,
  ticketsFor,
  type ActiveCustomer,
} from '../helpers/whatsapp-inbound-seed';

test.describe('[REQ-126] WhatsApp order request', () => {
  let customer: ActiveCustomer | null = null;

  test.afterEach(async () => {
    if (customer) await cleanupCustomer(customer);
    customer = null;
  });

  test('[REQ-126][AC1] [US-A3.1] "order" is answered with the menu link: classified order_start, link reply attempted, no ticket', async ({
    request,
  }) => {
    tagTest('REQ-126', 1);
    customer = await seedActiveCustomer();
    const id = await sendInbound(request, customer.phone, 'order');
    const row = await incomingRow(id);
    expect(row.classifiedIntent).toBe('order_start');
    // The reply is attempted (and its outcome tagged); WhatsApp is off in CI.
    expect(row.actionTaken).toMatch(/^order_link_(sent|failed)/);
    expect(await ticketsFor(customer.phone)).toHaveLength(0);
  });

  test('[REQ-126][AC1] [US-A3.1] "Menu please" and "food" are order requests too', async ({
    request,
  }) => {
    tagTest('REQ-126', 1);
    customer = await seedActiveCustomer();
    for (const text of ['Menu please', 'food']) {
      const id = await sendInbound(request, customer.phone, text);
      const row = await incomingRow(id);
      expect(row.classifiedIntent, text).toBe('order_start');
    }
    expect(await ticketsFor(customer.phone)).toHaveLength(0);
  });

  test('[REQ-126][AC5] [US-A3.2] a customer who has opted out of marketing still gets the order link (it answers a message they just sent)', async ({
    request,
  }) => {
    tagTest('REQ-126', 5);
    customer = await seedActiveCustomer({ optedOut: true });
    const id = await sendInbound(request, customer.phone, 'order');
    const row = await incomingRow(id);
    expect(row.classifiedIntent).toBe('order_start');
    expect(row.actionTaken).toMatch(/^order_link_(sent|failed)/);
    expect(await ticketsFor(customer.phone)).toHaveLength(0);
  });

  test('[REQ-126][AC5] [US-A3.3] "my order is late" is ordinary support text: a normal ticket, not an order link', async ({
    request,
  }) => {
    tagTest('REQ-126', 5);
    customer = await seedActiveCustomer();
    const id = await sendInbound(request, customer.phone, 'my order is late');
    const row = await incomingRow(id);
    expect(row.classifiedIntent).toBe('support_text');
    const tickets = await ticketsFor(customer.phone);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].priority).not.toBe('urgent');
  });
});
