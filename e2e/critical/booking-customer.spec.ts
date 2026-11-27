/**
 * @requirement REQ-129 — WA-13 table and event booking, customer side
 * @srs REQ-BOOK-001, REQ-BOOK-002, REQ-BOOK-004
 *
 * Covers AC1 (the /book forms, prefill, PIN gate, validation, five a day),
 * AC2 (confirmation screen and the `booking_received` message) and AC6 (My
 * bookings, owner only). CI runs with ENABLE_WHATSAPP_NOTIFICATIONS=false, so
 * the customer message is asserted on its NotificationLog row (template key
 * and exact parameters), not on delivery. The PIN flow uses
 * ENABLE_E2E_PIN_INTERCEPT.
 */
import { test, expect, type Page } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { pollForDoc } from '../helpers/db-assertions';
import {
  attachCustomerSessionToContext,
  cleanupSeededCustomer,
  seedVerifiedCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  bookingsFor,
  cleanupBookings,
  futureDate,
  gotoBookPage,
  notificationLogsFor,
  seedBooking,
} from '../helpers/booking-seed';
import { getVerificationPinByPhone } from '../smoke/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function dismissCookieBanner(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ acceptedAt: new Date().toISOString(), version: 'v1' })
      );
    } catch {
      /* best-effort */
    }
  });
}

async function fillTable(
  page: Page,
  opts: { name?: string; date?: string; time?: string; guests?: string } = {}
) {
  if (opts.name !== undefined)
    await page.getByTestId('booking-name').fill(opts.name);
  await page.getByTestId('booking-date').fill(opts.date ?? futureDate(14));
  await page.getByTestId('booking-start-time').fill(opts.time ?? '19:00');
  await page.getByTestId('booking-guests').fill(opts.guests ?? '4');
}

