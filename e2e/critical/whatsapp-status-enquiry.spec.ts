/**
 * @requirement REQ-126 — order-status enquiry raises an urgent ticket (WA-16, #1084)
 * @srs REQ-WA-018, REQ-WA-013
 *
 * "status", "where is my order" or an order number never gets order data by
 * text. It opens an urgent support ticket (or raises the open one), sends a
 * short acknowledgement and alerts staff through the support alert rule with an
 * "Order status enquiry" title.
 *
 * WhatsApp sends are off in the e2e environment, so the acknowledgement is
 * checked through the recorded outcome and, for its text, the unit tests
 * (`__tests__/services/whatsapp-inbound-order-status.test.ts`); here the
 * assertions are the ticket and the staff alert the router produced.
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import {
  cleanupCustomer,
  incomingRow,
  seedActiveCustomer,
  sendInbound,
  staffAlertsForTicket,
  ticketsFor,
  type ActiveCustomer,
} from '../helpers/whatsapp-inbound-seed';

test.describe('[REQ-126] WhatsApp order-status enquiry', () => {
  let customer: ActiveCustomer | null = null;

  test.afterEach(async () => {
    if (customer) await cleanupCustomer(customer);
    customer = null;
  });

  test('[REQ-126][AC2][AC4] [US-A4.5] "status" opens one urgent ticket tagged as an order status enquiry and alerts staff with that title', async ({
    request,
  }) => {
    tagTest('REQ-126', [2, 4]);
    customer = await seedActiveCustomer();
    const id = await sendInbound(request, customer.phone, 'status');
    const row = await incomingRow(id);
    expect(row.classifiedIntent).toBe('order_status');
    expect(row.actionTaken).toBe('order_status_ticketed');

    const tickets = await ticketsFor(customer.phone);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].priority).toBe('urgent');
    expect(tickets[0].slaDueAt).toBeTruthy();
    expect(tickets[0].subject).toMatch(/^Order status enquiry: /);

    const alerts = await staffAlertsForTicket(String(tickets[0]._id));
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].title).toMatch(/^Order status enquiry /);
  });

  test("[REQ-126][AC6] [US-A4.6] another customer's order number gets no order data: an urgent ticket holding only what was typed, linked to no order", async ({
    request,
  }) => {
    tagTest('REQ-126', 6);
    customer = await seedActiveCustomer();
    const id = await sendInbound(
      request,
      customer.phone,
      'WG2611259999 where is it'
    );
    const row = await incomingRow(id);
    expect(row.classifiedIntent).toBe('order_status');
    expect(row.actionTaken).toBe('order_status_ticketed');
    const [ticket] = await ticketsFor(customer.phone);
    expect(ticket.priority).toBe('urgent');
    // The ticket is not linked to any order and carries no order details.
    expect(ticket.orderId ?? null).toBeNull();
    expect(ticket.replies ?? []).toHaveLength(0);
  });

  test('[REQ-126][AC3] [US-A4.7] with a ticket already open, "where is my order" raises it to urgent and appends to it; no second ticket', async ({
    request,
  }) => {
    tagTest('REQ-126', 3);
    customer = await seedActiveCustomer();
    await incomingRow(
      await sendInbound(request, customer.phone, 'My delivery was cold')
    );
    let tickets = await ticketsFor(customer.phone);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].priority).not.toBe('urgent');

    const id = await sendInbound(request, customer.phone, 'where is my order');
    const row = await incomingRow(id);
    expect(row.classifiedIntent).toBe('order_status');

    tickets = await ticketsFor(customer.phone);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].priority).toBe('urgent');
    expect(tickets[0].slaDueAt).toBeTruthy();
    expect(tickets[0].replies.map((r: any) => r.body)).toContain(
      'where is my order'
    );
  });
});
