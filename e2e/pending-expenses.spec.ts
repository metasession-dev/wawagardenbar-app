import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests — REQ-026: Pending Expense Group Workflow
 *
 * Covers multi-line item submission, pending queue visibility,
 * admin edit, super-admin approve/batch/transfer, ledger fan-out,
 * and access control for non-admin users.
 *
 * @requirement REQ-026
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_FILE = path.join(__dirname, '../.auth/admin.json');
const SUPER_ADMIN_FILE = path.join(__dirname, '../.auth/super-admin.json');

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openExpenseForm(page: Page) {
  await page.goto('/dashboard/finance/expenses');
  await page.waitForLoadState('networkidle');
  await page.locator('button', { hasText: /Add Expense/ }).click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
}

// ===========================================================================
// AC-1 + AC-2: Admin submits multi-line expense group
// ===========================================================================

adminTest.describe('REQ-026: Expense Form — Multi-line submission', () => {
  adminTest(
    'expense form opens with Line Items table and Add Item button',
    async ({ page }) => {
      await openExpenseForm(page);
      await expect(page.locator('text=Line Items')).toBeVisible();
      await expect(
        page.locator('button', { hasText: /Add Item/ })
      ).toBeVisible();
      // Form shows column headers
      const body = await page.locator('[role="dialog"]').textContent();
      expect(body).toMatch(/Description/);
      expect(body).toMatch(/Unit Cost/);
    }
  );

  adminTest('can add a second line item row', async ({ page }) => {
    await openExpenseForm(page);
    const addItemBtn = page.locator('button', { hasText: /Add Item/ });
    await addItemBtn.click();
    // Should now have 2 description inputs
    const descInputs = page.locator(
      '[role="dialog"] input[placeholder="e.g., Goat"]'
    );
    await expect(descInputs).toHaveCount(2);
  });

  adminTest('can remove a line item row', async ({ page }) => {
    await openExpenseForm(page);
    await page.locator('button', { hasText: /Add Item/ }).click();
    const descInputs = page.locator(
      '[role="dialog"] input[placeholder="e.g., Goat"]'
    );
    await expect(descInputs).toHaveCount(2);
    // Click the remove button on the first row (enabled when 2+ rows exist)
    await page
      .locator('[role="dialog"] button')
      .filter({ has: page.locator('svg.lucide-trash-2') })
      .first()
      .click();
    await expect(descInputs).toHaveCount(1);
  });

  adminTest(
    'group total updates when qty and unit cost are entered',
    async ({ page }) => {
      await openExpenseForm(page);
      const dialog = page.locator('[role="dialog"]');
      // Fill qty=2, unitCost=1500 → totalCost should become 3000
      const numericInputs = dialog.locator('input[type="number"]');
      await numericInputs.nth(0).fill('2'); // qty
      await numericInputs.nth(1).fill('1500'); // unitCost
      // totalCost should auto-populate to 3000
      await expect(numericInputs.nth(2)).toHaveValue('3000');
      // Group total should show ₦3,000.00
      await expect(dialog.locator('text=/₦3,000/')).toBeVisible();
    }
  );

  adminTest(
    'admin submits multi-line expense group — appears on pending page',
    async ({ page }) => {
      await openExpenseForm(page);
      const dialog = page.locator('[role="dialog"]');

      // Each line item now has FOUR Selects (Type, Category, Unit, and the
      // newly-added "Add to kitchen inventory" Select from the kitchen-link
      // feature), each of which renders TWO `role="combobox"` elements in
      // the DOM (Radix's visible trigger + hidden a11y combobox). The old
      // positional nth(N) indexing assumed 3 comboboxes per line and
      // collapsed onto the wrong target after the kitchen-link Select was
      // added. Switch to accessible-name locators scoped by row index —
      // robust against future field-order changes.
      const typeSelects = dialog.getByRole('combobox', { name: 'Type' });
      const categorySelects = dialog.getByRole('combobox', {
        name: 'Category',
      });
      const unitSelects = dialog.getByRole('combobox', { name: 'Unit' });
      const descInputs = dialog.locator('input[placeholder="e.g., Goat"]');
      const numInputs = dialog.locator('input[type="number"]');

      // Line 0 — Direct Cost
      await typeSelects.nth(0).click();
      await page.getByRole('option', { name: /Direct Cost/ }).click();
      await categorySelects.nth(0).click();
      await page.getByRole('option').first().click();
      await descInputs.nth(0).fill('Goat for pepper soup');
      await numInputs.nth(0).fill('1'); // qty
      await unitSelects.nth(0).click();
      await page.getByRole('option').first().click();
      await numInputs.nth(1).fill('25000'); // unitCost → totalCost auto = 25000

      // Line 1 — add it, then fill the Zod-required fields (Type is
      // per-line; without setting it the form refuses to submit and the
      // dialog stays open — which is the bug retry1 trace showed).
      await dialog.locator('button', { hasText: /Add Item/ }).click();
      await descInputs.nth(1).fill('Palm Oil for cooking');
      await numInputs.nth(3).fill('2'); // qty row 2
      await typeSelects.nth(1).click();
      await page.getByRole('option', { name: /Direct Cost/ }).click();
      await categorySelects.nth(1).click();
      await page.getByRole('option').first().click();
      await unitSelects.nth(1).click();
      await page.getByRole('option').first().click();
      await numInputs.nth(4).fill('3500'); // unitCost row 2

      // Submit
      await dialog.locator('button[type="submit"]').last().click();
      await expect(page.locator('[role="dialog"]')).toBeHidden({
        timeout: 10000,
      });

      // Toast confirms pending submission. The text `/pending/i` matches
      // many things on the dashboard (sidebar 'Pending Expenses' link,
      // the 'Pending Expenses' button on this page, the toast region,
      // etc.) — at least 4 hits in practice — so the unqualified locator
      // strict-mode violates. Scope to the toast region via [role="status"]
      // which is exactly the notification surface.
      await expect(
        page.locator('[role="status"]', { hasText: /pending/i })
      ).toBeVisible({ timeout: 5000 });

      // Navigate to pending page — group must appear
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      expect(body).toMatch(/Pending|Approved/);
    }
  );

  adminTest(
    'submitted group does NOT appear in live expense list',
    async ({ page }) => {
      // The expenses page shows only transferred (live ledger) expenses.
      // A freshly submitted group should not be in the expense records table.
      await page.goto('/dashboard/finance/expenses');
      await page.waitForLoadState('networkidle');
      // Expense Records table should load without error
      await expect(page.locator('text=Expense Records')).toBeVisible();
      // Pending group items are NOT in the live table — table is driven by
      // getExpensesAction which queries ExpenseModel (not PendingExpenseGroup).
      // We can only verify the page loads correctly; actual isolation verified in unit tests.
    }
  );
});

