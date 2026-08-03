/**
 * @requirement REQ-098 AC4 — Write-off confirmation dialog on the tab
 * detail page.
 *
 * A reason is required before the confirm button enables; on success the
 * tab reflects as written off (the action becomes a disabled "Already
 * Written Off" state), and the existing Delete action is unaffected —
 * additive, not a replacement.
 *
 * Tier: critical — HIGH risk, financial-reporting-affecting admin action
 * (mirrors e2e/critical/delete-tab-payment-revert.spec.ts's tier and
 * seeding pattern).
 */
import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { ObjectId } from 'mongodb';
import { withMongo, deleteTabById } from '../helpers/db-assertions';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend<{ storageState: string }>({
  storageState: ADMIN_FILE,
});

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

function makeDormantTabDoc(tableNumber: string): Record<string, unknown> {
  const total = 4500;
  return {
    tabNumber: `E2E-098-${Date.now()}`,
    tableNumber,
    status: 'open',
    paymentStatus: 'pending',
    orders: [],
    total,
    subtotal: total,
    serviceFee: 0,
    tax: 0,
    deliveryFee: 0,
    discountTotal: 0,
    tipAmount: 0,
    // Dormant profile — opened well before the write-off scenario this
    // test exercises (mirrors the real 2026-07-31 contamination profile).
    openedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    customerEmail: 'e2e-req098-writeoff@test.com',
    partialPayments: [],
  };
}

async function readTab(tabId: string): Promise<Record<string, any> | null> {
  return withMongo((db) =>
    db.collection('tabs').findOne({ _id: new ObjectId(tabId) })
  );
}

test.describe('REQ-098: dormant tab write-off (AC4)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  let tabId: string | null = null;
  test.afterEach(async () => {
    if (tabId) {
      await deleteTabById(tabId).catch(() => {});
      tabId = null;
    }
  });

  test('reason is required before confirm enables; on success the tab shows as written off; Delete remains available', async ({
    page,
  }) => {
    tagTest('REQ-098', 4);

    const tableNumber = `E2E-098-${Date.now() % 100000}`;
    const tabResult = (await withMongo((db) =>
      db.collection('tabs').insertOne(makeDormantTabDoc(tableNumber))
    )) as { insertedId: ObjectId };
    tabId = String(tabResult.insertedId);

    await page.goto(`/dashboard/orders/tabs/${tabId}`);
    await page.waitForLoadState('networkidle');

    // Existing Delete action is present and unaffected by this REQ.
    await expect(
      page.getByRole('button', { name: 'Delete Tab' })
    ).toBeVisible();

    const writeOffButton = page.getByRole('button', { name: 'Write Off' });
    await expect(writeOffButton).toBeVisible();
    await writeOffButton.click();

    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/write off tab/i);

    const confirmButton = dialog.getByRole('button', { name: 'Write Off Tab' });
    // Empty reason — confirm stays disabled.
    await expect(confirmButton).toBeDisabled();

    const reasonField = dialog.locator('#write-off-reason');
    await reasonField.fill('   ');
    // Whitespace-only reason — still disabled.
    await expect(confirmButton).toBeDisabled();

    const reasonText = 'E2E: dormant since 60 days ago, customer unreachable.';
    await reasonField.fill(reasonText);
    await expect(confirmButton).toBeEnabled();
    // Canonical anchor for AC4 — dialog with a valid reason, ready to confirm.
    await evidenceShot(page, 'REQ-098', 4, 'write-off-dialog-reason-filled', {
      tier: 'feature',
    });

    await confirmButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Server-side state: written off, closed, writeOff record stamped.
    await expect
      .poll(async () => (await readTab(tabId!))?.paymentStatus, {
        timeout: 10000,
      })
      .toBe('written-off');
    const finalTab = await readTab(tabId!);
    expect(finalTab?.status).toBe('closed');
    expect(finalTab?.writeOff?.reason).toBe(reasonText);
    expect(finalTab?.writeOff?.amount).toBe(4500);

    // UI reflects the written-off state — the write-off action becomes a
    // disabled "Already Written Off" affordance.
    await expect(
      page.getByRole('button', { name: 'Already Written Off' })
    ).toBeVisible();
    // Canonical anchor — proves the AC end-to-end.
    await evidenceShot(page, 'REQ-098', 4, 'tab-shows-already-written-off');

    // Delete remains available side by side — additive, not a replacement.
    await expect(
      page.getByRole('button', { name: 'Delete Tab' })
    ).toBeVisible();
  });
});
