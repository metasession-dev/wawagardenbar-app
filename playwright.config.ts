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
/**
 * REQ-116 (AC12, #979) — specs that only pass when nothing else touches the
 * same shared rows: (a) assertions on GLOBAL aggregates (daily report /
 * dashboard totals) between a baseline and a later read, which other specs
 * creating, cancelling or deleting orders move; (b) the REQ-066 inventory
 * specs, which both mutate the first eligible shared inventory row. Each runs
 * as its own project chained
 * through `dependencies`: Playwright runs a project's dependencies to
 * completion first, so they never overlap each other or the parallel specs.
 * `critical` depends on the last link, so `--project=critical` still runs them
 * and a worker count above 1 stays safe.
 *
 * `regression` deliberately does NOT depend on the chain (#996): the sharded
 * full run (e2e/ci-reliability/regression-run.sh) re-ran the whole chain in
 * every shard, about 46 extra tests each, and shards 1 and 2 exceeded their
 * per-shard time budget. CI runs with one worker, so the specs already run
 * one at a time there and the regression project includes them directly.
 */
const AGGREGATE_SPECS = [
  'admin-order-inventory-delta.over-sell',
  'admin-order-inventory-delta.sale-point',
  'dashboard-revenue',
  'express-order-report',
  'daily-report-payments',
  // REQ-120: rewrites shop-wide settings (hours, minimum, radius, hourly cap)
  // for the duration of each test, so nothing else may create orders then.
  'customer-order-validation',
  'customer-order-journey',
  'customer-ordering-options-ui',
];
const aggregateProjects = AGGREGATE_SPECS.map((name, i) => ({
  name: `critical-aggregate-${name}`,
  use: { ...devices['Desktop Chrome'] },
  testMatch: new RegExp(
    `e2e/critical/${name.replace(/\./g, '\\.')}\\.spec\\.ts$`
  ),
  retries: 0,
  dependencies:
    i === 0 ? ['auth-setup'] : [`critical-aggregate-${AGGREGATE_SPECS[i - 1]}`],
}));
const AGGREGATE_LAST = aggregateProjects[aggregateProjects.length - 1].name;
const AGGREGATE_IGNORE = AGGREGATE_SPECS.map(
  (name) =>
    new RegExp(`e2e/critical/${name.replace(/\./g, '\\.')}\\.spec\\.ts$`)
);

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
    ...aggregateProjects,
    // Smoke — fast critical-path subset. CI per-push gate.
    {
      name: 'smoke',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        /e2e\/smoke\/.*\.spec\.ts$/,
        /e2e\/realtime\/.*\.spec\.ts$/,
        /requirements-verification\.spec\.ts$/,
      ],
      dependencies: ['auth-setup'],
    },
    // Critical — release-gating Must-tier coverage. PR-to-main gate.
    // Selects e2e/smoke/ + e2e/critical/ + the cross-REQ verification spec.
    // ~10-15 min wall-clock target per the 3-tier model (devaudit v0.1.53,
    // see SDLC/Test_Strategy.md § "E2E gating model — three tiers").
    //
    // `retries: 0` is load-bearing per #352: the retry-amplification of
    // `describe.serial` blocks that write to the DB (create tab + record
    // partial payment + close tab → daily-report-delta assertions) was
    // the load-bearing #336 release-blocker. A retried serial group re-
    // creates DB state, doubling the contribution to aggregate
    // assertions. The critical tier's specs are refactored to use direct
    // entity assertions (see SDLC/test-isolation.md) so they don't need
    // retries to be reliable. Transient flakes manifest as a single PR-
    // gate failure that the operator manually reruns — accepted trade for
    // eliminating the spurious-doubling class entirely. Regression tier
    // keeps `retries: 2` (top-level config) because the post-merge auto-
    // issue safety net handles its noise.
    {
      name: 'critical',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        /e2e\/smoke\/.*\.spec\.ts$/,
        /e2e\/critical\/.*\.spec\.ts$/,
        /e2e\/invariants\/inventory-deduction-checkout\.spec\.ts$/,
        /requirements-verification\.spec\.ts$/,
      ],
      testIgnore: AGGREGATE_IGNORE,
      retries: 0,
      dependencies: ['auth-setup', AGGREGATE_LAST],
    },
    // Regression — the full suite (smoke + critical + every authenticated
    // feature spec). Runs nightly + on push-to-main (auto-issues on failure
    // per the 3-tier model's safety net) + workflow_dispatch.
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