test.describe('[REQ-129] booking form and My bookings', () => {
  test.describe.configure({ timeout: 120_000 });
  const customers: SeededCustomerForSession[] = [];

  test.afterAll(async () => {
    await cleanupBookings(customers.map((c) => c._id));
    for (const c of customers) await cleanupSeededCustomer(c);
  });

  async function newCustomer() {
    const c = await seedVerifiedCustomer();
    customers.push(c);
    return c;
  }

  test('[REQ-129][AC1] [US-A5.1] a visitor clicks Book in the navigation and /book offers Table and Event', async ({
    page,
  }) => {
    tagTest('REQ-129', 1);
    await dismissCookieBanner(page);
    // The home page is a landing page without the site header; any page that
    // has it (the menu here) carries the Book link.
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Book', exact: true }).first().click();
    await page.waitForURL(/\/book$/);
    await expect(page.getByTestId('booking-type-table')).toBeVisible();
    await expect(page.getByTestId('booking-type-event')).toBeVisible();
    await evidenceShot(page, 'REQ-129', 1, 'book-page-table-and-event');
  });

  test('[REQ-129][AC1] [US-A5.2] Table asks only for name, phone, date, time, guests and requests', async ({
    page,
  }) => {
    tagTest('REQ-129', 1);
    await dismissCookieBanner(page);
    await gotoBookPage(page);
    for (const id of [
      'booking-name',
      'booking-phone',
      'booking-date',
      'booking-start-time',
      'booking-guests',
      'booking-requests',
    ]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    await expect(page.getByTestId('booking-end-time')).toHaveCount(0);
    await expect(page.getByTestId('booking-purpose')).toHaveCount(0);
    await expect(page.getByTestId('booking-dj-yes')).toHaveCount(0);
  });

  test('[REQ-129][AC1] [US-A5.3] Event also asks purpose, DJ, end time and guests expected', async ({
    page,
  }) => {
    tagTest('REQ-129', 1);
    await dismissCookieBanner(page);
    await gotoBookPage(page);
    await page.getByTestId('booking-type-event').click();
    for (const id of [
      'booking-purpose',
      'booking-dj-yes',
      'booking-dj-no',
      'booking-end-time',
      'booking-start-time',
      'booking-guests',
    ]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    await evidenceShot(page, 'REQ-129', 1, 'event-form-fields');
  });

  test('[REQ-129][AC1] [US-A5.4] a signed-in customer has name and phone prefilled and the phone locked', async ({
    browser,
  }) => {
    tagTest('REQ-129', 1);
    const customer = await newCustomer();
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, customer, BASE_URL);
      const page = await context.newPage();
      await dismissCookieBanner(page);
      await gotoBookPage(page);
      const phone = page.getByTestId('booking-phone');
      await expect(phone).toHaveValue(customer.phone, { timeout: 20000 });
      await expect(phone).toBeDisabled();
      // The account's name is "E2E Customer" (first and last name).
      await expect(page.getByTestId('booking-name')).toHaveValue(
        'E2E Customer'
      );
      await evidenceShot(page, 'REQ-129', 1, 'prefilled-locked-phone');
    } finally {
      await context.close();
    }
  });

  test('[REQ-129][AC1][AC2] [US-A5.5] [US-A5.6] without a session the PIN form opens and the booking is saved after verification, with the details kept and the confirmation shown', async ({
    page,
  }) => {
    tagTest('REQ-129', [1, 2]);
    const customer = await newCustomer();
    const digits = customer.phone.replace(/\D/g, '').slice(-9);
    await dismissCookieBanner(page);
    await gotoBookPage(page);

    await fillTable(page, { name: 'Adaeze Obi', guests: '6' });
    await page.getByTestId('booking-requests').fill('A quiet corner please');
    await page.getByTestId('booking-submit').click();

    // No session: the PIN form opens inside the page and nothing is saved yet.
    const dialog = page.getByTestId('booking-signin-dialog');
    await expect(dialog).toBeVisible();
    expect(await bookingsFor(customer._id)).toHaveLength(0);
    await evidenceShot(page, 'REQ-129', 1, 'pin-form-opens-on-submit');

    await dialog.locator('#phone').fill(customer.phone);
    await dialog.getByRole('button', { name: /^continue$/i }).click();
    await expect(dialog.locator('#pin')).toBeVisible({ timeout: 15000 });
    const pin = await getVerificationPinByPhone(digits);
    expect(pin).toMatch(/^\d{6}$/);
    await dialog.locator('#pin').fill(pin as string);
    await dialog.getByRole('button', { name: /verify & login/i }).click();

    // Saved after verification without re-entering anything.
    await expect(page.getByTestId('booking-confirmation')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByTestId('booking-confirmation-text')).toContainText(
      "We've received your request and will get back to you shortly to discuss your needs."
    );
    const number = (
      await page.getByTestId('booking-number').innerText()
    ).trim();
    expect(number).toMatch(/^BK-\d{4,}$/);
    await evidenceShot(page, 'REQ-129', 2, 'confirmation-screen');

    const rows = await bookingsFor(customer._id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'table',
      name: 'Adaeze Obi',
      guests: 6,
      requests: 'A quiet corner please',
      status: 'new',
      bookingNumber: number,
    });
    // The phone is the verified account's, not anything typed on the form.
    expect(rows[0].phone).toBe(customer.phone);

    // AC2 — the customer message is logged with the five template variables.
    const log = await pollForDoc<{
      templateKey: string;
      templateParams: { body: string[] };
    }>('notificationlogs', {
      userId: customer._id,
      templateKey: 'booking_received',
    });
    expect(log, 'a booking_received NotificationLog row').toBeTruthy();
    expect(log!.templateParams.body).toHaveLength(5);
    expect(log!.templateParams.body[1]).toBe('table');
    expect(log!.templateParams.body[2]).toBe('6 guests');
    expect(log!.templateParams.body[4]).toBe(number);
  });

  test('[REQ-129][AC1] a past date, an event ending before it starts and zero guests are refused inline, and nothing is saved', async ({
    browser,
  }) => {
    tagTest('REQ-129', 1);
    const customer = await newCustomer();
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, customer, BASE_URL);
      const page = await context.newPage();
      await dismissCookieBanner(page);
      await gotoBookPage(page);
      await expect(page.getByTestId('booking-phone')).toHaveValue(
        customer.phone,
        { timeout: 20000 }
      );

      // Past date.
      await fillTable(page, { date: '2020-01-01' });
      await page.getByTestId('booking-submit').click();
      await expect(page.getByTestId('booking-date-error')).toContainText(
        /not passed/i
      );
      await evidenceShot(page, 'REQ-129', 1, 'past-date-refused');

      // Zero guests.
      await fillTable(page, { guests: '0' });
      await page.getByTestId('booking-submit').click();
      await expect(page.getByTestId('booking-guests-error')).toBeVisible();

      // An event ending before it starts.
      await page.getByTestId('booking-type-event').click();
      await fillTable(page, { time: '20:00', guests: '40' });
      await page.getByTestId('booking-end-time').fill('18:00');
      await page.getByTestId('booking-purpose').fill('Birthday');
      await page.getByTestId('booking-dj-no').check();
      await page.getByTestId('booking-submit').click();
      await expect(page.getByTestId('booking-end-error')).toContainText(
        /after the start/i
      );

      expect(await bookingsFor(customer._id)).toHaveLength(0);
    } finally {
      await context.close();
    }
  });

  test('[REQ-129][AC1] a valid event is saved with its purpose, DJ and end time', async ({
    browser,
  }) => {
    tagTest('REQ-129', 1);
    const customer = await newCustomer();
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, customer, BASE_URL);
      const page = await context.newPage();
      await dismissCookieBanner(page);
      await gotoBookPage(page);
      await expect(page.getByTestId('booking-phone')).toHaveValue(
        customer.phone,
        { timeout: 20000 }
      );
      await page.getByTestId('booking-type-event').click();
      await fillTable(page, { time: '16:00', guests: '60' });
      await page.getByTestId('booking-end-time').fill('21:00');
      await page.getByTestId('booking-purpose').fill('Birthday');
      await page.getByTestId('booking-dj-yes').check();
      await page.getByTestId('booking-submit').click();
      await expect(page.getByTestId('booking-confirmation')).toBeVisible({
        timeout: 30000,
      });
      const rows = await bookingsFor(customer._id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        type: 'event',
        endTime: '21:00',
        purpose: 'Birthday',
        wantsDj: true,
        guests: 60,
      });
    } finally {
      await context.close();
    }
  });

  test('[REQ-129][AC1] a sixth booking from one phone in a day is refused and not saved', async ({
    browser,
  }) => {
    tagTest('REQ-129', 1);
    const customer = await newCustomer();
    for (let i = 0; i < 5; i += 1) {
      await seedBooking({ userId: customer._id, phone: customer.phone });
    }
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, customer, BASE_URL);
      const page = await context.newPage();
      await dismissCookieBanner(page);
      await gotoBookPage(page);
      await expect(page.getByTestId('booking-phone')).toHaveValue(
        customer.phone,
        { timeout: 20000 }
      );
      await fillTable(page);
      await page.getByTestId('booking-submit').click();
      await expect(page.getByTestId('booking-form-error')).toContainText(
        /limit of 5 booking requests/i
      );
      await evidenceShot(page, 'REQ-129', 1, 'sixth-booking-refused');
      expect(await bookingsFor(customer._id)).toHaveLength(5);
      expect(
        await notificationLogsFor(customer._id, 'booking_received')
      ).toHaveLength(0);
    } finally {
      await context.close();
    }
  });

  test("[REQ-129][AC6] [US-A5.8] My bookings lists the customer's own bookings with status, and the detail opens", async ({
    browser,
  }) => {
    tagTest('REQ-129', 6);
    const customer = await newCustomer();
    const mine = await seedBooking({
      userId: customer._id,
      phone: customer.phone,
      status: 'confirmed',
    });
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, customer, BASE_URL);
      const page = await context.newPage();
      await dismissCookieBanner(page);
      await page.goto('/profile/bookings');
      const row = page.getByTestId('my-booking-row').first();
      await expect(row).toContainText(mine.bookingNumber, { timeout: 20000 });
      await expect(row.getByTestId('booking-status')).toHaveText('Confirmed');
      await evidenceShot(page, 'REQ-129', 6, 'my-bookings-list');

      await row.click();
      await page.waitForURL(new RegExp(`/profile/bookings/${mine.id}$`));
      await expect(page.getByTestId('my-booking-detail')).toContainText(
        mine.bookingNumber
      );
    } finally {
      await context.close();
    }
  });

  test("[REQ-129][AC6] another customer's booking id is not found and reveals nothing; a visitor is sent to sign in", async ({
    browser,
    page,
  }) => {
    tagTest('REQ-129', 6);
    const owner = await newCustomer();
    const other = await newCustomer();
    const theirs = await seedBooking({
      userId: owner._id,
      phone: owner.phone,
      name: 'Secret Owner Name',
    });
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, other, BASE_URL);
      const otherPage = await context.newPage();
      await dismissCookieBanner(otherPage);
      const response = await otherPage.goto(`/profile/bookings/${theirs.id}`);
      expect(response?.status()).toBe(404);
      await expect(otherPage.locator('body')).not.toContainText(
        theirs.bookingNumber
      );
      await expect(otherPage.locator('body')).not.toContainText(
        'Secret Owner Name'
      );

      // Their own list does not include it either.
      await otherPage.goto('/profile/bookings');
      await expect(otherPage.getByTestId('my-bookings-empty')).toBeVisible({
        timeout: 20000,
      });
      await evidenceShot(otherPage, 'REQ-129', 6, 'other-customer-not-found');
    } finally {
      await context.close();
    }

    // A visitor with no session is sent to sign in.
    await dismissCookieBanner(page);
    await page.goto(`/profile/bookings/${theirs.id}`);
    await page.waitForURL(/\/login/);
  });
});
