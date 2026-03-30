/**
 * @requirement REQ-013 - E2E: Daily Report — Partial Payment & Tab Payment Accuracy
 *
 * Full-flow test: create tab → add order → partial payment (cash) →
 * close tab with final payment (card) → verify daily report shows
 * correct payment method breakdown with no double-counting.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

const ADMIN_FILE = path.join(__dirname, '../.auth/admin.json');

const test = base.extend({
  storageState: ADMIN_FILE,
});

// All test blocks in this file must run sequentially — the second block's
// partial payment would otherwise pollute the first block's delta assertions.
test.describe.configure({ mode: 'serial' });

// Use timestamp-derived table numbers to avoid conflicts with existing tabs
const TEST_TABLE = String((Math.floor(Date.now() / 1000) % 800) + 100);
const TEST_TABLE_OPEN = String((Math.floor(Date.now() / 1000) % 800) + 901);

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

function parseNGN(text: string): number {
  const match = text.match(/(?:₦|NGN)\s*([\d,]+(?:\.\d{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
}

/**
 * Extract payment amounts from the daily report using in-browser DOM traversal.
 * Each metric/payment card has: CardTitle (.font-medium) + amount (.text-2xl.font-bold).
 */
async function getReportAmounts(page: Page): Promise<{
  totalRevenue: number;
  cash: number;
  card: number;
  transfer: number;
}> {
  // Wait for any loading spinner to disappear
  await page
    .getByText('Generating report...')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});

  return page.evaluate(() => {
    const result = { totalRevenue: 0, cash: 0, card: 0, transfer: 0 };

    const amountEls = document.querySelectorAll(
      '.text-2xl.font-bold, [class*="text-2xl"][class*="font-bold"]'
    );

    for (const el of amountEls) {
      const card = el.closest('[class*="rounded"]');
      if (!card) continue;

      const titleText =
        card.querySelector('[class*="font-medium"]')?.textContent?.trim() ?? '';
      const amountText = el.textContent ?? '';
      const match = amountText.match(/(?:₦|NGN)\s*([\d,]+(?:\.\d+)?)/);
      const amount = match ? parseFloat(match[1].replace(/,/g, '')) : 0;

      if (titleText === 'Total Revenue') result.totalRevenue = amount;
      else if (titleText === 'Cash') result.cash = amount;
      else if (titleText === 'POS / Card') result.card = amount;
      else if (titleText === 'Transfer') result.transfer = amount;
    }

    return result;
  });
}

