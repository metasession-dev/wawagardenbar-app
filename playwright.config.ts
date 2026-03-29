import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local so auth credentials are available in test workers
config({ path: path.resolve(__dirname, '.env.local'), override: false });

/**
 * Playwright configuration for Wawa Garden Bar E2E tests
 * @requirement REQ-007 - Comprehensive Requirements Document verification
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
    // Unauthenticated tests — no login required
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /requirements-verification\.spec\.ts/,
    },
    // Auth setup — logs in as admin and super-admin, saves storageState
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Authenticated tests — reuse saved sessions
    {
      name: 'authenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /authenticated\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    // CSR role UAT tests
    {
      name: 'csr-uat',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /csr-uat\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    // Partial payment tests (REQ-012)
    {
      name: 'partial-payments',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /partial-payments\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    // Daily report payment accuracy (REQ-013)
    {
      name: 'daily-report-payments',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /daily-report-payments\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    // Reconciliation checkbox (REQ-014)
    {
      name: 'reconciliation',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /reconciliation\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
    // Staff Pot (REQ-015)
    {
      name: 'staff-pot',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /staff-pot\.spec\.ts/,
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
