/**
 * @requirement REQ-071 — API contracts + reports + audit-log E2E coverage (sub-issue #297)
 * @requirement SRS REQ-API-006 — per-endpoint payload contracts: each public endpoint returns the documented response envelope + types match the contract
 *
 * Existing coverage (`e2e/requirements-verification.spec.ts` Section 20) pins
 * that every scoped public endpoint REJECTS unauthenticated requests with
 * 401/403/429. This spec adds the missing half: **authenticated responses
 * match the documented envelope shape**.
 *
 * For each endpoint in scope, the spec:
 *   1. POSTs with a valid x-api-key
 *   2. Asserts the response is 200
 *   3. Asserts the standard envelope: `{ success: true, data: <shape> }`
 *   4. Asserts the shape of `data` matches the endpoint's documented contract
 *
 * Setup: creates a temporary API key with broad read scopes via
 * `ApiKeyService.createKey` (returns the plaintext); revoke + delete in afterAll
 * so the key never leaves the test.
 *
 * @requirement REQ-071
 */
import { test, expect } from '@playwright/test';
import { ApiKeyService } from '@/services/api-key-service';

function baseUrl(): string {
  return (
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

// UAT's system user (createdBy for ephemeral API keys).
const SYSTEM_USER_ID = '694541440042c70ca0fe8c35';

let apiKey: string;
let apiKeyDocId: string;

test.describe.configure({ mode: 'serial' });

test.describe('REQ-071 SRS REQ-API-006 — public API authenticated contract', () => {
  test.beforeAll(async () => {
    // Create a short-lived test API key with the read scopes we exercise.
    const result = await ApiKeyService.createKey(
      {
        name: `e2e-req071-${Date.now()}`,
        role: 'admin',
        scopes: [
          'menu:read',
          'orders:read',
          'inventory:read',
          'customers:read',
          'tabs:read',
          'rewards:read',
          'settings:read',
          'analytics:read',
        ],
        rateLimit: 300,
      },
      SYSTEM_USER_ID
    );
    apiKey = result.plainKey;
    apiKeyDocId = result.apiKey._id;
  });

  test.afterAll(async () => {
    if (apiKeyDocId) {
      await ApiKeyService.revokeKey(apiKeyDocId, SYSTEM_USER_ID);
      await ApiKeyService.deleteKey(apiKeyDocId);
    }
  });

  test('GET /api/public/health: unauthenticated → envelope { success, data: { status, service, version, uptime, timestamp } }', async () => {
    const res = await fetch(`${baseUrl()}/api/public/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      status: 'healthy',
      service: 'wawa-garden-bar-api',
    });
    expect(typeof json.data.version).toBe('string');
    expect(typeof json.data.uptime).toBe('number');
    expect(typeof json.data.timestamp).toBe('string');
  });

  test('GET /api/public/menu: envelope { success, data: array<MenuItem> } + each item has id/name/price', async () => {
    const res = await fetch(`${baseUrl()}/api/public/menu`, {
      headers: { 'x-api-key': apiKey },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length > 0) {
      const item = json.data[0];
      expect(item).toHaveProperty('_id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('price');
      expect(typeof item.name).toBe('string');
      expect(typeof item.price).toBe('number');
    }
  });

  // REQ-075 (BREAKING) — Envelope changed from
  // `{ drinks: string[], food: string[] }` to
  // `{ mainCategories: [{ slug, label, order, subCategories[] }] }` to
  // support the configurable main-category registry. REQ-071's SRS spec
  // is amended in the same release.
  test('GET /api/public/menu/categories: envelope { success, data: { mainCategories: [{ slug, label, order, subCategories[] }] } } [REQ-075]', async () => {
    const res = await fetch(`${baseUrl()}/api/public/menu/categories`, {
      headers: { 'x-api-key': apiKey },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeTruthy();
    expect(Array.isArray(json.data.mainCategories)).toBe(true);
    // Default seed ships food + drinks; expect at least one entry.
    expect(json.data.mainCategories.length).toBeGreaterThan(0);
    for (const main of json.data.mainCategories) {
      expect(typeof main.slug).toBe('string');
      expect(typeof main.label).toBe('string');
      expect(typeof main.order).toBe('number');
      expect(Array.isArray(main.subCategories)).toBe(true);
      for (const sub of main.subCategories) {
        expect(typeof sub).toBe('string');
      }
    }
  });

  test('GET /api/public/inventory: envelope { success, data: array<Inventory> } + status enum', async () => {
    const res = await fetch(`${baseUrl()}/api/public/inventory`, {
      headers: { 'x-api-key': apiKey },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length > 0) {
      const item = json.data[0];
      expect(item).toHaveProperty('_id');
      expect(item).toHaveProperty('currentStock');
      expect(item).toHaveProperty('status');
      expect(['in-stock', 'low-stock', 'out-of-stock']).toContain(item.status);
      expect(typeof item.currentStock).toBe('number');
    }
  });

  test('GET /api/public/inventory/summary: envelope + { totals, byStatus, byCategory[], needsRestock[], highValueItems[] }', async () => {
    const res = await fetch(`${baseUrl()}/api/public/inventory/summary`, {
      headers: { 'x-api-key': apiKey },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeTruthy();
    expect(json.data.totals).toBeTruthy();
    expect(typeof json.data.totals.totalItems).toBe('number');
    expect(typeof json.data.totals.totalStockUnits).toBe('number');
    expect(json.data.byStatus).toBeTruthy();
    expect(typeof json.data.byStatus.inStock).toBe('number');
    expect(typeof json.data.byStatus.lowStock).toBe('number');
    expect(typeof json.data.byStatus.outOfStock).toBe('number');
    expect(Array.isArray(json.data.byCategory)).toBe(true);
    expect(Array.isArray(json.data.needsRestock)).toBe(true);
    expect(Array.isArray(json.data.highValueItems)).toBe(true);
  });

  test('GET /api/public/inventory/alerts: envelope + low/out-of-stock arrays', async () => {
    const res = await fetch(`${baseUrl()}/api/public/inventory/alerts`, {
      headers: { 'x-api-key': apiKey },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeTruthy();
    expect(Array.isArray(json.data.lowStock)).toBe(true);
    expect(Array.isArray(json.data.outOfStock)).toBe(true);
  });

  test('GET /api/public/orders: envelope { success, data: array<Order> } + pagination', async () => {
    const res = await fetch(`${baseUrl()}/api/public/orders?limit=5`, {
      headers: { 'x-api-key': apiKey },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeLessThanOrEqual(5);
    if (json.data.length > 0) {
      const order = json.data[0];
      expect(order).toHaveProperty('_id');
      expect(order).toHaveProperty('orderNumber');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('paymentStatus');
      expect(order).toHaveProperty('total');
      expect(typeof order.total).toBe('number');
    }
  });

  test('invalid x-api-key: 401 envelope { success: false, error: <string> }', async () => {
    const res = await fetch(`${baseUrl()}/api/public/menu`, {
      headers: { 'x-api-key': 'wawa_notvalid_keyvalueforsignaturefailure' },
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe('string');
  });
});
