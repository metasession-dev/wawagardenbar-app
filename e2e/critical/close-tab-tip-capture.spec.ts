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

    const parseNGN = (s: string): number | null => {
      const m = s.match(/(?:₦|NGN)\s*([\d,]+(?:\.\d+)?)/);
      return m ? parseFloat(m[1].replace(/,/g, '')) : null;
    };

    // Find the Tips Received section heading + extract `... total`
    // from the heading's text.
    const sectionHeading = Array.from(document.querySelectorAll('h3')).find(
      (h) => /Tips Received/i.test(h.textContent ?? '')
    );
    if (!sectionHeading) return result;
    const totalAmount = parseNGN(sectionHeading.textContent ?? '');
    if (totalAmount != null) result.total = totalAmount;

    // Find the grid sibling. The tip-cards section lives directly
    // under the heading in `tips-section.tsx`.
    const grid = sectionHeading.nextElementSibling;
    if (!grid) return result;

    // Walk every descendant element under the grid. For each one whose
    // textContent starts with a known title ("Cash tips" / "POS / Card
    // tips" / etc.) treat that element as the Card and look for ₦N
    // anywhere inside it. More forgiving than relying on specific
    // sub-class selectors (`[class*="text-2xl"]`) that quietly drift
    // when CardContent / CardHeader markup changes.
    const labels: Array<{ label: string; key: 'cash' | 'card' | 'transfer' }> =
      [
        { label: 'Cash tips', key: 'cash' },
        { label: 'POS / Card tips', key: 'card' },
        { label: 'Transfer tips', key: 'transfer' },
      ];

    const all = Array.from(grid.querySelectorAll('*')) as HTMLElement[];
    for (const { label, key } of labels) {
      // Locate the element whose own textContent (excluding children
      // we'd over-greedily inherit from parents) STARTS with the label.
      const titleEl = all.find((el) => {
        const txt = (el.textContent ?? '').trim();
        return txt === label || txt.startsWith(label + '\n');
      });
      if (!titleEl) continue;
      // The amount lives in a sibling element of the title's CardHeader,
      // i.e. inside the parent Card. Walk up until we find an ancestor
      // containing a ₦ amount text.
      let node: HTMLElement | null = titleEl.parentElement;
      while (node && node !== grid) {
        const amount = parseNGN(node.textContent ?? '');
        // Reject the section-wide total ("₦300 total") — that text
        // includes the word "total" or "tip"; the per-card amount does
        // NOT include "total".
        // The section heading h3 reads "Tips Received \n ₦300.00 total"
        // — only digits/commas/dots/whitespace between ₦ and "total". A
        // per-card subtitle reads "100.0% of total tips" — non-digit
        // chars between ₦ and "total". Discriminate by requiring the
        // section-total shape so per-card subtitle text doesn't falsely
        // reject the card's own amount.
        if (
          amount != null &&
          !/₦[\d,.\s]+\s*total/i.test(node.textContent ?? '') &&
          // Don't match an ancestor that contains MULTIPLE labels
          // (i.e. wrapped grid containing all cards).
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

test.describe.serial('REQ-035: close-tab tip capture', () => {
  let baselineCashTips = 0;
  // Shared flag — AC2 silently `test.skip`s when UAT has no open tab to
  // close. The Daily Report still renders a "Tips Received" heading
  // regardless, so AC7's existing heading-based skip fallback can't tell
  // the difference between "AC2 was skipped" and "AC2 ran but the tip
  // didn't land". AC7 then assertion-failed with `Received: 0` because
  // baseline stayed at the AC2-init value. Use a positive flag so AC7
  // only asserts when AC2 actually closed a tab.
  let tabClosedInThisRun = false;
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
    // Mark the tab as actually closed only after the submit completes;
    // AC7 reads this to decide whether to assert or skip.
    tabClosedInThisRun = true;
  });

  test('AC7 — Daily Report Tips Received cash card increased', async ({
    page,
  }) => {
    // If AC2 silent-skipped (no open tab on UAT), there's no tip to
    // verify — skip rather than fail with `Received: 0`.
    test.skip(
      !tabClosedInThisRun,
      'AC2 was skipped (no open tab to close) — nothing to assert in AC7'
    );

    await openTodayReport(page);
    const heading = page.locator('h3').filter({ hasText: /Tips Received/i });
    await expect(heading).toBeVisible({ timeout: 15000 });
    const { cash } = await readTipsBreakdown(page);
    expect(cash - baselineCashTips).toBeGreaterThanOrEqual(TIP);
  });
});
