/**
 * @requirement REQ-113 — Printable A4 menu ("Print New Menu")
 * @requirement SRS REQ-MENUMGT-011
 *
 * Covers the UI-facing ACs from compliance/evidence/REQ-113/test-scope.md:
 *   AC1  — "Print New Menu" sits before "Edit All" and links to the print page
 *   AC2  — "Generate Menu" is disabled with no main category selected
 *   AC3/4 — title defaults to the price-type label until edited
 *   AC5/6/9/18 — preview shows only available items, name + price per type,
 *            with an unset happy-hour price falling back to the default
 *   AC7  — "Download PDF" saves wawa-menu-<slug>-<date>.pdf (a real PDF)
 *   AC8/11/12 — changing settings marks the preview out of date; regenerating
 *            clears it, repeatably
 *   AC14 — black & white template applied to the preview
 *   AC17 — landscape renders A4 landscape pages
 *   AC10 — a session without menuManagement is redirected to /dashboard/forbidden
 * Layout/theme properties (AC11 columns, AC13, AC15, AC16, AC19, AC20) are
 * proved by __tests__/lib/menu-print/*.test.ts.
 *
 * Seeds three throwaway MenuItems in "food" via MongoDB and cleans up afterAll:
 *   A — available, price 1000, happyHourPrice 800
 *   B — unavailable
 *   C — available, price 1500, no happyHourPrice field at all
 */
import { test as base, expect, Page } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');
const CSR_FILE = path.join(__dirname, '../../.auth/csr.json');

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

interface SeedHandle {
  ids: string[];
  a: string;
  b: string;
  c: string;
}

function menuItemDoc(
  name: string,
  fields: Record<string, unknown>
): Record<string, unknown> {
  const now = new Date();
  return {
    kind: 'menu-item',
    name,
    description: 'REQ-113 e2e print-menu pin',
    mainCategory: 'food',
    category: 'main-courses',
    costPerUnit: 400,
    images: [],
    customizations: [],
    tags: ['e2e-req113'],
    allergens: [],
    preparationTime: 15,
    portionOptions: {
      halfPortionEnabled: false,
      halfPortionSurcharge: 0,
      quarterPortionEnabled: false,
      quarterPortionSurcharge: 0,
    },
    allowManualPriceOverride: false,
    trackInventory: false,
    pointsRedeemable: false,
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
}

async function seedMenuItems(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  const stamp = Date.now();
  const a = `e2e-req113-${stamp}-a`;
  const b = `e2e-req113-${stamp}-b`;
  const c = `e2e-req113-${stamp}-c`;
  try {
    await client.connect();
    const db = client.db(dbName);
    const result = await db.collection('menuitems').insertMany([
      menuItemDoc(a, {
        price: 1000,
        showPrice: 1000,
        happyHourPrice: 800,
        isAvailable: true,
      }),
      menuItemDoc(b, {
        price: 1200,
        showPrice: 1200,
        happyHourPrice: 1200,
        isAvailable: false,
      }),
      // No happyHourPrice field at all (AC6): mirrors documents that predate
      // the price-field backfill, which `.lean()` reads return as undefined.
      menuItemDoc(c, { price: 1500, showPrice: 1500, isAvailable: true }),
    ]);
    return {
      ids: Object.values(result.insertedIds).map(String),
      a,
      b,
      c,
    };
  } finally {
    await client.close();
  }
}

async function cleanup(handle: SeedHandle | null): Promise<void> {
  if (!handle) return;
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client
      .db(dbName)
      .collection('menuitems')
      .deleteMany({ _id: { $in: handle.ids.map((id) => new ObjectId(id)) } });
  } finally {
    await client.close();
  }
}

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('domcontentloaded');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

async function openPrintPage(page: Page): Promise<void> {
  await page.goto('/dashboard/menu/print', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('print-generate')).toBeVisible();
  // The form is server-rendered; a click that lands before React hydrates it
  // is silently dropped (seen under full-suite load with cold dev compiles).
  // React tags hydrated DOM nodes with a `__reactFiber$…` key.
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="print-generate"]');
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
  });
}

/** Leave only the given main category checked. */
async function selectOnlyMainCategory(page: Page, slug: string): Promise<void> {
  const boxes = page.locator('[data-testid^="print-main-"]');
  for (const box of await boxes.all()) {
    const isTarget =
      (await box.getAttribute('data-testid')) === `print-main-${slug}`;
    const checked = (await box.getAttribute('data-state')) === 'checked';
    if (checked !== isTarget) await box.click();
  }
  await expect(page.getByTestId(`print-main-${slug}`)).toHaveAttribute(
    'data-state',
    'checked'
  );
}

