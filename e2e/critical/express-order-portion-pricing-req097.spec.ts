/**
 * @requirement REQ-097 — Fix half/quarter portion pricing in Admin order
 * management (#613): the "Select Portion Size" dialog previously overcharged
 * (added the flat surcharge without applying the percentage discount — Half
 * Portion showed as MORE expensive than Full), while the persisted order
 * silently dropped the surcharge entirely. Both are fixed to
 * round(basePrice × fraction) + surcharge, matching the menu editor's own
 * reference calculation.
 *
 * Verifies:
 *   AC1 — Half Portion picker price = round(basePrice × 0.5) + surcharge.
 *   AC2 — Quarter Portion picker price = round(basePrice × 0.25) + surcharge.
 *   AC3 — The persisted order line price/subtotal includes the surcharge
 *         (the round trip from picker selection to the stored order).
 *
 * AC4 (order-edit), AC5 (public checkout API), and AC6 (price-override
 * interaction) already have direct unit coverage in
 * __tests__/lib/order-line-totals.test.ts and
 * __tests__/actions/admin/express-actions-portion-pricing-req097.test.ts —
 * not re-proven here.
 *
 * Fixture (REQ-116 AC11, #979): the spec creates its OWN menu item — a clone
 * of a seeded one with a unique name and portionOptions configured — and
 * deletes it in afterAll. It never mutates a shared seeded item, so it is
 * safe at the default worker count on a shared database.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { revealExpressMenuCardByName } from '../helpers/express-menu';
import {
  withMongo,
  pollForDoc,
  deleteOrderById,
} from '../helpers/db-assertions';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend({
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

const SEED_SOURCE_NAME = 'Ogbono';
const ITEM_NAME = `E2E REQ-097 Portion ${Date.now()}`;
// Fixture surcharges — deliberately non-tied to the base price so a
// regression back to the pre-fix formula (basePrice + surcharge, no
// discount applied) produces a visibly different, wrong number.
const HALF_SURCHARGE = 300;
const QUARTER_SURCHARGE = 150;

interface OriginalPortionOptions {
  itemId: any;
  basePrice: number;
}

let original: OriginalPortionOptions | null = null;
let createdOrderId: string | null = null;

test.describe('REQ-097: Express Create Order — portion pricing correctness', () => {
  test.beforeAll(async () => {
    original = await withMongo(async (db) => {
      const source = await db
        .collection('menuitems')
        .findOne({ name: SEED_SOURCE_NAME, kind: 'menu-item' });
      if (!source) {
        throw new Error(
          `Seed source "${SEED_SOURCE_NAME}" not found — cannot clone the REQ-097 fixture item`
        );
      }
      const { _id: _ignored, slug: _slug, ...rest } = source;
      const result = await db.collection('menuitems').insertOne({
        ...rest,
        name: ITEM_NAME,
        portionOptions: {
          halfPortionEnabled: true,
          halfPortionSurcharge: HALF_SURCHARGE,
          quarterPortionEnabled: true,
          quarterPortionSurcharge: QUARTER_SURCHARGE,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { itemId: result.insertedId, basePrice: source.price };
    });
  });

  test.afterAll(async () => {
    if (original) {
      await withMongo(async (db) => {
        await db.collection('menuitems').deleteOne({ _id: original!.itemId });
      });
    }
  });

  test.beforeEach(async ({ page }) => {
    expect(
      await isAuthenticated(page),
      'admin session unavailable (auth-setup failed or credentials missing)'
    ).toBe(true);
  });

  test.afterEach(async () => {
    if (createdOrderId) {
      await deleteOrderById(createdOrderId).catch(() => {
        /* idempotent cleanup — best-effort */
      });
      createdOrderId = null;
    }
  });

  test('AC1 + AC2 — portion picker prices apply the discount before the surcharge (#613 repro)', async ({
    page,
  }) => {
    tagTest('REQ-097', [1, 2]);

    const basePrice = original!.basePrice;
    const expectedHalf = Math.round(basePrice * 0.5) + HALF_SURCHARGE;
    const expectedQuarter = Math.round(basePrice * 0.25) + QUARTER_SURCHARGE;
    // Pre-fix buggy values, for the comment trail only (not asserted directly —
    // asserting the CORRECT value already fails against the old code, which
    // is the point):
    //   buggyHalf    = basePrice + HALF_SURCHARGE
    //   buggyQuarter = basePrice + QUARTER_SURCHARGE

    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    const menuCard = await revealExpressMenuCardByName(page, ITEM_NAME);
    await menuCard.click();

    const portionDialog = page
      .getByRole('dialog')
      .filter({ hasText: /select portion size/i });
    await expect(portionDialog).toBeVisible({ timeout: 5000 });

    const halfButton = portionDialog.getByRole('button', {
      name: /half portion/i,
    });
    await expect(halfButton).toContainText(`₦${expectedHalf.toLocaleString()}`);
    await evidenceShot(page, 'REQ-097', 1, 'portion-picker-half-price');

    const quarterButton = portionDialog.getByRole('button', {
      name: /quarter portion/i,
    });
    await expect(quarterButton).toContainText(
      `₦${expectedQuarter.toLocaleString()}`
    );
    await evidenceShot(page, 'REQ-097', 2, 'portion-picker-quarter-price');

    // Close without adding — this test only proves the preview, not the round trip.
    await portionDialog.getByRole('button', { name: /cancel/i }).click();
  });

  test('AC3 — persisted order line price includes the portion surcharge (round trip)', async ({
    page,
  }) => {
    tagTest('REQ-097', 3);

    const basePrice = original!.basePrice;
    const expectedHalf = Math.round(basePrice * 0.5) + HALF_SURCHARGE;

    const since = new Date();

    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    const menuCard = await revealExpressMenuCardByName(page, ITEM_NAME);
    await menuCard.click();

    const portionDialog = page
      .getByRole('dialog')
      .filter({ hasText: /select portion size/i });
    await expect(portionDialog).toBeVisible({ timeout: 5000 });
    await portionDialog.getByRole('button', { name: /half portion/i }).click();

    // Proceed to checkout.
    const checkoutBtn = page.getByRole('button', { name: /checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    // Pay cash (no reference field required).
    const cashBtn = page.getByRole('button', { name: /^cash$/i }).first();
    await expect(cashBtn).toBeVisible({ timeout: 5000 });
    await cashBtn.click();

    const submitBtn = page.getByRole('button', { name: /Create Order.*₦/i });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await evidenceShot(page, 'REQ-097', 3, 'checkout-before-submit');
    await submitBtn.click();

    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const order = await pollForDoc<any>(
      'orders',
      {
        paidAt: { $gte: since },
        items: {
          $elemMatch: {
            name: ITEM_NAME,
            portionSize: 'half',
          },
        },
      },
      { timeoutMs: 8000 }
    );

    expect(order).toBeTruthy();
    const line = order.items.find(
      (i: any) => i.name === ITEM_NAME && i.portionSize === 'half'
    );
    expect(line).toBeTruthy();
    // The bug: this would previously be `basePrice * 0.5` with the surcharge
    // silently dropped (e.g. 1000, not 1300). Confirms the fix, not just the
    // picker's display.
    expect(line.price).toBe(expectedHalf);
    expect(line.subtotal).toBe(expectedHalf);

    createdOrderId = String(order._id);
  });
});
