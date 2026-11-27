/**
 * @requirement REQ-129 — WA-13 table and event booking, staff side
 * @srs REQ-BOOK-003, REQ-DASH-003
 *
 * AC4 (the Bookings pages: list, filters, calendar, detail, status, assignee,
 * notes, replies, confirm and decline messages, audit) and AC5 (one staff
 * alert per new booking). Customer messages are asserted on their
 * NotificationLog rows (WhatsApp is off in CI). Staff are throwaway accounts
 * logged in through the real admin form.
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
  bookingAuditRows,
  bookingsFor,
  cleanupBookings,
  futureDate,
  gotoBookPage,
  notificationLogsFor,
  readBooking,
  seedBooking,
  staffAlertsFor,
} from '../helpers/booking-seed';
import {
  createStaff,
  deleteStaff,
  isRefused,
  loginAsStaff,
  type ThrowawayStaff,
} from '../helpers/staff-roles';
import type { StaffRole } from '../../interfaces/user.interface';

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

test.describe('[REQ-129] staff Bookings page', () => {
  test.describe.configure({ timeout: 150_000 });
  const staff: ThrowawayStaff[] = [];
  const customers: SeededCustomerForSession[] = [];

  test.afterAll(async () => {
    await cleanupBookings(customers.map((c) => c._id));
    for (const c of customers) await cleanupSeededCustomer(c);
    await deleteStaff(...staff.map((s) => s.id));
  });

  async function member(prefix: string, roles: StaffRole[] = ['csr']) {
    const s = await createStaff(prefix, roles);
    staff.push(s);
    return s;
  }
  async function customer() {
    const c = await seedVerifiedCustomer();
    customers.push(c);
    return c;
  }

  test('[REQ-129][AC4][AC5] [US-B5.1] a booking made on /book appears in /dashboard/bookings with status New, and one staff alert links to it', async ({
    browser,
  }) => {
    tagTest('REQ-129', [4, 5]);
    const c = await customer();

    // The customer submits through the real form.
    const customerCtx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    let bookingId: string;
    let bookingNumber: string;
    try {
      await attachCustomerSessionToContext(customerCtx, c, BASE_URL);
      const page = await customerCtx.newPage();
      await dismissCookieBanner(page);
      await gotoBookPage(page);
      await expect(page.getByTestId('booking-phone')).toHaveValue(c.phone, {
        timeout: 20000,
      });
      await page.getByTestId('booking-date').fill(futureDate(21));
      await page.getByTestId('booking-start-time').fill('18:30');
      await page.getByTestId('booking-guests').fill('8');
      await page.getByTestId('booking-submit').click();
      await expect(page.getByTestId('booking-confirmation')).toBeVisible({
        timeout: 30000,
      });
      bookingNumber = (
        await page.getByTestId('booking-number').innerText()
      ).trim();
    } finally {
      await customerCtx.close();
    }
    const rows = await bookingsFor(c._id);
    expect(rows).toHaveLength(1);
    bookingId = String(rows[0]._id);

    // AC5 — exactly one alert, of type booking, linking to the detail page.
    const alerts = await staffAlertsFor([bookingId]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: 'booking',
      refModel: 'Booking',
      link: `/dashboard/bookings/${bookingId}`,
    });

    // AC4 — staff see it in the list with status New.
    const csr = await member('bk-list');
    const { context, page } = await loginAsStaff(browser, csr);
    try {
      await page.goto('/dashboard/bookings');
      const row = page
        .getByTestId('booking-row')
        .filter({ hasText: bookingNumber });
      await expect(row).toBeVisible({ timeout: 20000 });
      await expect(row.getByTestId('booking-status')).toHaveText('New');
      await evidenceShot(page, 'REQ-129', 4, 'bookings-list-new-booking');

      // Opening the detail acknowledges the alert (REQ-122).
      await row.getByRole('link', { name: bookingNumber }).click();
      await page.waitForURL(new RegExp(`/dashboard/bookings/${bookingId}$`));
      await expect(page.getByTestId('booking-detail')).toContainText(
        '8 guests'
      );
      const acked = await pollForDoc('staffnotifications', {
        refId: bookingId,
        acknowledgedAt: { $ne: null },
      });
      expect(acked, 'the alert should be acknowledged on open').toBeTruthy();
      await evidenceShot(page, 'REQ-129', 5, 'booking-detail-after-alert');
    } finally {
      await context.close();
    }
  });

  test('[REQ-129][AC4] [US-B5.2] confirming a booking sets Confirmed, logs booking_update for the customer and writes an audit row', async ({
    browser,
  }) => {
    tagTest('REQ-129', 4);
    const c = await customer();
    const b = await seedBooking({ userId: c._id, phone: c.phone });
    const csr = await member('bk-confirm');
    const { context, page } = await loginAsStaff(browser, csr);
    try {
      await page.goto(`/dashboard/bookings/${b.id}`);
      await page.getByTestId('booking-confirm').click();
      await expect(
        page.getByTestId('booking-detail').getByTestId('booking-status')
      ).toHaveText('Confirmed', { timeout: 20000 });
      await evidenceShot(page, 'REQ-129', 4, 'booking-confirmed');

      expect((await readBooking(b.id))?.status).toBe('confirmed');

      const log = await pollForDoc<{
        templateParams: { body: string[]; buttons: any[] };
      }>('notificationlogs', { userId: c._id, templateKey: 'booking_update' });
      expect(log, 'a booking_update NotificationLog row').toBeTruthy();
      expect(log!.templateParams.body).toHaveLength(3);
      expect(log!.templateParams.body[1]).toBe(b.bookingNumber);
      expect(log!.templateParams.body[2]).toMatch(/confirmed/i);

      const audit = await bookingAuditRows(b.id, 'booking.status_changed');
      expect(audit).toHaveLength(1);
      expect(audit[0].details).toMatchObject({ from: 'new', to: 'confirmed' });
    } finally {
      await context.close();
    }
  });

  test('[REQ-129][AC4] declining a booking sends the customer the decline update', async ({
    browser,
  }) => {
    tagTest('REQ-129', 4);
    const c = await customer();
    const b = await seedBooking({ userId: c._id, phone: c.phone });
    const csr = await member('bk-decline');
    const { context, page } = await loginAsStaff(browser, csr);
    try {
      await page.goto(`/dashboard/bookings/${b.id}`);
      await page.getByTestId('booking-decline').click();
      await expect
        .poll(async () => (await readBooking(b.id))?.status, { timeout: 20000 })
        .toBe('declined');
      const logs = await notificationLogsFor(c._id, 'booking_update');
      expect(logs).toHaveLength(1);
      expect(logs[0].templateParams.body[2]).toMatch(/unable/i);
    } finally {
      await context.close();
    }
  });

  test('[REQ-129][AC4] staff add an internal note, reply to the customer and assign it; each is stored and audit-logged', async ({
    browser,
  }) => {
    tagTest('REQ-129', 4);
    const c = await customer();
    const b = await seedBooking({
      userId: c._id,
      phone: c.phone,
      type: 'event',
    });
    const csr = await member('bk-handle');
    const { context, page } = await loginAsStaff(browser, csr);
    try {
      await page.goto(`/dashboard/bookings/${b.id}`);

      await page
        .getByTestId('booking-note-input')
        .fill('Customer prefers a call after 5pm');
      await page.getByTestId('booking-note-save').click();
      await expect(page.getByTestId('booking-notes')).toContainText(
        'Customer prefers a call after 5pm',
        { timeout: 20000 }
      );

      await page
        .getByTestId('booking-reply-input')
        .fill('We can host 60 guests on that date.');
      await page.getByTestId('booking-reply-send').click();
      await expect(page.getByTestId('booking-replies')).toContainText(
        'We can host 60 guests on that date.',
        { timeout: 20000 }
      );

      await page.getByTestId('booking-assignee').click();
      await page.getByRole('option').nth(1).click();
      await expect
        .poll(async () => (await readBooking(b.id))?.assignedTo, {
          timeout: 20000,
        })
        .toBeTruthy();
      await evidenceShot(page, 'REQ-129', 4, 'note-reply-assignee');

      const stored = await readBooking(b.id);
      expect(stored.internalNotes).toHaveLength(1);
      expect(stored.replies).toHaveLength(1);
      expect(stored.replies[0].authorRole).toBe('staff');

      // The reply went to the customer window-aware: a booking_update row.
      const logs = await notificationLogsFor(c._id, 'booking_update');
      expect(logs.length).toBeGreaterThanOrEqual(1);

      for (const action of [
        'booking.note_added',
        'booking.replied',
        'booking.assigned',
      ]) {
        expect(await bookingAuditRows(b.id, action), action).toHaveLength(1);
      }
      // The note text is not copied into the audit trail.
      const noteAudit = await bookingAuditRows(b.id, 'booking.note_added');
      expect(JSON.stringify(noteAudit[0].details)).not.toContain('after 5pm');
    } finally {
      await context.close();
    }
  });

  test('[REQ-129][AC4] the list filters by type and status, the calendar groups by day, and an event outside hours is flagged', async ({
    browser,
  }) => {
    tagTest('REQ-129', 4);
    const c = await customer();
    const date = futureDate(28);
    const table = await seedBooking({
      userId: c._id,
      phone: c.phone,
      type: 'table',
      date,
    });
    const event = await seedBooking({
      userId: c._id,
      phone: c.phone,
      type: 'event',
      date,
      status: 'confirmed',
      outsideBusinessHours: true,
    });
    const csr = await member('bk-filter');
    const { context, page } = await loginAsStaff(browser, csr);
    try {
      await page.goto(`/dashboard/bookings?type=event&from=${date}&to=${date}`);
      await expect(
        page.getByTestId('booking-row').filter({ hasText: event.bookingNumber })
      ).toBeVisible({ timeout: 20000 });
      await expect(
        page.getByTestId('booking-row').filter({ hasText: table.bookingNumber })
      ).toHaveCount(0);
      await expect(
        page.getByTestId('booking-row').filter({ hasText: event.bookingNumber })
      ).toContainText('Outside hours');
      await evidenceShot(page, 'REQ-129', 4, 'filtered-by-event-outside-hours');

      await page.goto(`/dashboard/bookings?status=new&from=${date}&to=${date}`);
      await expect(
        page.getByTestId('booking-row').filter({ hasText: table.bookingNumber })
      ).toBeVisible({ timeout: 20000 });
      await expect(
        page.getByTestId('booking-row').filter({ hasText: event.bookingNumber })
      ).toHaveCount(0);

      // Calendar: both requests fall on one day, so the day says so.
      await page.goto(
        `/dashboard/bookings?view=calendar&from=${date}&to=${date}`
      );
      const day = page.locator(
        `[data-testid="calendar-day"][data-date="${date}"]`
      );
      await expect(day).toBeVisible({ timeout: 20000 });
      await expect(day).toContainText('2 requests');
      await expect(day).toContainText('check for clashes');
      await expect(day).toContainText(table.bookingNumber);
      await expect(day).toContainText(event.bookingNumber);
      await evidenceShot(page, 'REQ-129', 4, 'calendar-view-clash');

      // The detail page flags the event too.
      await page.goto(`/dashboard/bookings/${event.id}`);
      await expect(page.getByTestId('outside-hours-flag')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('[REQ-129][AC4] a kitchen-only member and a customer cannot open the Bookings pages', async ({
    browser,
  }) => {
    tagTest('REQ-129', 4);
    const c = await customer();
    const b = await seedBooking({ userId: c._id, phone: c.phone });
    const kitchen = await member('bk-kit', ['kitchen']);
    const k = await loginAsStaff(browser, kitchen);
    try {
      expect(await isRefused(k.page, '/dashboard/bookings')).toBe(true);
      expect(await isRefused(k.page, `/dashboard/bookings/${b.id}`)).toBe(true);
      await evidenceShot(k.page, 'REQ-129', 4, 'kitchen-refused-on-bookings');
    } finally {
      await k.context.close();
    }

    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, c, BASE_URL);
      const page = await context.newPage();
      expect(await isRefused(page, '/dashboard/bookings')).toBe(true);
    } finally {
      await context.close();
    }
    // Nothing changed.
    expect((await readBooking(b.id))?.status).toBe('new');
  });

  test('[REQ-129][AC4] each staff role that handles bookings sees Bookings in the menu', async ({
    browser,
  }) => {
    tagTest('REQ-129', 4);
    for (const role of ['csr', 'manager', 'admin'] as const) {
      const s = await member(`bk-nav-${role}`, [role]);
      const { context, page } = await loginAsStaff(browser, s);
      try {
        await expect(
          page.locator('nav a', { hasText: /^Bookings$/ }).first()
        ).toBeVisible({ timeout: 20000 });
      } finally {
        await context.close();
      }
    }
  });

  test('[REQ-129][AC5] a failed customer message never fails the booking: the booking exists even though the template is not delivered', async ({
    browser,
  }) => {
    tagTest('REQ-129', 5);
    const c = await customer();
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, c, BASE_URL);
      const page = await context.newPage();
      await dismissCookieBanner(page);
      await gotoBookPage(page);
      await expect(page.getByTestId('booking-phone')).toHaveValue(c.phone, {
        timeout: 20000,
      });
      await page.getByTestId('booking-type-event').click();
      await page.getByTestId('booking-date').fill(futureDate(30));
      await page.getByTestId('booking-start-time').fill('15:00');
      await page.getByTestId('booking-end-time').fill('20:00');
      await page.getByTestId('booking-guests').fill('45');
      await page.getByTestId('booking-purpose').fill('Anniversary');
      await page.getByTestId('booking-dj-no').check();
      await page.getByTestId('booking-submit').click();
      // WhatsApp is off in CI, so the message cannot be delivered; the
      // customer still sees the confirmation and staff still get the alert.
      await expect(page.getByTestId('booking-confirmation')).toBeVisible({
        timeout: 30000,
      });
    } finally {
      await context.close();
    }
    const rows = await bookingsFor(c._id);
    expect(rows).toHaveLength(1);
    const alerts = await staffAlertsFor([String(rows[0]._id)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('event');
  });
});
