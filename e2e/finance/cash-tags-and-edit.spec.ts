import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

/**
 * E2E Tests — REQ-104 (Expense Tags), REQ-105 (Expense edit completeness),
 * REQ-106 (Cash Position + Cash Deposits)
 *
 * Regression tier — Should-priority, not a headline revenue-blocking flow.
 *
 * @requirement REQ-104
 * @requirement REQ-105
 * @requirement REQ-106
 */

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');
const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    // REQ-104/105/106: don't wait for 'networkidle' — this app keeps a
    // persistent Socket.IO connection open on every dashboard page, so
    // network activity never truly goes idle on a live deployment
    // (unlike CI's ephemeral instance). Wait for DOM readiness instead.
    await page.waitForLoadState('domcontentloaded');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

const adminTest = base.extend({ storageState: ADMIN_FILE });
adminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Admin login failed — skipping');
  }
});

const superAdminTest = base.extend({ storageState: SUPER_ADMIN_FILE });
superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Super-admin login failed — skipping');
  }
});

async function openExpenseForm(page: Page) {
  await page.goto('/dashboard/finance/expenses');
  const addExpenseBtn = page.locator('button', { hasText: /Add Expense/ });
  await expect(addExpenseBtn).toBeVisible({ timeout: 20000 });
  await addExpenseBtn.click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
}

async function fillMinimalLineItem(
  page: Page,
  dialog: ReturnType<Page['locator']>,
  description: string,
  cost: string
) {
  await dialog.locator('button[role="combobox"]').nth(0).click();
  await page
    .locator('[role="option"]', { hasText: /Operating Expense/ })
    .click();
  await dialog.locator('button[role="combobox"]').nth(1).click();
  await page.locator('[role="option"]').first().click();
  await dialog.locator('input[placeholder="e.g., Goat"]').fill(description);
  const numInputs = dialog.locator('input[type="number"]');
  await numInputs.nth(0).fill('1');
  await dialog.locator('button[role="combobox"]').nth(2).click();
  await page.locator('[role="option"]').first().click();
  await numInputs.nth(1).fill(cost);
}

// ===========================================================================
// REQ-104: Expense Tags
// ===========================================================================

