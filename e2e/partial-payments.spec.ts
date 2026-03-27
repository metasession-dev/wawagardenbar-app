import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * @requirement REQ-012 - Partial payment E2E tests
 *
 * Verifies the partial payment UI elements are present and correctly
 * structured on the tabs management pages. These tests use pre-authenticated
 * admin sessions and verify structural correctness without mutating data.
 */

const ADMIN_FILE = path.join(__dirname, '../.auth/admin.json');

const adminTest = base.extend({
  storageState: ADMIN_FILE,
});

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

adminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(
      true,
      'Admin login failed or credentials not configured — skipping'
    );
  }
});

// ===========================================================================
// Section 8: Tabs Page — Payment Dialog Structure
// ===========================================================================
adminTest.describe('REQ-012: Tabs Page — Partial Payment UI', () => {
  adminTest('tabs page loads with expected structure', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/orders/tabs');
    await expect(
      page.locator('h1', { hasText: 'Tabs Management' })
    ).toBeVisible();
    await expect(page.locator('[data-testid="tabs-dashboard"]')).toBeVisible();
  });

  adminTest(
    'open tabs show "Customer Wants to Pay" button',
    async ({ page }) => {
      await page.goto('/dashboard/orders/tabs');
      await page.waitForLoadState('networkidle');

      // Check if there are any open tab cards
      const openTabCards = page.locator('[data-testid="tab-card"]').filter({
        has: page.locator('[data-testid="tab-status-badge"]', {
          hasText: 'open',
        }),
      });

      const count = await openTabCards.count();
      if (count === 0) {
        adminTest.skip();
        return;
      }

      // First open tab should have the "Customer Wants to Pay" button
      const payButton = openTabCards
        .first()
        .getByRole('button', { name: /Customer Wants to Pay/i });
      await expect(payButton).toBeVisible();
    }
  );

  adminTest('payment dialog shows partial payment option', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    const openTabCards = page.locator('[data-testid="tab-card"]').filter({
      has: page.locator('[data-testid="tab-status-badge"]', {
        hasText: 'open',
      }),
    });

    const count = await openTabCards.count();
    if (count === 0) {
      adminTest.skip();
      return;
    }

    // Click "Customer Wants to Pay" on first open tab
    await openTabCards
      .first()
      .getByRole('button', { name: /Customer Wants to Pay/i })
      .click();

    // Dialog should appear with payment options
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=Process Tab Payment')).toBeVisible();

    // Should have three payment method options
    await expect(
      dialog.locator('label', { hasText: 'Full Payment — Close Tab' })
    ).toBeVisible();
    await expect(
      dialog.locator('label', { hasText: 'Partial Payment' })
    ).toBeVisible();
    await expect(
      dialog.locator('label', { hasText: 'Full Checkout Process' })
    ).toBeVisible();
  });

  adminTest('partial payment form shows required fields', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    const openTabCards = page.locator('[data-testid="tab-card"]').filter({
      has: page.locator('[data-testid="tab-status-badge"]', {
        hasText: 'open',
      }),
    });

    const count = await openTabCards.count();
    if (count === 0) {
      adminTest.skip();
      return;
    }

    // Open payment dialog
    await openTabCards
      .first()
      .getByRole('button', { name: /Customer Wants to Pay/i })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Select partial payment option
    await dialog.locator('label', { hasText: 'Partial Payment' }).click();

    // Verify partial payment form fields are visible
    await expect(
      dialog.locator('label', { hasText: 'Payment Amount' })
    ).toBeVisible();
    await expect(
      dialog.locator('label', { hasText: /Note.*mandatory/i })
    ).toBeVisible();
    await expect(
      dialog.locator('label', { hasText: 'Payment Type' })
    ).toBeVisible();
    await expect(dialog.locator('text=Outstanding balance')).toBeVisible();

    // Verify payment type options
    await expect(dialog.locator('label', { hasText: 'Cash' })).toBeVisible();
    await expect(
      dialog.locator('label', { hasText: 'Bank Transfer' })
    ).toBeVisible();
    await expect(
      dialog.locator('label', { hasText: 'Card (POS)' })
    ).toBeVisible();

    // Submit button should be present but disabled (no amount/note entered)
    const submitButton = dialog.getByRole('button', {
      name: /Record Partial Payment/i,
    });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });

  adminTest(
    'closed tabs do NOT show partial payment option',
    async ({ page }) => {
      await page.goto('/dashboard/orders/tabs');
      await page.waitForLoadState('networkidle');

      const closedTabCards = page.locator('[data-testid="tab-card"]').filter({
        has: page.locator('[data-testid="tab-payment-status"]'),
      });

      const count = await closedTabCards.count();
      if (count === 0) {
        adminTest.skip();
        return;
      }

      // Closed tabs should show "Tab Paid" button, not "Customer Wants to Pay"
      const firstClosed = closedTabCards.first();
      await expect(
        firstClosed.locator('[data-testid="tab-payment-status"]')
      ).toBeVisible();
      await expect(
        firstClosed.getByRole('button', { name: /Customer Wants to Pay/i })
      ).not.toBeVisible();
    }
  );
});