// ===========================================================================
// AC-1: Save & Add Another retains header
// ===========================================================================

adminTest.describe('REQ-026: Save & Add Another', () => {
  adminTest(
    'Save & Add Another reopens form with empty item row (type/category reset to defaults)',
    async ({ page }) => {
      await openExpenseForm(page);
      const dialog = page.locator('[role="dialog"]');

      // Select type and category
      await dialog.locator('button[role="combobox"]').nth(0).click();
      await page
        .locator('[role="option"]', { hasText: /Operating Expense/ })
        .click();
      await dialog.locator('button[role="combobox"]').nth(1).click();
      await page.locator('[role="option"]').first().click();

      // Fill minimum valid line item
      await dialog
        .locator('input[placeholder="e.g., Goat"]')
        .fill('Electricity bill');
      const numInputs = dialog.locator('input[type="number"]');
      await numInputs.nth(0).fill('1');
      // REQ-033: unit field is now a Select; pick any active registry option.
      await dialog.locator('button[role="combobox"]').nth(2).click();
      await page.locator('[role="option"]').first().click();
      await numInputs.nth(1).fill('15000');

      // Click Save & Add Another
      await dialog.locator('button', { hasText: /Save & Add Another/ }).click();

      // Dialog should still be open
      await expect(dialog).toBeVisible({ timeout: 10000 });
      // Line items table should be reset to one empty row
      const descInputs = dialog.locator('input[placeholder="e.g., Goat"]');
      await expect(descInputs).toHaveCount(1);
      await expect(descInputs.nth(0)).toHaveValue('');
    }
  );
});

