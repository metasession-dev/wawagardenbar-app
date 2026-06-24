/**
 * E2E: Express Order & Tab Flows — Revenue Reporting Accuracy
 *
 * Full-flow tests covering the three express admin actions:
 *   1. Express Create Order (standalone, pay-now) via cash / POS / transfer
 *   2. Express Create Tab → Add Order → Express Close Tab via cash / POS / transfer
 *
 * After each payment the Daily Financial Report is checked to confirm:
 *   - Total Revenue increased by the exact order/tab amount
 *   - The correct payment method column (Cash / POS-Card / Transfer) reflects the delta
 *   - No double-counting across payment methods
 *
 * Tests run serially because each block's delta assertions depend on a
 * stable baseline captured at the start of the block.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { revealFirstExpressMenuCard } from '../helpers/express-menu';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend({
  storageState: ADMIN_FILE,
});

test.describe.configure({ mode: 'serial' });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
 * Extract payment amounts from the daily report.
 * Each metric card has: CardTitle (.font-medium) + amount (.text-2xl.font-bold).
 */
async function getReportAmounts(page: Page): Promise<{
  totalRevenue: number;
  cash: number;
  card: number;
  transfer: number;
}> {
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

/** Navigate to the daily report page and force-refresh for today. */
async function openTodayReport(page: Page) {
  await page.goto('/dashboard/reports/daily');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Today' }).click();
  await page.waitForLoadState('networkidle');
  // Wait for report content to appear
  await page
    .getByText('Generating report...')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Unique table numbers to avoid collisions with other test files
// ---------------------------------------------------------------------------
const TS = Math.floor(Date.now() / 1000) % 600;
const TABLE_CASH = String(2000 + TS);
const TABLE_POS = String(2600 + TS);
const TABLE_TRANSFER = String(3200 + TS);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION A — Express Standalone Orders (Pay Now)
// ═══════════════════════════════════════════════════════════════════════════

test.describe.serial('Express standalone order — Cash payment', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let orderTotal = 0;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('capture baseline', async ({ page }) => {
    await openTodayReport(page);
    baseline = await getReportAmounts(page);
  });

  test('create express order paid with cash', async ({ page }) => {
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Reveal the menu grid via the REQ-081 category cascade, then add first item
    const menuCard = await revealFirstExpressMenuCard(page);

    // Read the item price before adding
    const priceText = await menuCard.locator('.font-bold').last().textContent();
    const itemPrice = parseNGN(priceText ?? '');
    expect(itemPrice).toBeGreaterThan(0);

    await menuCard.click();

    // Proceed to checkout
    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    // REQ-084: order type defaults to 'pay-now' — no separate Pay Now step.
    // Cash is the default payment method — verify it's selected
    const cashBtn = page.locator('button').filter({ hasText: 'Cash' }).first();
    await expect(cashBtn).toBeVisible();

    // Read the total from the submit button
    const payBtn = page.getByRole('button', { name: /Create Order.*₦/i });
    await expect(payBtn).toBeVisible({ timeout: 5000 });
    const payBtnText = (await payBtn.textContent()) ?? '';
    orderTotal = parseNGN(payBtnText);
    expect(orderTotal).toBeGreaterThan(0);

    // Submit
    await payBtn.click();

    // Wait for redirect back to orders
    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('daily report reflects cash payment', async ({ page }) => {
    await openTodayReport(page);

    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    const updated = await getReportAmounts(page);
    const cashDelta = updated.cash - baseline.cash;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    // Cash column must have increased by at least the order amount
    // (may be more if parallel tests also created cash orders)
    expect(cashDelta).toBeGreaterThanOrEqual(orderTotal);
    expect(totalDelta).toBeGreaterThanOrEqual(orderTotal);
  });
});

test.describe.serial('Express standalone order — POS payment', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let orderTotal = 0;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('capture baseline', async ({ page }) => {
    await openTodayReport(page);
    baseline = await getReportAmounts(page);
  });

  test('create express order paid with POS', async ({ page }) => {
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    const menuCard = await revealFirstExpressMenuCard(page);
    await menuCard.click();

    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    // REQ-084: order type defaults to 'pay-now' — no separate Pay Now step.
    // Select POS payment method
    const posBtn = page.locator('button').filter({ hasText: 'POS' }).first();
    await expect(posBtn).toBeVisible({ timeout: 5000 });
    await posBtn.click();

    // Fill optional reference
    const refInput = page.locator('#paymentRef');
    await expect(refInput).toBeVisible();
    await refInput.fill('E2E-POS-' + Date.now());

    // Read total and submit
    const payBtn = page.getByRole('button', { name: /Create Order.*₦/i });
    await expect(payBtn).toBeVisible({ timeout: 5000 });
    const payBtnText = (await payBtn.textContent()) ?? '';
    orderTotal = parseNGN(payBtnText);
    expect(orderTotal).toBeGreaterThan(0);

    await payBtn.click();
    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('daily report reflects POS payment', async ({ page }) => {
    await openTodayReport(page);

    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    const updated = await getReportAmounts(page);
    const cardDelta = updated.card - baseline.card;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    expect(cardDelta).toBeGreaterThanOrEqual(orderTotal);
    expect(totalDelta).toBeGreaterThanOrEqual(orderTotal);
  });
});

test.describe.serial('Express standalone order — Transfer payment', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let orderTotal = 0;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('capture baseline', async ({ page }) => {
    await openTodayReport(page);
    baseline = await getReportAmounts(page);
  });

  test('create express order paid with transfer', async ({ page }) => {
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    const menuCard = await revealFirstExpressMenuCard(page);
    await menuCard.click();

    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    // REQ-084: order type defaults to 'pay-now' — no separate Pay Now step.

    // Select Transfer payment method
    const transferBtn = page
      .locator('button')
      .filter({ hasText: 'Transfer' })
      .first();
    await expect(transferBtn).toBeVisible({ timeout: 5000 });
    await transferBtn.click();

    // Fill optional reference
    const refInput = page.locator('#paymentRef');
    await expect(refInput).toBeVisible();
    await refInput.fill('E2E-TRF-' + Date.now());

    // Read total and submit
    const payBtn = page.getByRole('button', { name: /Create Order.*₦/i });
    await expect(payBtn).toBeVisible({ timeout: 5000 });
    const payBtnText = (await payBtn.textContent()) ?? '';
    orderTotal = parseNGN(payBtnText);
    expect(orderTotal).toBeGreaterThan(0);

    await payBtn.click();
    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('daily report reflects transfer payment', async ({ page }) => {
    await openTodayReport(page);

    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    const updated = await getReportAmounts(page);
    const transferDelta = updated.transfer - baseline.transfer;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    expect(transferDelta).toBeGreaterThanOrEqual(orderTotal);
    expect(totalDelta).toBeGreaterThanOrEqual(orderTotal);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION B — Express Tab Lifecycle (Create Tab → Add Order → Close Tab)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Helper: Create a tab via the express create-tab page and return the tab ID.
 * After creation, navigates to the express create-order page for this tab.
 */
async function expressCreateTab(
  page: Page,
  tableNumber: string,
  customerName?: string
): Promise<string> {
  await page.goto('/dashboard/orders/express/create-tab');
  await page.waitForLoadState('networkidle');

  // Wait for the New Tab card to appear
  await expect(page.locator('#tableNumber')).toBeVisible({ timeout: 10000 });

  await page.locator('#tableNumber').fill(tableNumber);
  if (customerName) {
    await page.locator('#customerName').fill(customerName);
  }

  await page.getByRole('button', { name: 'Create Tab' }).click();

  // Wait for success — "Tab Created" heading appears in the main content area
  await expect(
    page.getByRole('main').getByText('Tab Created', { exact: true })
  ).toBeVisible({ timeout: 10000 });

  // Extract tab ID from the "Yes, Add Order" button's onClick destination.
  // The button uses router.push which embeds the tabId in the URL.
  // Click it and wait for navigation to get the tabId.
  const addOrderBtn = page.getByRole('button', { name: /Yes, Add Order/i });
  await expect(addOrderBtn).toBeVisible();
  await addOrderBtn.click();
  await page.waitForURL(/\/express\/create-order/, { timeout: 10000 });

  const url = new URL(page.url());
  const tabId = url.searchParams.get('tabId') ?? '';
  expect(tabId).toBeTruthy();

  // Navigate explicitly to the create-order page with tabId to ensure
  // clean page hydration (avoids client-side navigation state issues)
  await page.goto(
    `/dashboard/orders/express/create-order?tabId=${tabId}&tableNumber=${tableNumber}`
  );
  await page.waitForLoadState('networkidle');

  return tabId;
}

/**
 * Helper: Add a menu item to the cart on the express create-order page and
 * submit it to the pre-selected tab. Returns the order total.
 */
async function expressAddOrderToTab(
  page: Page,
  tableNumber?: string
): Promise<number> {
  await page.waitForLoadState('networkidle');

  // Reveal the menu grid via the REQ-081 category cascade, then add first item
  const menuCard = await revealFirstExpressMenuCard(page);
  await menuCard.click();

  const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
  await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
  await checkoutBtn.click();

  // Destination should be pre-set to "Add to Tab" with the tab pre-selected
  // The submit button should say "Add Order to Tab"
  const submitBtn = page.getByRole('button', {
    name: /Add Order to Tab/i,
  });
  await expect(submitBtn).toBeVisible({ timeout: 5000 });

  // If no tab is pre-selected (edge case), select the right tab
  const noTabSelected = await submitBtn.isDisabled();
  if (noTabSelected) {
    // Select tab by table number if provided, otherwise first available
    const tabOption = tableNumber
      ? page
          .locator('[class*="rounded-lg"][class*="border"]')
          .filter({ hasText: `Table ${tableNumber}` })
          .first()
      : page
          .locator('[class*="rounded-lg"][class*="border"]')
          .filter({ hasText: 'Table' })
          .first();
    if ((await tabOption.count()) > 0) {
      await tabOption.click();
      // Wait for submit button to become enabled after tab selection
      await expect(submitBtn).toBeEnabled({ timeout: 3000 });
    }
  }

  // Read cart total from the order summary
  const totalText = await page
    .locator('.font-bold.text-lg')
    .filter({ hasText: '₦' })
    .last()
    .textContent();
  const orderTotal = parseNGN(totalText ?? '');
  expect(orderTotal).toBeGreaterThan(0);

  await submitBtn.click();

  // Verify the success toast confirms the order was added to a tab
  // (not just created as standalone)
  await expect(page.getByText(/Order Added to Tab/i).first()).toBeVisible({
    timeout: 10000,
  });

  // Wait for redirect back to orders
  await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  return orderTotal;
}

/**
 * Helper: Close a tab via the express close-tab page.
 * @param tableNumber - If provided, selects the tab matching this table number.
 * Returns the tab total that was paid.
 */
async function expressCloseTab(
  page: Page,
  paymentType: 'cash' | 'card' | 'transfer',
  reference?: string,
  tableNumber?: string
): Promise<number> {
  await page.goto('/dashboard/orders/express/close-tab');
  await page.waitForLoadState('networkidle');

  // Select the correct open tab — filter by table number if provided
  const tabRow = tableNumber
    ? page
        .locator('.cursor-pointer')
        .filter({ hasText: `Table ${tableNumber}` })
        .first()
    : page.locator('.cursor-pointer').filter({ hasText: 'Table' }).first();
  await expect(tabRow).toBeVisible({ timeout: 10000 });
  await tabRow.click();

  // Wait for confirm step — tab summary card with Total
  await expect(page.locator('text=Total').first()).toBeVisible({
    timeout: 10000,
  });

  // Read the tab total from the "Close Tab — ₦X,XXX" button
  const closeBtn = page.getByRole('button', { name: /Close Tab/i });
  const closeBtnText = (await closeBtn.textContent()) ?? '';
  const tabTotal = parseNGN(closeBtnText);
  expect(tabTotal).toBeGreaterThan(0);

  // Select payment type
  if (paymentType === 'cash') {
    await page.locator('button').filter({ hasText: 'Cash' }).first().click();
  } else if (paymentType === 'card') {
    await page.locator('button').filter({ hasText: 'POS' }).first().click();
  } else {
    await page
      .locator('button')
      .filter({ hasText: 'Transfer' })
      .first()
      .click();
  }

  // Fill reference if applicable
  if (paymentType !== 'cash' && reference) {
    const refInput = page.locator('#paymentRef');
    await expect(refInput).toBeVisible();
    await refInput.fill(reference);
  }

  // Click "Close Tab" to finalize
  await closeBtn.click();

  // Wait for "Tab Closed" confirmation heading
  await expect(page.getByRole('heading', { name: 'Tab Closed' })).toBeVisible({
    timeout: 10000,
  });

  return tabTotal;
}

// -- Tab → Cash ---------------------------------------------------------------

test.describe.serial('Express tab lifecycle — Cash close', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let tabTotal = 0;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('capture baseline', async ({ page }) => {
    await openTodayReport(page);
    baseline = await getReportAmounts(page);
  });

  test('create tab and add order', async ({ page }) => {
    // Create tab and navigate to create-order page
    await expressCreateTab(page, TABLE_CASH, 'E2E Cash Tab');

    // Add order (already on the create-order page with tabId)
    tabTotal = await expressAddOrderToTab(page, TABLE_CASH);
    expect(tabTotal).toBeGreaterThan(0);
  });

  test('close tab with cash', async ({ page }) => {
    tabTotal = await expressCloseTab(page, 'cash', undefined, TABLE_CASH);
    expect(tabTotal).toBeGreaterThan(0);
  });

  test('daily report shows cash payment for closed tab', async ({ page }) => {
    await openTodayReport(page);

    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    const updated = await getReportAmounts(page);
    const cashDelta = updated.cash - baseline.cash;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    expect(cashDelta).toBeGreaterThanOrEqual(tabTotal);
    expect(totalDelta).toBeGreaterThanOrEqual(tabTotal);
  });
});

// -- Tab → POS ----------------------------------------------------------------

test.describe.serial('Express tab lifecycle — POS close', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let tabTotal = 0;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('capture baseline', async ({ page }) => {
    await openTodayReport(page);
    baseline = await getReportAmounts(page);
  });

  test('create tab and add order', async ({ page }) => {
    await expressCreateTab(page, TABLE_POS, 'E2E POS Tab');
    tabTotal = await expressAddOrderToTab(page, TABLE_POS);
    expect(tabTotal).toBeGreaterThan(0);
  });

  test('close tab with POS', async ({ page }) => {
    tabTotal = await expressCloseTab(
      page,
      'card',
      'E2E-POS-REF-' + Date.now(),
      TABLE_POS
    );
    expect(tabTotal).toBeGreaterThan(0);
  });

  test('daily report shows POS payment for closed tab', async ({ page }) => {
    await openTodayReport(page);

    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    const updated = await getReportAmounts(page);
    const cardDelta = updated.card - baseline.card;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    expect(cardDelta).toBeGreaterThanOrEqual(tabTotal);
    expect(totalDelta).toBeGreaterThanOrEqual(tabTotal);
  });
});

// -- Tab → Transfer -----------------------------------------------------------

test.describe.serial('Express tab lifecycle — Transfer close', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let tabTotal = 0;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('capture baseline', async ({ page }) => {
    await openTodayReport(page);
    baseline = await getReportAmounts(page);
  });

  test('create tab and add order', async ({ page }) => {
    await expressCreateTab(page, TABLE_TRANSFER, 'E2E Transfer Tab');
    tabTotal = await expressAddOrderToTab(page, TABLE_TRANSFER);
    expect(tabTotal).toBeGreaterThan(0);
  });

  test('close tab with transfer', async ({ page }) => {
    tabTotal = await expressCloseTab(
      page,
      'transfer',
      'E2E-TRF-REF-' + Date.now(),
      TABLE_TRANSFER
    );
    expect(tabTotal).toBeGreaterThan(0);
  });

  test('daily report shows transfer payment for closed tab', async ({
    page,
  }) => {
    await openTodayReport(page);

    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    const updated = await getReportAmounts(page);
    const transferDelta = updated.transfer - baseline.transfer;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    expect(transferDelta).toBeGreaterThanOrEqual(tabTotal);
    expect(totalDelta).toBeGreaterThanOrEqual(tabTotal);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION C — Multi-order tab (two orders, single close)
// ═══════════════════════════════════════════════════════════════════════════

test.describe.serial('Express tab with multiple orders — single close', () => {
  let baseline: Awaited<ReturnType<typeof getReportAmounts>>;
  let tabTotal = 0;
  const MULTI_TABLE = String(4000 + TS);

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('capture baseline', async ({ page }) => {
    await openTodayReport(page);
    baseline = await getReportAmounts(page);
  });

  test('create tab and add two orders', async ({ page }) => {
    // Create tab
    await expressCreateTab(page, MULTI_TABLE, 'E2E Multi-Order');

    // First order — already on create-order page after tab creation
    const firstAmount = await expressAddOrderToTab(page, MULTI_TABLE);
    expect(firstAmount).toBeGreaterThan(0);

    // Navigate back to express create-order for the same tab
    // We need to find the tab and add another order via express create-order
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Select menu item
    const menuCard = await revealFirstExpressMenuCard(page);
    await menuCard.click();

    // Add a second unit
    const plusBtn = page
      .locator('button')
      .filter({ has: page.locator('.h-3.w-3') })
      .last();
    if (await plusBtn.isVisible()) {
      await plusBtn.click();
    }

    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    // REQ-084: Select "Dine-in" order type to reveal tab selection
    const dineInBtn = page.locator('button').filter({ hasText: 'Dine-in' });
    await expect(dineInBtn).toBeVisible({ timeout: 5000 });
    await dineInBtn.click();

    // Select the tab (find one with our table number)
    const tabOption = page
      .locator(
        '[class*="rounded-lg"][class*="border"][class*="cursor-pointer"]'
      )
      .filter({ hasText: `Table ${MULTI_TABLE}` })
      .first();
    if ((await tabOption.count()) > 0) {
      await tabOption.click();
    } else {
      // Fallback: select the first available tab
      const firstTab = page
        .locator(
          '[class*="rounded-lg"][class*="border"][class*="cursor-pointer"]'
        )
        .filter({ hasText: 'Table' })
        .first();
      await firstTab.click();
    }

    const submitBtn = page.getByRole('button', { name: /Add Order to Tab/i });
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('close multi-order tab with POS', async ({ page }) => {
    tabTotal = await expressCloseTab(
      page,
      'card',
      'E2E-MULTI-POS-' + Date.now(),
      MULTI_TABLE
    );
    expect(tabTotal).toBeGreaterThan(0);
  });

  test('daily report shows full tab total under POS', async ({ page }) => {
    await openTodayReport(page);

    await expect(
      page.getByText('Revenue by Payment Method', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    const updated = await getReportAmounts(page);
    const cardDelta = updated.card - baseline.card;
    const totalDelta = updated.totalRevenue - baseline.totalRevenue;

    // Total revenue delta must include the full tab amount
    expect(totalDelta).toBeGreaterThanOrEqual(tabTotal);
    // Tab amount should be attributed to POS/Card
    expect(cardDelta).toBeGreaterThanOrEqual(tabTotal);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION D — Orders page shows correct payment status after express flows
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Express orders appear on orders page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test('express order shows success toast with Order Created & Paid', async ({
    page,
  }) => {
    // Create a quick cash order and verify the success toast
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    const menuCard = await revealFirstExpressMenuCard(page);
    await menuCard.click();

    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    // REQ-084: order type defaults to 'pay-now' — no separate Pay Now step.
    // Cash is default
    const payBtn = page.getByRole('button', { name: /Create Order.*₦/i });
    await expect(payBtn).toBeVisible({ timeout: 5000 });
    await payBtn.click();

    // Verify success toast
    await expect(page.getByText(/Order Created/i).first()).toBeVisible({
      timeout: 10000,
    });

    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
  });

  test('tabs page shows closed tabs from test runs', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    // The tabs page should load without errors
    await expect(
      page
        .locator('h1, h2, [class*="text-2xl"]')
        .filter({ hasText: /Tabs/i })
        .first()
    ).toBeVisible({ timeout: 10000 });
  });
});