test.describe
  .serial('REQ-013: Daily Report — Partial Payment & Tab Payment Accuracy', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let tabId = '';
  let tabTotal = 0;
  let partialAmount = 0;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed or credentials not configured');
    }
  });

  test('capture baseline daily report totals', async ({ page }) => {
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');
    baseline = await getReportAmounts(page);
  });

  test('create tab and add order', async ({ page }) => {
    // ── Create tab ────────────────────────────────────────────
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    // The "Open a New Tab" card triggers the CreateTabDialog
    await page.locator('text=Open a New Tab').click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Table Number').fill(TEST_TABLE);
    await createDialog.getByRole('button', { name: 'Create Tab' }).click();

    // Redirect to tab details page — capture tab ID
    await page.waitForURL(/\/dashboard\/orders\/tabs\/[a-f0-9]+/, {
      timeout: 10000,
    });
    const urlMatch = page.url().match(/\/tabs\/([a-f0-9]+)/);
    tabId = urlMatch?.[1] ?? '';
    expect(tabId).toBeTruthy();
    await page.waitForLoadState('networkidle');

    // ── Navigate to menu ──────────────────────────────────────
    await page.goto(`/menu?tableNumber=${TEST_TABLE}`);
    await page.waitForLoadState('networkidle');

    // ── Add first in-stock menu item to cart ───────────────────
    const menuItem = page
      .locator('[data-testid^="menu-item-"]')
      .filter({ hasNot: page.locator('text=Out of Stock') })
      .first();
    await expect(menuItem).toBeVisible({ timeout: 10000 });
    await menuItem.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: /Add to Cart/i }).click();

    // Cart sidebar opens — wait for "Proceed to Checkout" button
    const checkoutBtn = page.getByRole('button', {
      name: /Proceed to Checkout/i,
    });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();
    await page.waitForURL('/checkout');
    await page.waitForLoadState('networkidle');

    // ── Checkout Step 1: Customer info ────────────────────────
    // Fields may be pre-filled from admin profile; fill only if empty
    const nameInput = page.locator('input[name="customerName"]');
    const emailInput = page.locator('input[name="customerEmail"]');
    const phoneInput = page.locator('input[name="customerPhone"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    if (!(await nameInput.inputValue())) await nameInput.fill('E2E Test');
    if (!(await emailInput.inputValue())) await emailInput.fill('e2e@test.com');
    if (!(await phoneInput.inputValue())) await phoneInput.fill('08099887766');

    // Navigate through checkout steps using the visible Next button
    const nextBtn = page.getByRole('button', { name: /Next/i }).first();
    await nextBtn.click();

    // ── Step 2: Order type (dine-in + table pre-filled) ──────
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Next/i }).first().click();

    // ── Step 3: Tab options — select existing tab ─────────────
    const existingTabRadio = page.locator('#existing-tab');
    await expect(existingTabRadio).toBeVisible({ timeout: 5000 });
    await existingTabRadio.click();
    await page.waitForTimeout(300);

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Wait for success confirmation
    await expect(page.getByText(/Order Added to Tab/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('record partial payment (cash)', async ({ page }) => {
    // Navigate directly to our tab's detail page
    await page.goto(`/dashboard/orders/tabs/${tabId}`);
    await page.waitForLoadState('networkidle');

    // Open payment dialog from tab details
    await page.getByRole('button', { name: /Customer Wants to Pay/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Read tab total from dialog description
    // Format: "Tab #TAB-X-XXXXXX (Table X) — Total: ₦X,XXX.XX"
    const descText = (await dialog.locator('p').first().textContent()) ?? '';
    tabTotal = parseNGN(descText);
    expect(tabTotal).toBeGreaterThan(0);

    // Partial = 40% of total, floored to integer
    partialAmount = Math.floor(tabTotal * 0.4);
    expect(partialAmount).toBeGreaterThan(0);
    expect(partialAmount).toBeLessThan(tabTotal);

    // Select "Partial Payment"
    await dialog.locator('label', { hasText: 'Partial Payment' }).click();

    // Fill form
    await dialog.locator('#partialAmount').fill(String(partialAmount));
    await dialog.locator('#partialNote').fill('E2E partial payment test');
    await dialog.locator('#partial-cash').click();

    // Submit
    await dialog
      .getByRole('button', { name: /Record Partial Payment/i })
      .click();
    await expect(
      page.getByText(/Partial Payment Recorded/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('close tab with final payment (card)', async ({ page }) => {
    await page.goto(`/dashboard/orders/tabs/${tabId}`);
    await page.waitForLoadState('networkidle');

    // Open payment dialog from tab details
    await page.getByRole('button', { name: /Customer Wants to Pay/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // "Full Payment — Close Tab" is the default selection
    // Select Card (POS) payment type
    await dialog.locator('#card').click();
    await dialog.locator('#reference').fill('E2E-REF-' + Date.now());

    // Submit — button text: "Pay ₦X,XXX & Close Tab"
    await dialog.getByRole('button', { name: /Pay.*Close Tab/i }).click();
    await expect(page.getByText(/Tab payment completed/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('daily report reflects both payment methods with no double-counting', async ({
    page,
  }) => {
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');

    // Click "Today" to force a fresh report generation
    await page.getByRole('button', { name: 'Today' }).click();
    await page.waitForLoadState('networkidle');

    // Verify payment breakdown section is visible
    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    // Verify both payment method cards are rendered
    // (cards are conditionally rendered only when amount > 0)
    await expect(page.getByText('Cash', { exact: true })).toBeVisible();
    await expect(page.getByText('POS / Card', { exact: true })).toBeVisible();

    // Extract updated amounts
    const updated = await getReportAmounts(page);
    const finalAmount = tabTotal - partialAmount;

    // ── Verify deltas against baseline ────────────────────────
    const cashDelta = updated.cash - baseline.cash;
    const cardDelta = updated.card - baseline.card;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    // Partial payment (cash) must appear in Cash column
    expect(cashDelta).toBe(partialAmount);

    // Final payment (card) must appear in POS / Card column
    expect(cardDelta).toBe(finalAmount);

    // Total revenue must increase by exactly the tab total — no double-counting
    expect(totalDelta).toBe(tabTotal);

    // Cross-check: partial + final = tab total
    expect(partialAmount + finalAmount).toBe(tabTotal);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Regression test: partial payment on an OPEN tab (no close) must still
// appear in the daily report. This is the scenario that was originally
// broken — the UI hid the payment breakdown when orderCount === 0.
// ═══════════════════════════════════════════════════════════════════════════
test.describe
  .serial('REQ-013: Partial payment on open tab appears in daily report', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let openTabId = '';
  let openTabTotal = 0;
  let openPartialAmount = 0;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed or credentials not configured');
    }
  });

  test('capture baseline', async ({ page }) => {
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');
    baseline = await getReportAmounts(page);
  });

  test('create tab, add order, record partial payment', async ({ page }) => {
    // ── Create tab ────────────────────────────────────────────
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    await page.locator('text=Open a New Tab').click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel('Table Number').fill(TEST_TABLE_OPEN);
    await createDialog.getByRole('button', { name: 'Create Tab' }).click();

    await page.waitForURL(/\/dashboard\/orders\/tabs\/[a-f0-9]+/, {
      timeout: 10000,
    });
    const urlMatch = page.url().match(/\/tabs\/([a-f0-9]+)/);
    openTabId = urlMatch?.[1] ?? '';
    expect(openTabId).toBeTruthy();
    await page.waitForLoadState('networkidle');

    // ── Add order via menu ────────────────────────────────────
    await page.goto(`/menu?tableNumber=${TEST_TABLE_OPEN}`);
    await page.waitForLoadState('networkidle');

    const menuItem = page
      .locator('[data-testid^="menu-item-"]')
      .filter({ hasNot: page.locator('text=Out of Stock') })
      .first();
    await expect(menuItem).toBeVisible({ timeout: 10000 });
    await menuItem.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: /Add to Cart/i }).click();

    const checkoutBtn = page.getByRole('button', {
      name: /Proceed to Checkout/i,
    });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();
    await page.waitForURL('/checkout');
    await page.waitForLoadState('networkidle');

    // Checkout: customer info (fill if empty)
    const nameInput = page.locator('input[name="customerName"]');
    const emailInput = page.locator('input[name="customerEmail"]');
    const phoneInput = page.locator('input[name="customerPhone"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    if (!(await nameInput.inputValue())) await nameInput.fill('E2E Test');
    if (!(await emailInput.inputValue())) await emailInput.fill('e2e@test.com');
    if (!(await phoneInput.inputValue())) await phoneInput.fill('08099887766');
    await page.getByRole('button', { name: /Next/i }).first().click();

    // Step 2: dine-in + table pre-filled
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Next/i }).first().click();

    // Step 3: select existing tab and submit
    const existingTabRadio = page.locator('#existing-tab');
    await expect(existingTabRadio).toBeVisible({ timeout: 5000 });
    await existingTabRadio.click();
    await page.waitForTimeout(300);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/Order Added to Tab/i).first()).toBeVisible({
      timeout: 15000,
    });

    // ── Record partial payment (cash) — leave tab OPEN ────────
    await page.goto(`/dashboard/orders/tabs/${openTabId}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Customer Wants to Pay/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Read tab total
    const descText = (await dialog.locator('p').first().textContent()) ?? '';
    openTabTotal = parseNGN(descText);
    expect(openTabTotal).toBeGreaterThan(0);

    openPartialAmount = Math.floor(openTabTotal * 0.4);
    expect(openPartialAmount).toBeGreaterThan(0);

    await dialog.locator('label', { hasText: 'Partial Payment' }).click();
    await dialog.locator('#partialAmount').fill(String(openPartialAmount));
    await dialog.locator('#partialNote').fill('E2E open-tab partial payment');
    await dialog.locator('#partial-cash').click();
    await dialog
      .getByRole('button', { name: /Record Partial Payment/i })
      .click();
    await expect(
      page.getByText(/Partial Payment Recorded/i).first()
    ).toBeVisible({ timeout: 10000 });

    // ── Tab is intentionally left OPEN — no close ─────────────
  });

  test('daily report shows partial payment even though tab is still open', async ({
    page,
  }) => {
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Today' }).click();
    await page.waitForLoadState('networkidle');

    // The payment breakdown section MUST be visible even when no
    // orders were closed today — this was the original bug.
    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('Cash', { exact: true })).toBeVisible();

    const updated = await getReportAmounts(page);
    const cashDelta = updated.cash - baseline.cash;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    // Cash payment breakdown must include the partial payment from the open tab
    expect(cashDelta).toBeGreaterThanOrEqual(openPartialAmount);

    // REQ-017: Total Revenue must also include partial payments
    // (totalRevenue = paymentBreakdown.total, not item-based)
    expect(totalDelta).toBeGreaterThanOrEqual(openPartialAmount);
  });
});