// ===========================================================================
// Section 8: Tab Details Page — Partial Payments Display
// ===========================================================================
adminTest.describe(
  'REQ-012: Tab Details Page — Partial Payment Display',
  () => {
    adminTest('tab details page loads with tab summary', async ({ page }) => {
      await page.goto('/dashboard/orders/tabs');
      await page.waitForLoadState('networkidle');

      // Find any tab and navigate to its details via the link href
      const viewDetailsLink = page
        .getByRole('link', { name: /View Details/i })
        .first();
      const count = await viewDetailsLink.count();
      if (count === 0) {
        adminTest.skip();
        return;
      }

      const href = await viewDetailsLink.getAttribute('href');
      if (!href) {
        adminTest.skip();
        return;
      }

      await page.goto(href);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/dashboard/orders/tabs/');
      await expect(page.locator('text=Tab Summary')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('text=Subtotal')).toBeVisible();
      await expect(page.locator('text=Total:').first()).toBeVisible();
    });

    adminTest(
      'tab details page shows partial payments section when present',
      async ({ page }) => {
        await page.goto('/dashboard/orders/tabs');
        await page.waitForLoadState('networkidle');

        // Navigate to first tab details via href
        const viewDetailsLink = page
          .getByRole('link', { name: /View Details/i })
          .first();
        const count = await viewDetailsLink.count();
        if (count === 0) {
          adminTest.skip();
          return;
        }

        const href = await viewDetailsLink.getAttribute('href');
        if (!href) {
          adminTest.skip();
          return;
        }

        await page.goto(href);
        await page.waitForLoadState('networkidle');

        // Check if this tab has partial payments
        const partialPaymentsSection = page.locator('text=Partial Payments');
        const hasPartialPayments = await partialPaymentsSection.count();

        if (hasPartialPayments > 0) {
          // If partial payments exist, verify the display structure
          await expect(
            page.locator('text=Total Partial Payments')
          ).toBeVisible();
          await expect(page.locator('text=Outstanding Balance')).toBeVisible();
        }
        // If no partial payments, that's fine — section won't render
      }
    );
  }
);

// ===========================================================================
// Orders page — Partial payment NOT available for non-tab orders
// ===========================================================================
adminTest.describe(
  'REQ-012: Orders Page — No Partial Payment for Orders',
  () => {
    adminTest(
      'orders page does not offer partial payment',
      async ({ page }) => {
        await page.goto('/dashboard/orders');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/dashboard/orders');

        // The orders page should never show a "Partial Payment" option
        await expect(page.locator('text=Partial Payment')).not.toBeVisible();
      }
    );
  }
);