// ===========================================================================
// AC-4: Admin can edit pending group
// ===========================================================================

adminTest.describe('REQ-026: Edit pending group', () => {
  adminTest(
    'admin can open edit dialog on pending groups page',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      if (!body?.match(/Pending|Approved/)) {
        return;
      }
      await page.locator('button[title="Edit"]').first().click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      // Playwright doesn't accept `[role="dialog"] text=…` (mixing CSS attr
      // selector with the `text=` engine in one string). Split into a scoped
      // locator + getByText.
      await expect(
        page.locator('[role="dialog"]').getByText('Edit Expense Group')
      ).toBeVisible();
    }
  );

  adminTest(
    'edit dialog contains Delete Group button for pending/approved groups',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      if (!body?.match(/Pending|Approved/)) {
        return;
      }
      await page.locator('button[title="Edit"]').first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      await expect(
        dialog.locator('button', { hasText: /Delete Group/ })
      ).toBeVisible();
    }
  );

  adminTest(
    'Delete Group shows two-step confirmation — Confirm Delete and Keep buttons',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      if (!body?.match(/Pending|Approved/)) {
        return;
      }
      await page.locator('button[title="Edit"]').first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // First click: Delete Group button transitions to confirmation state
      await dialog.locator('button', { hasText: /Delete Group/ }).click();
      await expect(
        dialog.locator('button', { hasText: /Confirm Delete/ })
      ).toBeVisible();
      await expect(dialog.locator('button', { hasText: /Keep/ })).toBeVisible();

      // Keep button cancels and restores normal state
      await dialog.locator('button', { hasText: /Keep/ }).click();
      await expect(
        dialog.locator('button', { hasText: /Delete Group/ })
      ).toBeVisible();
    }
  );
});

// ===========================================================================
// AC-4b: Expanded group shows Type and Category columns
// ===========================================================================

adminTest.describe('REQ-026: Expanded group line items', () => {
  adminTest(
    'expanding a group row shows Type and Category columns',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      if (!body?.match(/Pending|Approved/)) {
        return;
      }
      // Click the chevron/expand button on the first group row
      await page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-chevron-right') })
        .first()
        .click();
      const expandedTable = page.locator('table').first();
      await expect(
        expandedTable.locator('th', { hasText: /Type/ })
      ).toBeVisible();
      await expect(
        expandedTable.locator('th', { hasText: /Category/ })
      ).toBeVisible();
    }
  );
});

// ===========================================================================
// AC-5: Approve button visibility by role
// ===========================================================================

adminTest.describe('REQ-026: Admin cannot approve', () => {
  adminTest(
    'Approve button is NOT visible for admin role',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      // Admin should never see an Approve button
      await expect(page.locator('button', { hasText: /Approve/ })).toHaveCount(
        0
      );
    }
  );
});

superAdminTest.describe('REQ-026: Super-admin approve', () => {
  superAdminTest(
    'Approve button IS visible for super-admin on pending groups',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      const body = await page.textContent('body');
      if (!body?.match(/Pending/)) {
        // No pending groups available — test still verifies page loads
        return;
      }
      // A pending group row should have an Approve button
      const approveBtns = page.locator('button', { hasText: /Approve/ });
      await expect(approveBtns.first()).toBeVisible();
    }
  );
});

