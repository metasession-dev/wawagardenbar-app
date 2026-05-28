import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Auth Setup — Creates reusable authenticated sessions for E2E tests.
 *
 * Playwright runs this before the authenticated test suites.
 * Session cookies are saved to JSON files and reused via storageState.
 *
 * Credentials are read from environment variables (set in .env.local):
 *   E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD       (preferred)
 *   E2E_SUPER_ADMIN_USERNAME / E2E_SUPER_ADMIN_PASSWORD  (preferred)
 *   ADMIN_USERNAME / ADMIN_PASSWORD                (fallback)
 *   SUPER_ADMIN_USERNAME / SUPER_ADMIN_PASSWORD    (fallback)
 *
 * If admin users have not been seeded (scripts/seed-e2e-admins.ts),
 * run that script first.
 */

const CSR_FILE = path.join(__dirname, '../.auth/csr.json');
const ADMIN_FILE = path.join(__dirname, '../.auth/admin.json');
const SUPER_ADMIN_FILE = path.join(__dirname, '../.auth/super-admin.json');

async function loginAsAdmin(
  page: import('@playwright/test').Page,
  username: string,
  password: string
): Promise<boolean> {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');

  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button:has-text("Login")');

  // Wait for navigation — admin login redirects to /dashboard on success
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    return true;
  } catch {
    // Login likely failed — check for error on page
    const body = await page.textContent('body');
    const hasError = body?.includes('Invalid') || body?.includes('failed') || body?.includes('locked');
    if (hasError) {
      console.warn(`Login failed for "${username}": ${body?.substring(0, 200)}`);
    } else {
      console.warn(`Login timed out for "${username}" — page URL: ${page.url()}`);
    }
    return false;
  }
}

/**
 * In CI a missing or failed login must FAIL the run, not silently save empty
 * auth state — otherwise authenticated specs skip and CI goes green having
 * tested nothing. Locally (no CI) we keep the graceful-skip behaviour so the
 * unauthenticated suite still runs without seeded admins.
 */
function requireAuthOrFailInCI(context: string, detail: string): void {
  const msg = `${context}: ${detail}`;
  if (process.env.CI) {
    throw new Error(
      `${msg}. In CI this is fatal — seed E2E users (npx tsx scripts/seed-e2e-admins.ts) ` +
        `and set E2E_*_USERNAME / E2E_*_PASSWORD. Refusing to save empty auth state.`
    );
  }
  console.warn(`${msg} — authenticated tests will be skipped (local only).`);
}

setup('authenticate as csr', async ({ page }) => {
  const username = process.env.E2E_CSR_USERNAME;
  const password = process.env.E2E_CSR_PASSWORD;

  if (!username || !password) {
    requireAuthOrFailInCI('CSR credentials not set', 'no E2E_CSR_USERNAME / E2E_CSR_PASSWORD');
    await page.goto('/');
    await page.context().storageState({ path: CSR_FILE });
    return;
  }

  const success = await loginAsAdmin(page, username, password);

  if (success) {
    expect(page.url()).toContain('/dashboard');
  } else {
    requireAuthOrFailInCI('CSR auth setup failed', 'login did not reach /dashboard');
    await page.goto('/');
  }

  await page.context().storageState({ path: CSR_FILE });
});

setup('authenticate as admin', async ({ page }) => {
  const username = process.env.E2E_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    requireAuthOrFailInCI(
      'Admin credentials not set',
      'no E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD'
    );
    await page.goto('/');
    await page.context().storageState({ path: ADMIN_FILE });
    return;
  }

  const success = await loginAsAdmin(page, username, password);

  if (success) {
    // Verify we landed on dashboard — the session cookie is set
    expect(page.url()).toContain('/dashboard');
  } else {
    requireAuthOrFailInCI('Admin auth setup failed', 'login did not reach /dashboard');
    // Navigate somewhere to have a valid state
    await page.goto('/');
  }

  await page.context().storageState({ path: ADMIN_FILE });
});

setup('authenticate as super-admin', async ({ page }) => {
  const username = process.env.E2E_SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.E2E_SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;

  if (!username || !password) {
    requireAuthOrFailInCI(
      'Super-admin credentials not set',
      'no E2E_SUPER_ADMIN_USERNAME / E2E_SUPER_ADMIN_PASSWORD'
    );
    await page.goto('/');
    await page.context().storageState({ path: SUPER_ADMIN_FILE });
    return;
  }

  const success = await loginAsAdmin(page, username, password);

  if (success) {
    expect(page.url()).toContain('/dashboard');
  } else {
    requireAuthOrFailInCI('Super-admin auth setup failed', 'login did not reach /dashboard');
    await page.goto('/');
  }

  await page.context().storageState({ path: SUPER_ADMIN_FILE });
});
