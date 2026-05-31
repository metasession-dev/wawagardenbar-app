/**
 * @requirement REQ-036 — independent tip-payment-method on tab close
 *
 * Verifies the new tip-method dropdown on the Process Tab Payment dialog
 * (Full Payment branch). Records a tab close where the bill was paid on
 * card but the tip was paid in cash, then asserts the Daily Financial
 * Report attributes the tip to the cash bucket — not the card bucket.
 *
 * Skips gracefully if admin auth state isn't present or no open tabs
 * exist.
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

test.describe.serial('REQ-036: card bill + cash tip on tab close', () => {
  let baselineCashTips = 0;
  const TIP = 300;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('AC1: close a tab on card with a cash tip override', async ({
    page,
  }) => {
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

    // Pick Card (POS) for the bill payment.
    const cardRadio = page.locator('#card');
    await expect(cardRadio).toBeVisible({ timeout: 5000 });
    await cardRadio.click();

    // Receipt number / reference.
    await page.locator('#reference').fill('REQ036-CARD+CASHTIP');

    // Tip amount.
    await page.locator('#tab-close-tip').fill(String(TIP));

    // Tip method dropdown defaults to the bill type ('card').
    // Override to 'cash' to exercise AC1's independence.
    //
    // The previous locator was `[id="tab-close-tip"] ~ * button` (CSS
    // general-sibling), but `#tab-close-tip` is the <Input> itself, and
    // the Select trigger button is a sibling of the input's *parent* div
    // in the TipInputRow grid (components/features/orders/tip-input-row.tsx).
    // The locator matched 0 elements, the silent `if (isVisible)` fallback
    // skipped the override, the tip recorded under the bill's method
    // (card), and AC8 read 0 cash tips. Same root cause and fix as
    // PR #206 for express-tip-capture (#201) — use a document-order
    // XPath to find the first combobox after the input, and fail
    // loudly if the override path is missing.
    const tipMethodTrigger = page
      .locator('#tab-close-tip')
      .locator('xpath=following::button[@role="combobox"][1]');
    await expect(tipMethodTrigger).toBeVisible({ timeout: 5000 });
    await tipMethodTrigger.click();
    const cashOption = page.getByRole('option', { name: /^Cash$/ });
    await expect(cashOption).toBeVisible({ timeout: 5000 });
    await cashOption.click();

    // Submit close-tab.
    await page.getByRole('button', { name: /Pay ₦.*Close Tab/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('AC8: tip lands in CASH bucket, not card', async ({ page }) => {
    await openTodayReport(page);
    const heading = page.locator('h3').filter({ hasText: /Tips Received/i });
    if (!(await heading.isVisible().catch(() => false))) {
      test.skip(
        true,
        'Tips section absent — likely the prior test was skipped'
      );
      return;
    }
    const { cash } = await readTipsBreakdown(page);
    expect(cash - baselineCashTips).toBeGreaterThanOrEqual(TIP);
  });
});