adminTest.describe('REQ-104: Expense Tags — create inline + attach', () => {
  adminTest(
    'AC1/AC2: admin creates a new tag inline on a line item and it appears as a badge',
    async ({ page }) => {
      tagTest('REQ-104', [1, 2]);
      await openExpenseForm(page);
      const dialog = page.locator('[role="dialog"]');
      const uniqueTagName = `E2E-Tag-${Date.now()}`;

      await fillMinimalLineItem(page, dialog, 'Generator fuel', '5000');

      // Open the tag combobox for this line item and create a new tag.
      await dialog.getByRole('button', { name: /Add tags/i }).click();
      await page
        .getByPlaceholder(/Search or create a tag/i)
        .fill(uniqueTagName);
      await page
        .getByRole('button', { name: new RegExp(`Create "${uniqueTagName}"`) })
        .click();

      // The new tag should now render as a selected badge on the line item.
      await expect(dialog.getByText(uniqueTagName)).toBeVisible();
      await evidenceShot(page, 'REQ-104', 1, 'tag-created-inline');

      await dialog.locator('button', { hasText: /Save Expense/ }).click();
      await expect(page.getByText(/Expense submitted/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  );
});

// ===========================================================================
// REQ-105: Expense edit completeness
// ===========================================================================

superAdminTest.describe(
  'REQ-105: Expense edit dialog — full field visibility',
  () => {
    superAdminTest(
      'AC1/AC3: super-admin can edit transactionFee/receiptReference/referenceNumber and sees read-only audit block',
      async ({ page }) => {
        tagTest('REQ-105', [1, 3]);
        await page.goto('/dashboard/finance/expenses');
        await expect(page.locator('table')).toBeVisible({ timeout: 20000 });

        const rowMenuTrigger = page
          .getByRole('button', { name: 'Open menu' })
          .first();
        if (!(await rowMenuTrigger.count())) {
          superAdminTest.skip(true, 'No live expense record available to edit');
        }
        await rowMenuTrigger.click();
        await page.getByRole('menuitem', { name: /^Edit$/ }).click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        await dialog.getByLabel(/Transaction Fee/i).fill('150');
        await dialog.getByLabel(/Receipt Reference/i).fill('RCPT-E2E-1');
        await dialog.getByLabel(/Reference Number/i).fill('REF-E2E-1');
        await evidenceShot(page, 'REQ-105', 1, 'edit-fields-filled');

        // Read-only audit block should be visible with a Created label.
        await expect(dialog.getByText(/Created by:/i)).toBeVisible();
        await evidenceShot(page, 'REQ-105', 3, 'audit-block-visible');

        await dialog.locator('button', { hasText: /Save Changes/ }).click();
        await expect(page.getByText(/^Updated$/i).first()).toBeVisible({
          timeout: 10000,
        });
      }
    );
  }
);

// ===========================================================================
// REQ-106: Payment method on pending expense creation
// ===========================================================================

adminTest.describe('REQ-106: Payment method at expense creation', () => {
  adminTest(
    'AC2: Payment Method selector defaults to Cash and expense submits successfully',
    async ({ page }) => {
      tagTest('REQ-106', 2);
      await openExpenseForm(page);
      const dialog = page.locator('[role="dialog"]');

      await expect(dialog.getByText('Payment Method')).toBeVisible();
      await expect(dialog.getByLabel('Cash')).toBeChecked();
      await evidenceShot(page, 'REQ-106', 2, 'payment-method-defaults-cash');

      await fillMinimalLineItem(page, dialog, 'Cash-paid supplies', '2000');
      await dialog.locator('button', { hasText: /Save Expense/ }).click();
      await expect(page.getByText(/Expense submitted/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  );
});

// ===========================================================================
// REQ-106: Current Cash Position section
// ===========================================================================

adminTest.describe('REQ-106: Current Cash Position section', () => {
  adminTest(
    'AC1/AC7: Current Cash Position always renders on the Daily Report, with a defined state either way',
    async ({ page }) => {
      tagTest('REQ-106', [1, 7]);
      await page.goto('/dashboard/reports/daily');

      const section = page.locator('[data-testid="cash-position-section"]');
      await expect(section).toBeVisible({ timeout: 15000 });
      await evidenceShot(page, 'REQ-106', 1, 'cash-position-section-visible');

      // Either the "not seeded" empty state or the summary rows must render
      // — never neither (that would mean the section silently failed).
      const notSeeded = section.locator(
        '[data-testid="cash-position-not-seeded"]'
      );
      const summary = section.locator('[data-testid="cash-position-summary"]');
      await expect(notSeeded.or(summary)).toBeVisible();
    }
  );
});

// ===========================================================================
// REQ-106: Cash Deposits workflow
// ===========================================================================

adminTest.describe('REQ-106: Cash Deposits — create', () => {
  adminTest('AC5: admin can record a new cash deposit', async ({ page }) => {
    tagTest('REQ-106', 5);
    await page.goto('/dashboard/finance/deposits');
    const recordDepositBtn = page.locator('button', {
      hasText: /Record Deposit/,
    });
    await expect(recordDepositBtn).toBeVisible({ timeout: 20000 });
    await recordDepositBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/Amount/i).fill('10000');
    await evidenceShot(page, 'REQ-106', 5, 'deposit-form-filled');
    await dialog.locator('button', { hasText: /^Submit$/ }).click();

    await expect(
      page.getByText('Deposit submitted', { exact: true })
    ).toBeVisible({ timeout: 10000 });
  });
});

superAdminTest.describe('REQ-106: Cash Deposits — approve + transfer', () => {
  superAdminTest(
    'AC5: super-admin approves and confirms a pending deposit, reference optional',
    async ({ page }) => {
      tagTest('REQ-106', 5);
      await page.goto('/dashboard/finance/deposits');
      await expect(
        page.getByRole('heading', { name: /Cash Deposits/i })
      ).toBeVisible({ timeout: 20000 });

      const rowCount = await page.getByText('Pending').count();
      if (rowCount === 0) {
        superAdminTest.skip(true, 'No pending deposit available to approve');
      }

      await page
        .getByRole('button', { name: /^Approve$/ })
        .first()
        .click();
      await expect(page.getByText(/Deposit approved/i).first()).toBeVisible({
        timeout: 10000,
      });

      await page
        .getByRole('button', { name: /Confirm Deposit/ })
        .first()
        .click();
      const confirmDialog = page.locator('[role="dialog"]');
      await expect(confirmDialog).toBeVisible();
      await evidenceShot(page, 'REQ-106', 5, 'deposit-transfer-no-reference');
      await confirmDialog
        .locator('button', { hasText: /Confirm Deposit/ })
        .click();

      await expect(
        page.getByText('Deposit confirmed', { exact: true })
      ).toBeVisible({ timeout: 10000 });
    }
  );
});

// ===========================================================================
// REQ-106: Super-admin cash position adjustment
// ===========================================================================

superAdminTest.describe('REQ-106: Cash Position adjustment', () => {
  superAdminTest(
    'AC6: super-admin records an opening balance / correction and it updates immediately',
    async ({ page }) => {
      tagTest('REQ-106', 6);
      await page.goto('/dashboard/reports/daily');

      const adjustButton = page.locator(
        '[data-testid="cash-position-adjust-button"]'
      );
      await expect(adjustButton).toBeVisible({ timeout: 15000 });
      await adjustButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      const amountInput = dialog.locator('input[type="number"]');
      await amountInput.fill('50000');
      await evidenceShot(page, 'REQ-106', 6, 'adjustment-dialog-filled');
      await dialog.locator('button', { hasText: /^Save$/ }).click();

      await expect(
        page.getByText(/Opening balance set|Position corrected/i)
      ).toBeVisible({ timeout: 10000 });

      const summary = page.locator('[data-testid="cash-position-summary"]');
      await expect(summary).toBeVisible({ timeout: 10000 });
      await evidenceShot(
        page,
        'REQ-106',
        6,
        'position-updated-after-adjustment'
      );
    }
  );
});