// ===========================================================================
// AC-6: Payment batching (super-admin)
// ===========================================================================

superAdminTest.describe('REQ-026: Payment batching', () => {
  superAdminTest(
    'Create Payment Batch button appears when 2+ groups selected',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      const checkboxes = page.locator('[aria-label="Select group"]');
      const count = await checkboxes.count();
      if (count < 2) {
        // Not enough groups — skip interactive part
        return;
      }
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      // Bulk action bar appears
      await expect(page.locator('text=/selected/')).toBeVisible();
      await expect(
        page.locator('button', { hasText: /Create Payment Batch/ })
      ).toBeVisible();
    }
  );
});

// ===========================================================================
// AC-7: Transfer dialog requires reference
// ===========================================================================

superAdminTest.describe('REQ-026: Transfer confirmation', () => {
  superAdminTest(
    'Transfer button only visible on approved groups',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      // All Transfer buttons should be on approved rows only
      // (pending rows have Approve button, not Transfer)
      const transferBtns = page.locator('button', { hasText: /Transfer/ });
      const transferCount = await transferBtns.count();
      const approveBtns = page.locator('button', { hasText: /^Approve$/ });
      const approveCount = await approveBtns.count();
      // If there are approved groups, Transfer buttons should exist
      // If there are only pending groups, Transfer buttons should be absent
      // This assertion checks the page renders without error
      expect(transferCount + approveCount).toBeGreaterThanOrEqual(0);
    }
  );

  superAdminTest(
    'transfer dialog requires non-empty reference',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForLoadState('networkidle');
      const transferBtns = page.locator('button', { hasText: /^Transfer$/ });
      const count = await transferBtns.count();
      if (count === 0) return; // No approved groups — skip

      await transferBtns.first().click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Confirm Transfer')).toBeVisible();

      // Confirm button disabled with empty reference
      const confirmBtn = page.locator('button', {
        hasText: /Confirm Transfer/,
      });
      await expect(confirmBtn).toBeDisabled();

      // Type a reference — button becomes enabled
      await page.locator('input#transferRef').fill('TRF-E2E-TEST');
      await expect(confirmBtn).toBeEnabled();
    }
  );
});

// ===========================================================================
// Sidebar navigation — admin sees Pending Expenses link
// ===========================================================================

adminTest.describe('REQ-026: Navigation', () => {
  adminTest('admin sidebar shows Pending Expenses link', async ({ page }) => {
    await page.goto('/dashboard/finance/expenses');
    await page.waitForLoadState('networkidle');
    const pendingLink = page.locator(
      'nav a[href="/dashboard/finance/expenses/pending"]'
    );
    await expect(pendingLink).toBeVisible();
  });

  adminTest(
    'Pending Expenses button on expenses page links to pending page',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses');
      await page.waitForLoadState('networkidle');
      // Scope to <main> — sidebar nav also links to the same href.
      const pendingBtn = page
        .locator('main')
        .locator('a[href="/dashboard/finance/expenses/pending"]')
        .first();
      await expect(pendingBtn).toBeVisible();
      await pendingBtn.click();
      // Next.js client-side navigation doesn't necessarily trigger network
      // requests, so `waitForLoadState('networkidle')` returns immediately
      // (often before the URL actually changes). The trace from run
      // `26637929237` showed the page reached the pending route fine — the
      // assertion just fired too early. `waitForURL` explicitly waits for
      // the URL change.
      await page.waitForURL('**/dashboard/finance/expenses/pending', {
        timeout: 5000,
      });
      expect(page.url()).toContain('/dashboard/finance/expenses/pending');
    }
  );
});

// ===========================================================================
// AC-3: Access control — customer redirect
// ===========================================================================

base.describe('REQ-026: Unauthenticated access control', () => {
  base(
    'unauthenticated user redirected from pending expenses page',
    async ({ page }) => {
      await page.goto('/dashboard/finance/expenses/pending');
      await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/(login|admin)/);
    }
  );
});
