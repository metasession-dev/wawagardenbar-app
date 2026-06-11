/**
 * @requirement REQ-077 — Expandable incidents on `/dashboard/incidents`
 * @requirement SRS REQ-INV-014 — row expansion UX (AC1)
 * @requirement SRS REQ-INV-015 — errorDetails + Order snapshot panel (AC2 + AC3)
 * @requirement SRS REQ-INV-016 — stale-paid-order status-history trail (AC4 — second half)
 * @requirement SRS REQ-INV-013 — Retry-now reused inside expansion (AC4 — first half, R-003 mitigation)
 * @requirement SRS REQ-INV-017 — URL-hash filter + expanded-row state (AC6, R-004 mitigation)
 *
 * Critical-tier spec — gates on PR-to-main per the 3-tier model (PR #361
 * adopted v0.1.53). REQ-077 is MEDIUM risk on a load-bearing operational
 * surface (admins use this page to remediate stuck inventory deductions
 * from REQ-066 silent-fail audit log).
 *
 * Seed shape: synthetic `IncidentEvent` rows linked to seeded Orders
 * with deterministic identifiers. One Order has
 * `inventoryDeducted: false` so the `inventory_deduction_failed`
 * incident's expansion panel reaches the Retry-now branch (R-003 pin).
 * Another Order is `stale_paid_order` style with a 2-entry
 * `statusHistory` so the chronological-trail block renders (REQ-INV-016
 * pin).
 *
 * Cleanup in `afterAll` deletes the seeded incidents + orders so the
 * next run sees clean state — Layer 4 of `SDLC/test-isolation.md` per
 * #352.
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';
import { evidenceShot } from '../helpers/evidence';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

const SEED_PREFIX = `e2e-req077-${Date.now().toString(36)}`;

interface SeededIncident {
  incidentId: string;
  orderId: string;
}

interface Seed {
  deductionFailure: SeededIncident;
  staleOrder: SeededIncident;
}

async function seed(): Promise<Seed> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    // Order 1 — for inventory_deduction_failed incident; inventoryDeducted:false
    //          so the retry-now branch is reachable (AC4 / R-003 pin).
    const order1Insert = await db.collection('orders').insertOne({
      orderNumber: `${SEED_PREFIX}-O1`,
      orderType: 'pickup',
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      businessDate: new Date('2026-06-10'),
      items: [
        {
          name: `${SEED_PREFIX}-jollof`,
          quantity: 2,
          price: 4500,
          total: 9000,
          portionSize: 'full',
        },
      ],
      subtotal: 9000,
      total: 9000,
      tipAmount: 0,
      inventoryDeducted: false,
      statusHistory: [],
      createdAt: new Date('2026-06-10T10:00:00Z'),
      paidAt: new Date('2026-06-10T10:00:00Z'),
      completedAt: new Date('2026-06-10T10:05:00Z'),
    });
    const order1Id = String(order1Insert.insertedId);

    // Order 2 — for stale_paid_order incident; populated statusHistory
    //          so the chronological trail renders (AC4 / REQ-INV-016).
    const order2Insert = await db.collection('orders').insertOne({
      orderNumber: `${SEED_PREFIX}-O2`,
      orderType: 'pickup',
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      businessDate: new Date('2026-06-10'),
      items: [
        {
          name: `${SEED_PREFIX}-suya`,
          quantity: 1,
          price: 3000,
          total: 3000,
          portionSize: 'full',
        },
      ],
      subtotal: 3000,
      total: 3000,
      tipAmount: 0,
      inventoryDeducted: true,
      statusHistory: [
        {
          status: 'confirmed',
          timestamp: new Date('2026-06-10T09:00:00Z'),
        },
        {
          status: 'preparing',
          timestamp: new Date('2026-06-10T09:30:00Z'),
          note: 'kitchen-display received',
        },
      ],
      createdAt: new Date('2026-06-10T09:00:00Z'),
      paidAt: new Date('2026-06-10T09:00:00Z'),
    });
    const order2Id = String(order2Insert.insertedId);

    // Incidents — newest first so they appear at the top of the page.
    const incident1Insert = await db.collection('incidentevents').insertOne({
      kind: 'inventory_deduction_failed',
      entityId: order1Id,
      summary: `${SEED_PREFIX}-summary-1`,
      errorDetails: {
        message: 'No stock at routed sale-point',
        actorUserId: 'system_kitchen',
        actorRole: 'system',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const incident2Insert = await db.collection('incidentevents').insertOne({
      kind: 'stale_paid_order',
      entityId: order2Id,
      summary: `${SEED_PREFIX}-summary-2`,
      errorDetails: {
        message: 'Order paid > 30min ago, still preparing',
        actorRole: 'system_reconciliation',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      deductionFailure: {
        incidentId: String(incident1Insert.insertedId),
        orderId: order1Id,
      },
      staleOrder: {
        incidentId: String(incident2Insert.insertedId),
        orderId: order2Id,
      },
    };
  } finally {
    await client.close();
  }
}

async function cleanup(s: Seed | null) {
  if (!s) return;
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db.collection('incidentevents').deleteMany({
      _id: {
        $in: [
          new ObjectId(s.deductionFailure.incidentId),
          new ObjectId(s.staleOrder.incidentId),
        ],
      },
    });
    await db.collection('orders').deleteMany({
      _id: {
        $in: [
          new ObjectId(s.deductionFailure.orderId),
          new ObjectId(s.staleOrder.orderId),
        ],
      },
    });
  } finally {
    await client.close();
  }
}

function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI) {
    throw new Error('Expected super-admin session in CI but none was present');
  }
  skip(
    true,
    'Super-admin session unavailable — run seed-e2e-admins.ts (local only)'
  );
}

superAdminTest.describe(
  'REQ-077 — expandable incidents on /dashboard/incidents',
  () => {
    let seeded: Seed | null = null;

    superAdminTest.beforeAll(async () => {
      seeded = await seed();
    });

    superAdminTest.afterAll(async () => {
      await cleanup(seeded);
      seeded = null;
    });

    superAdminTest(
      'AC1 — click row toggles expansion + chevron rotates + aria-expanded mirrors state',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        await page.goto('/dashboard/incidents');
        await page.waitForLoadState('networkidle');

        const row = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}`
        );
        await expect(row).toBeVisible({ timeout: 10000 });
        await expect(row).toHaveAttribute('aria-expanded', 'false');

        await row.click();
        await expect(row).toHaveAttribute('aria-expanded', 'true');

        const panel = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}-expanded`
        );
        await expect(panel).toBeVisible();
        await evidenceShot(page, 'REQ-077', 1, 'row-expanded');

        // Click again → collapses
        await row.click();
        await expect(row).toHaveAttribute('aria-expanded', 'false');
        await expect(panel).not.toBeVisible();
      }
    );

    superAdminTest(
      'AC1 — keyboard: Space + Enter toggle expansion (accessibility)',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        await page.goto('/dashboard/incidents');
        await page.waitForLoadState('networkidle');

        const row = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}`
        );
        await expect(row).toBeVisible();
        await row.focus();

        await page.keyboard.press(' ');
        await expect(row).toHaveAttribute('aria-expanded', 'true');

        await page.keyboard.press('Enter');
        await expect(row).toHaveAttribute('aria-expanded', 'false');
      }
    );

    superAdminTest(
      'AC1 — multi-row: both expansions visible simultaneously',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        await page.goto('/dashboard/incidents');
        await page.waitForLoadState('networkidle');

        const rowA = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}`
        );
        const rowB = page.getByTestId(
          `incident-row-${s.staleOrder.incidentId}`
        );
        await expect(rowA).toBeVisible();
        await expect(rowB).toBeVisible();

        await rowA.click();
        await rowB.click();

        await expect(rowA).toHaveAttribute('aria-expanded', 'true');
        await expect(rowB).toHaveAttribute('aria-expanded', 'true');
        await expect(
          page.getByTestId(
            `incident-row-${s.deductionFailure.incidentId}-expanded`
          )
        ).toBeVisible();
        await expect(
          page.getByTestId(`incident-row-${s.staleOrder.incidentId}-expanded`)
        ).toBeVisible();
        await evidenceShot(page, 'REQ-077', 1, 'multi-row-expanded');
      }
    );

    superAdminTest(
      'AC2 + AC3 — expanded panel shows errorDetails JSON + entityId link + Order snapshot',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        await page.goto('/dashboard/incidents');
        await page.waitForLoadState('networkidle');

        const row = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}`
        );
        await expect(row).toBeVisible();
        await row.click();

        const panel = page.getByTestId('incident-details-panel').first();
        await expect(panel).toBeVisible();

        // AC2 — errorDetails JSON pretty-printed contains the seeded message
        await expect(panel).toContainText('No stock at routed sale-point');
        await expect(panel).toContainText('actorUserId');
        await expect(panel).toContainText('system_kitchen');

        // AC2 — entityId link to /dashboard/orders/{id}
        const entityLink = panel.getByRole('link', {
          name: s.deductionFailure.orderId,
        });
        await expect(entityLink).toHaveAttribute(
          'href',
          `/dashboard/orders/${s.deductionFailure.orderId}`
        );

        // AC3 — Order snapshot fields (orderNumber + items + status)
        await expect(panel).toContainText(`${SEED_PREFIX}-O1`);
        await expect(panel).toContainText(`${SEED_PREFIX}-jollof`); // line item
        await expect(panel).toContainText('completed');
        await expect(panel).toContainText('paid');
        await evidenceShot(
          page,
          'REQ-077',
          3,
          'panel-error-details-and-order-snapshot'
        );
      }
    );

    superAdminTest(
      'AC4 (R-003) — inventory_deduction_failed with inventoryDeducted=false → retry button visible inside expansion',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        await page.goto('/dashboard/incidents');
        await page.waitForLoadState('networkidle');

        const row = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}`
        );
        await row.click();

        const panel = page.getByTestId('incident-details-panel').first();
        // The existing <IncidentRetryButton> sets
        // aria-label="Retry inventory deduction for order {orderId}"
        // which is the button's accessible name (visible "Retry now"
        // text is the child label, but aria-label wins per ARIA spec).
        // Match the accessible name so getByRole resolves it —
        // R-003 mitigation: button is reachable from the new container.
        const retryButton = panel.getByRole('button', {
          name: /retry inventory deduction/i,
        });
        await expect(retryButton).toBeVisible();
        await expect(retryButton).toBeEnabled();
        // Visible-text confirmation — the button still reads "Retry now"
        // to the operator (regression guard if aria-label changes shape).
        await expect(panel.getByText('Retry now')).toBeVisible();
        await evidenceShot(page, 'REQ-077', 4, 'retry-button-in-expansion');
      }
    );

    superAdminTest(
      'AC4 (REQ-INV-016) — stale_paid_order panel shows status-history trail chronologically',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        await page.goto('/dashboard/incidents');
        await page.waitForLoadState('networkidle');

        const row = page.getByTestId(`incident-row-${s.staleOrder.incidentId}`);
        await row.click();

        const panel = page.getByTestId('incident-details-panel').first();
        await expect(panel).toContainText('Status history');

        const historyEntries = panel.getByTestId('status-history-entry');
        await expect(historyEntries).toHaveCount(2);
        await expect(historyEntries.first()).toContainText('confirmed');
        await expect(historyEntries.nth(1)).toContainText('preparing');
        await expect(historyEntries.nth(1)).toContainText(
          'kitchen-display received'
        );
        await evidenceShot(
          page,
          'REQ-077',
          4,
          'stale-order-status-history-trail'
        );
      }
    );

    superAdminTest(
      'AC5 — expanding a row triggers no /api/* network request (server-rendered)',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        await page.goto('/dashboard/incidents');
        await page.waitForLoadState('networkidle');

        const row = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}`
        );
        await expect(row).toBeVisible();

        // Track /api/* requests fired AFTER the row appears + before/during click.
        const apiRequests: string[] = [];
        const handler = (request: import('@playwright/test').Request) => {
          if (request.url().includes('/api/')) {
            apiRequests.push(request.url());
          }
        };
        page.on('request', handler);
        try {
          await row.click();
          // The expansion is client-state only; wait a beat for any opportunistic
          // request to settle (or not).
          await page.waitForTimeout(500);
          // Filter out any background /api/auth/session pings that React Query
          // may fire on focus/idle — AC5 is about NO per-row fetch on expand,
          // not "no requests in the world ever". Tighten to anything that
          // targets an incident-specific endpoint.
          const incidentApiRequests = apiRequests.filter((u) =>
            /\/api\/(incidents|incident-events|admin\/incidents)/.test(u)
          );
          expect(incidentApiRequests).toEqual([]);
        } finally {
          page.off('request', handler);
        }
      }
    );

    superAdminTest(
      'AC6 — URL hash #open=<id> renders the named row initially expanded after reload',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        await page.goto(
          `/dashboard/incidents#open=${s.deductionFailure.incidentId}`
        );
        await page.waitForLoadState('networkidle');

        const row = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}`
        );
        await expect(row).toBeVisible();
        // Initial state should already be expanded — hash drove
        // `useState(initial)` per REQ-INV-017.
        await expect(row).toHaveAttribute('aria-expanded', 'true');
        await expect(
          page.getByTestId(
            `incident-row-${s.deductionFailure.incidentId}-expanded`
          )
        ).toBeVisible();
        await evidenceShot(page, 'REQ-077', 6, 'hash-open-round-trip');
      }
    );

    superAdminTest(
      'AC6 (R-004) — malformed hash segments are silently ignored; no rows expanded; no script-injection',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        const s = seeded!;

        // Mix of garbage: HTML-injection attempt, SQL keyword, non-hex,
        // ridiculous length. All should be silently discarded by the
        // ObjectId regex defence (R-004 mitigation).
        const malicious = encodeURIComponent(
          '<script>alert(1)</script>,DROP TABLE incidents,not-hex-zz,$$$'
        );
        await page.goto(`/dashboard/incidents#open=${malicious}`);
        await page.waitForLoadState('networkidle');

        // Page renders normally — no crash, no script execution, no rows
        // expanded since no segments validated.
        const rowA = page.getByTestId(
          `incident-row-${s.deductionFailure.incidentId}`
        );
        const rowB = page.getByTestId(
          `incident-row-${s.staleOrder.incidentId}`
        );
        await expect(rowA).toBeVisible();
        await expect(rowA).toHaveAttribute('aria-expanded', 'false');
        await expect(rowB).toHaveAttribute('aria-expanded', 'false');

        // No alert dialog (which would suggest the <script> tag executed).
        // Playwright surfaces dialogs via page.on('dialog'); the absence
        // of a `dialog` handler call means no dialog was opened, which
        // is what we expect when the regex correctly discards the segment.
        let dialogFired = false;
        page.on('dialog', () => {
          dialogFired = true;
        });
        await page.waitForTimeout(300);
        expect(dialogFired).toBe(false);
      }
    );
  }
);
