import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local so auth credentials are available in test workers
config({ path: path.resolve(__dirname, '.env.local'), override: false });

/**
 * Playwright configuration for Wawa Garden Bar E2E tests.
 *
 * Suite selection is by PROJECT, each project scoping which specs run:
 *
 *   npx playwright test --project=smoke        # fast critical-path subset — CI per-push gate
 *   npx playwright test --project=regression   # full suite — PR→main + nightly
 *
 * Suite membership is by location (low-churn, self-service):
 *   - `smoke`     → e2e/smoke/**.spec.ts + requirements-verification.spec.ts
 *   - `regression`→ every *.spec.ts (smoke + the authenticated feature specs)
 *
 * New critical-path tests go under e2e/smoke/. Feature/regression specs live in
 * e2e/ (and its area subdirs). Run one spec/area directly with a file path or
 * --grep "REQ-034". Authenticated specs apply their own session via
 * base.extend({ storageState }) (see e2e/kitchen/helpers.ts); the projects only
 * order `auth-setup` first.
 *
 * @requirement REQ-007 — Comprehensive Requirements Document verification
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'compliance/evidence/REQ-007/e2e-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on', // Capture screenshot for every test
    video: 'on-first-retry', // Also capture video on retry for evidence
  },
  projects: [
    // Auth setup — logs in as csr/admin/super-admin, saves storageState to
    // .auth/*.json. Runs first as a dependency of the suites below.
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Smoke — fast critical-path subset. CI per-push gate.
    {
      name: 'smoke',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [/e2e\/smoke\/.*\.spec\.ts$/, /requirements-verification\.spec\.ts$/],
      dependencies: ['auth-setup'],
    },
    // Regression — the full suite (smoke + authenticated feature specs).
    // Runs on PR→main and nightly.
    {
      name: 'regression',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /\.spec\.ts$/,
      dependencies: ['auth-setup'],
    },
  ],
  /* Start dev server before tests (skipped when BASE_URL is set) */
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