async function generate(page: Page): Promise<void> {
  await page.getByTestId('print-generate').click();
  await expect(page.getByTestId('menu-print-page').first()).toBeVisible();
  await expect(page.getByTestId('print-out-of-date')).toBeHidden();
}

/** The price drawn right after an item's (single-line) name in the preview SVG. */
function previewPriceFor(page: Page, name: string) {
  return page
    .getByTestId('menu-print-page')
    .locator('text', { hasText: name })
    .locator('xpath=following-sibling::*[1]');
}

const superAdminTest = base.extend({ storageState: SUPER_ADMIN_FILE });
superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Super-admin login failed — skipping');
  }
});

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe('REQ-113: Print New Menu', () => {
  let handle: SeedHandle | null = null;

  superAdminTest.beforeAll(async () => {
    handle = await seedMenuItems();
  });

  superAdminTest.afterAll(async () => {
    await cleanup(handle);
  });

  superAdminTest(
    '[REQ-113][AC1] "Print New Menu" sits before "Edit All" and links to the print page',
    async ({ page }) => {
      tagTest('REQ-113', 1);
      await page.goto('/dashboard/menu', { waitUntil: 'domcontentloaded' });
      const printLink = page.getByRole('link', { name: 'Print New Menu' });
      const editAll = page.getByRole('link', { name: /edit all/i });
      await expect(printLink).toBeVisible();
      await expect(printLink).toHaveAttribute('href', '/dashboard/menu/print');
      const [printBox, editBox] = await Promise.all([
        printLink.boundingBox(),
        editAll.boundingBox(),
      ]);
      expect(printBox!.x).toBeLessThan(editBox!.x);
      await evidenceShot(page, 'REQ-113', 1, 'print-button-before-edit-all');

      await printLink.click();
      await expect(page).toHaveURL(/\/dashboard\/menu\/print$/);
      await expect(
        page.getByRole('heading', { name: 'Print New Menu' })
      ).toBeVisible();
    }
  );

  superAdminTest(
    '[REQ-113][AC2] "Generate Menu" is disabled when no main category is selected',
    async ({ page }) => {
      tagTest('REQ-113', 2);
      await openPrintPage(page);
      const boxes = page.locator('[data-testid^="print-main-"]');
      for (const box of await boxes.all()) {
        if ((await box.getAttribute('data-state')) === 'checked')
          await box.click();
      }
      await expect(page.getByTestId('print-generate')).toBeDisabled();
      await evidenceShot(page, 'REQ-113', 2, 'generate-disabled-no-category');
    }
  );

  superAdminTest(
    '[REQ-113][AC3][AC4] title follows the price type until it is edited',
    async ({ page }) => {
      tagTest('REQ-113', [3, 4]);
      await openPrintPage(page);
      const title = page.getByTestId('print-title');
      await expect(title).toHaveValue('Default price');

      await page.getByTestId('print-price-happyHour').click();
      await expect(title).toHaveValue('Happy hour price');
      await evidenceShot(page, 'REQ-113', 3, 'title-defaults-to-price-type');

      await title.fill('Friday Night');
      await page.getByTestId('print-price-show').click();
      await expect(title).toHaveValue('Friday Night');
      await evidenceShot(page, 'REQ-113', 4, 'edited-title-kept');
    }
  );

  superAdminTest(
    '[REQ-113][AC5][AC6][AC9][AC18] preview shows only available items, priced per type with fallback',
    async ({ page }) => {
      tagTest('REQ-113', [5, 6, 9, 18]);
      await openPrintPage(page);
      await selectOnlyMainCategory(page, 'food');
      await page.getByTestId('print-price-happyHour').click();
      await generate(page);

      const preview = page.getByTestId('menu-print-page');
      await expect(
        preview.locator('text', { hasText: 'Happy hour price' }).first()
      ).toBeVisible();
      await expect(preview.locator('image').first()).toBeAttached();

      // AC5 — A at its happy-hour price; AC18 — name then price, nothing else.
      await expect(previewPriceFor(page, handle!.a)).toHaveText('N800');
      // AC6 — C has no happyHourPrice, so its default price prints.
      await expect(previewPriceFor(page, handle!.c)).toHaveText('N1,500');
      // AC9 — the unavailable item is absent.
      await expect(preview.locator('text', { hasText: handle!.b })).toHaveCount(
        0
      );
      // AC5 — only the selected main category is printed.
      await expect(preview.locator('text', { hasText: /^DRINKS/ })).toHaveCount(
        0
      );

      await preview
        .locator('text', { hasText: handle!.a })
        .scrollIntoViewIfNeeded();
      await evidenceShot(page, 'REQ-113', 5, 'preview-happy-hour-food-only');
      await evidenceShot(page, 'REQ-113', 6, 'preview-happy-hour-fallback', {
        tier: 'feature',
      });
      await evidenceShot(
        page,
        'REQ-113',
        9,
        'preview-unavailable-item-absent',
        {
          tier: 'feature',
        }
      );
      await evidenceShot(page, 'REQ-113', 18, 'preview-name-and-price-only', {
        tier: 'feature',
      });
    }
  );

  superAdminTest(
    '[REQ-113][AC7] "Download PDF" saves an A4 PDF named after the title and date',
    async ({ page }) => {
      tagTest('REQ-113', 7);
      await openPrintPage(page);
      await selectOnlyMainCategory(page, 'food');
      await page.getByTestId('print-title').fill('Friday Night');
      await generate(page);

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByTestId('print-download').click(),
      ]);
      expect(download.suggestedFilename()).toMatch(
        /^wawa-menu-friday-night-\d{4}-\d{2}-\d{2}\.pdf$/
      );
      const tmp = path.join(os.tmpdir(), download.suggestedFilename());
      await download.saveAs(tmp);
      const header = fs.readFileSync(tmp).subarray(0, 5).toString('latin1');
      fs.unlinkSync(tmp);
      expect(header).toBe('%PDF-');
      await evidenceShot(page, 'REQ-113', 7, 'pdf-downloaded');
    }
  );

  superAdminTest(
    '[REQ-113][AC8][AC11][AC12] changing settings marks the preview out of date until regenerated, repeatably',
    async ({ page }) => {
      tagTest('REQ-113', [8, 11, 12]);
      await openPrintPage(page);
      await selectOnlyMainCategory(page, 'food');
      await generate(page);
      const outOfDate = page.getByTestId('print-out-of-date');

      await page.getByTestId('print-columns-3').click();
      await expect(outOfDate).toBeVisible();
      await evidenceShot(page, 'REQ-113', 12, 'preview-out-of-date', {
        tier: 'feature',
      });
      await generate(page);
      await expect(outOfDate).toBeHidden();
      await evidenceShot(page, 'REQ-113', 11, 'three-column-preview');

      await page.getByTestId('print-columns-1').click();
      await expect(outOfDate).toBeVisible();
      await generate(page);
      await expect(outOfDate).toBeHidden();
      await evidenceShot(page, 'REQ-113', 8, 'regenerated-after-change');
    }
  );

  superAdminTest(
    '[REQ-113][AC17] landscape renders A4 landscape pages',
    async ({ page }) => {
      tagTest('REQ-113', 17);
      await openPrintPage(page);
      await selectOnlyMainCategory(page, 'food');
      await page.getByTestId('print-orientation-landscape').click();
      await generate(page);
      await expect(page.getByTestId('menu-print-page').first()).toHaveAttribute(
        'viewBox',
        '0 0 297 210'
      );
      await evidenceShot(page, 'REQ-113', 17, 'landscape-preview');
    }
  );

  superAdminTest(
    '[REQ-113][AC14] printer-friendly template applies to the preview',
    async ({ page }) => {
      tagTest('REQ-113', 14);
      await openPrintPage(page);
      await selectOnlyMainCategory(page, 'food');
      await page.getByTestId('print-template-bw').click();
      await generate(page);
      await expect(page.getByTestId('menu-print-page').first()).toHaveAttribute(
        'data-template',
        'bw'
      );
      await evidenceShot(page, 'REQ-113', 14, 'black-and-white-preview');
    }
  );
});

/**
 * AC10 — the print route sits under app/dashboard/menu/layout.tsx
 * (`requirePermission('menuManagement')`). The data action's own permission
 * check is proved by __tests__/actions/admin/menu-print-actions.test.ts,
 * since a session blocked here never reaches the Generate button.
 */
const csrTest = base.extend({ storageState: CSR_FILE });
csrTest.beforeEach(async ({ page }, testInfo) => {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('domcontentloaded');
    if (!page.url().includes('/dashboard')) {
      testInfo.skip(true, 'CSR login failed — skipping');
    }
  } catch {
    testInfo.skip(true, 'CSR login failed — skipping');
  }
});

csrTest(
  '[REQ-113][AC10] a session without menuManagement is redirected away from the print page',
  async ({ page }) => {
    tagTest('REQ-113', 10);
    await page.goto('/dashboard/menu/print', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/forbidden/);
    await evidenceShot(page, 'REQ-113', 10, 'no-menu-management-blocked-print');
  }
);
