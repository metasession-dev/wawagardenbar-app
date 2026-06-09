/**
 * @requirement REQ-035 — Tip recording at express checkout
 *
 * Verifies that the express create-order flow captures a tip and the
 * tip's payment method independently, and that the resulting Order
 * persists both fields.
 *
 * The test exercises the realistic case the feature targets: customer
 * pays card while leaving a cash tip. Asserts the Daily Financial
 * Report's new "Tips Received" section shows the tip under the cash
 * bucket — independent of where the bill itself was attributed.
 *
 * Skips gracefully if admin auth state isn't present (CI without seeded
 * admin credentials, or local dev without the auth.setup having run).
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

    const parseNGN = (s: string): number | null => {
      const m = s.match(/(?:₦|NGN)\s*([\d,]+(?:\.\d+)?)/);
      return m ? parseFloat(m[1].replace(/,/g, '')) : null;
    };

    const sectionHeading = Array.from(document.querySelectorAll('h3')).find(
      (h) => /Tips Received/i.test(h.textContent ?? '')
    );
    if (!sectionHeading) return result;
    const totalAmount = parseNGN(sectionHeading.textContent ?? '');
    if (totalAmount != null) result.total = totalAmount;

    const grid = sectionHeading.nextElementSibling;
    if (!grid) return result;

    // Same robust strategy as the close-tab-tip-capture sibling spec:
    // find the title element by its known text + walk up its ancestor
    // chain to the nearest container with a ₦amount that doesn't also
    // mention "total" (the section-wide total).
    const labels: Array<{ label: string; key: 'cash' | 'card' | 'transfer' }> =
      [
        { label: 'Cash tips', key: 'cash' },
        { label: 'POS / Card tips', key: 'card' },
        { label: 'Transfer tips', key: 'transfer' },
      ];

    const all = Array.from(grid.querySelectorAll('*')) as HTMLElement[];
    for (const { label, key } of labels) {
      const titleEl = all.find((el) => {
        const txt = (el.textContent ?? '').trim();
        return txt === label || txt.startsWith(label + '\n');
      });
      if (!titleEl) continue;
      let node: HTMLElement | null = titleEl.parentElement;
      while (node && node !== grid) {
        const amount = parseNGN(node.textContent ?? '');
        if (
          amount != null &&
          !/total/i.test(node.textContent ?? '') &&
          !labels.some(
            (l) =>
              l.label !== label && (node?.textContent ?? '').includes(l.label)
          )
        ) {
          result[key] = amount;
          break;
        }
        node = node.parentElement;
      }
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

test.describe.serial('REQ-035: express order tip capture', () => {
  let baselineCashTips = 0;
  const TIP = 500;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('AC7 baseline — read current cash-tip total', async ({ page }) => {
    await openTodayReport(page);
    const { cash } = await readTipsBreakdown(page);
    baselineCashTips = cash;
  });

  test('AC1 + AC4 — record ₦500 cash tip on a card-paid express order', async ({
    page,
  }) => {
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Pick the first menu item.
    const menuCard = page.locator('.grid .cursor-pointer').first();
    await expect(menuCard).toBeVisible({ timeout: 10000 });
    await menuCard.click();

    // Proceed to checkout.
    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    const payNowBtn = page.locator('button').filter({ hasText: 'Pay Now' });
    await expect(payNowBtn).toBeVisible({ timeout: 5000 });
    await payNowBtn.click();

    // Choose POS as the bill payment method.
    const posBtn = page.locator('button').filter({ hasText: 'POS' }).first();
    await expect(posBtn).toBeVisible({ timeout: 5000 });
    await posBtn.click();

    // Enter the tip amount and override the method to cash.
    const tipInput = page.locator('#tip-amount');
    await expect(tipInput).toBeVisible();
    await tipInput.fill(String(TIP));
    // Tip method dropdown defaults to the bill method (POS / 'card');
    // override to 'cash' to exercise AC4.
    //
    // The previous locator was `[id="tip-amount"] ~ * button` (CSS general-
    // sibling), but `#tip-amount` is the <Input> itself, and the Select
    // trigger button is a sibling of the input's *parent* div in the
    // TipInputRow grid (components/features/orders/tip-input-row.tsx). The
    // locator matched 0 elements, `isVisible()` returned false, the
    // `if`-fallback silently skipped the override, the tip recorded under
    // the bill's method (card), and AC7 read 0 cash tips. Use a
    // document-order XPath to find the first combobox after the input, and
    // fail loudly if the override path is missing.
    const tipMethodTrigger = page
      .locator('#tip-amount')
      .locator('xpath=following::button[@role="combobox"][1]');
    await expect(tipMethodTrigger).toBeVisible({ timeout: 5000 });
    await tipMethodTrigger.click();
    const cashOption = page.getByRole('option', { name: /^Cash$/ });
    await expect(cashOption).toBeVisible({ timeout: 5000 });
    await cashOption.click();

    // Submit.
    const payBtn = page.getByRole('button', { name: /Pay ₦/i });
    await expect(payBtn).toBeVisible({ timeout: 5000 });
    await payBtn.click();

    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('AC7 — Daily Report Tips Received cash card increased by ₦500', async ({
    page,
  }) => {
    await openTodayReport(page);
    await expect(
      page.locator('h3').filter({ hasText: /Tips Received/i })
    ).toBeVisible({ timeout: 15000 });
    const { cash, total } = await readTipsBreakdown(page);
    expect(cash - baselineCashTips).toBeGreaterThanOrEqual(TIP);
    expect(total).toBeGreaterThanOrEqual(cash);
  });
});
