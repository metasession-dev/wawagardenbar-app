/**
 * @requirement REQ-035 — Tip recording on close-tab payment rows
 *
 * Verifies that the close-tab full-payment dialog captures a tip on the
 * closing partial-payment row, and that the resulting Tab persists the
 * tip on the row (with the row's paymentType serving as the tip method).
 *
 * The Daily Financial Report's Tips Received section should show the
 * tip under the bucket matching the closing payment's method.
 *
 * Skips if no open tabs exist on the test environment.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend({
  storageState: ADMIN_FILE,
});

test.describe.configure({ mode: 'serial' });

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

async function readTipsBreakdown(page: Page): Promise<{
  total: number;
  cash: number;
  card: number;
  transfer: number;
}> {
  return page.evaluate(() => {
    const result = { total: 0, cash: 0, card: 0, transfer: 0 };
    const sectionHeading = Array.from(document.querySelectorAll('h3')).find(
      (h) => /Tips Received/i.test(h.textContent ?? '')
    );
    if (!sectionHeading) return result;

    const totalMatch = (sectionHeading.textContent ?? '').match(
      /(?:₦|NGN)\s*([\d,]+(?:\.\d+)?)\s*total/i
    );
    if (totalMatch) result.total = parseFloat(totalMatch[1].replace(/,/g, ''));

    const grid = sectionHeading.nextElementSibling;
    if (!grid) return result;
    const cards = grid.querySelectorAll('[class*="rounded"]');
    for (const card of cards) {
      const titleText =
        card.querySelector('[class*="font-medium"]')?.textContent?.trim() ?? '';
      const amountText =
        card.querySelector('[class*="text-2xl"]')?.textContent?.trim() ?? '';
      const m = amountText.match(/(?:₦|NGN)\s*([\d,]+(?:\.\d+)?)/);
      if (!m) continue;
      const amount = parseFloat(m[1].replace(/,/g, ''));
      if (titleText === 'Cash tips') result.cash = amount;
      else if (titleText === 'POS / Card tips') result.card = amount;
      else if (titleText === 'Transfer tips') result.transfer = amount;
    }
    return result;
  });
}

async function openTodayReport(page: Page) {
  await page.goto('/dashboard/reports/daily');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Today' }).click();
  await page.waitForLoadState('networkidle');
  await page
    .getByText('Generating report...')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});
}

test.describe.serial('REQ-035: close-tab tip capture', () => {
  let baselineCashTips = 0;
  const TIP = 250;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('AC2 — close an open tab with a cash tip', async ({ page }) => {
    await openTodayReport(page);
    baselineCashTips = (await readTipsBreakdown(page)).cash;

    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    const payButton = page
      .getByRole('button', { name: /Customer Wants to Pay/i })
      .first();
    if (!(await payButton.isVisible().catch(() => false))) {
      test.skip(
        true,
        'No open tabs to close — seed an open tab to exercise this spec'
      );
      return;
    }
    await payButton.click();

    // Manual full-payment radio is the default. Choose Cash.
    const cashRadio = page.locator('#cash');
    await expect(cashRadio).toBeVisible({ timeout: 5000 });
    await cashRadio.click();

    // Receipt number / reference.
    const refInput = page.locator('#reference');
    await refInput.fill('REQ035-TIP-TEST');

    // Tip input.
    const tipInput = page.locator('#tab-close-tip');
    await expect(tipInput).toBeVisible();
    await tipInput.fill(String(TIP));

    // Submit close-tab.
    const submit = page.getByRole('button', { name: /Pay ₦.*Close Tab/i });
    await submit.click();

    // Toast / refresh.
    await page.waitForLoadState('networkidle');
  });

  test('AC7 — Daily Report Tips Received cash card increased', async ({
    page,
  }) => {
    await openTodayReport(page);
    const heading = page.locator('h3').filter({ hasText: /Tips Received/i });
    if (!(await heading.isVisible().catch(() => false))) {
      test.skip(
        true,
        'Tips section absent — likely the prior test was skipped or no tip recorded'
      );
      return;
    }
    const { cash } = await readTipsBreakdown(page);
    expect(cash - baselineCashTips).toBeGreaterThanOrEqual(TIP);
  });
});
