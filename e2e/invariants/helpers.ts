/**
 * @requirement REQ-088 — Shared helpers for invariant E2E specs
 *
 * Kitchen-display interaction helpers + DB seed/read utilities used by
 * all 7 invariant specs under e2e/invariants/.
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';

export { superAdminTest, isAuthenticated };

export function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

export function baseUrl(): string {
  return (
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export function guard(
  skip: (cond: boolean, reason: string) => void,
  ok: boolean
) {
  if (ok) return;
  if (process.env.CI) {
    throw new Error(
      'Expected a super-admin session in CI but none was present'
    );
  }
  skip(true, 'super-admin session unavailable (local only)');
}

export function computeStockFromInventory(
  inv: {
    currentStock?: number;
    trackByLocation?: boolean;
    locations?: Array<{ currentStock: number }>;
  } | null
): number {
  if (!inv) return 0;
  if (inv.trackByLocation && inv.locations && inv.locations.length > 0) {
    return inv.locations.reduce((sum, l) => sum + (l.currentStock || 0), 0);
  }
  return inv.currentStock || 0;
}

export async function readInventoryStock(inventoryId: string): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const inv = await client
      .db(dbName)
      .collection('inventories')
      .findOne({ _id: new ObjectId(inventoryId) });
    return computeStockFromInventory(inv as never);
  } finally {
    await client.close();
  }
}

export async function readOrderStatus(orderId: string): Promise<string | null> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const o = await client
      .db(dbName)
      .collection('orders')
      .findOne({ _id: new ObjectId(orderId) }, { projection: { status: 1 } });
    return (o?.status as string) ?? null;
  } finally {
    await client.close();
  }
}

export async function countCollection(
  collection: string,
  filter: Record<string, unknown>
): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await client
      .db(dbName)
      .collection(collection)
      .countDocuments(filter);
  } finally {
    await client.close();
  }
}

export async function deleteMany(
  collection: string,
  filter: Record<string, unknown>
): Promise<void> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db(dbName).collection(collection).deleteMany(filter);
  } finally {
    await client.close();
  }
}

export async function updateOne(
  collection: string,
  filter: Record<string, unknown>,
  update: Record<string, unknown>
): Promise<void> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db(dbName).collection(collection).updateOne(filter, update);
  } finally {
    await client.close();
  }
}

/**
 * Dismiss cookie consent banner + navigate to kitchen-display.
 * Returns the Page for chaining.
 */
export async function setupKitchenDisplay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'cookieConsent',
      JSON.stringify({
        acceptedAt: '2026-06-04T00:00:00Z',
        version: 'v1',
      })
    );
  });
  await page.goto('/dashboard/kitchen-display');
  await page.waitForLoadState('networkidle');
  const cookieBanner = page.getByTestId('cookie-consent-banner');
  if (await cookieBanner.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /got it/i }).click();
    await expect(cookieBanner).toHaveCount(0);
  }
}

/**
 * Click a button in the kitchen-display order card and poll DB until
 * the order status matches the expected value.
 */
export async function clickAndAwaitStatus(
  page: Page,
  orderNumber: string,
  orderId: string,
  buttonText: string,
  expectedNext: string
): Promise<void> {
  const heading = page.getByRole('heading', {
    name: orderNumber,
    level: 2,
  });
  await expect(heading).toBeVisible({ timeout: 15000 });
  const card = heading.locator(
    'xpath=ancestor::div[contains(@class, "border-2")][1]'
  );
  const btn = card.getByRole('button', {
    name: new RegExp(buttonText, 'i'),
  });
  await expect(btn).toBeVisible({ timeout: 15000 });
  await expect(btn).toBeEnabled();
  await btn.click();
  await expect
    .poll(() => readOrderStatus(orderId), { timeout: 20000 })
    .toBe(expectedNext);
}

/**
 * Navigate to the admin orders page, find an order by number, and
 * click a status-action button (e.g. "Cancel Order").
 */
export async function clickOrderActionOnOrdersPage(
  page: Page,
  orderNumber: string,
  orderId: string,
  buttonText: string,
  expectedNext: string
): Promise<void> {
  await page.goto('/dashboard/orders');
  await page.waitForLoadState('networkidle');
  const row = page.getByText(orderNumber, { exact: false }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  const btn = page
    .getByRole('button', { name: new RegExp(buttonText, 'i') })
    .first();
  await expect(btn).toBeVisible({ timeout: 15000 });
  await btn.click();
  await expect
    .poll(() => readOrderStatus(orderId), { timeout: 20000 })
    .toBe(expectedNext);
}

/**
 * Generate a unique idempotencyKey for seeded orders.
 */
export function uniqueIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
