# REQ-091 Test Scope

## Requirement

Stabilize the REQ-084 AC12 E2E smoke test (`e2e/smoke/req-084-checkout-separation.spec.ts`) so it no longer fails when the first menu item rendered on `/menu` is out of stock.

## Acceptance Criteria

- AC1: The AC12 test seeds a deterministic, in-stock menu item and interacts with that item's card.
- AC2: The test no longer depends on the ordering or stock status of pre-existing seed data.
- AC3: `npx playwright test e2e/smoke/req-084-checkout-separation.spec.ts` passes locally against a clean test database.
- AC4: Quality Gates pass on the PR and remain green on `develop` after merge.

## Test Approach

- **E2E:** Update the existing AC12 Playwright test to insert a fresh `menuitems` document with `isOutOfStock: false` and `isAvailable: true`, then locate it via `data-testid` before opening the detail modal.
- **No new unit tests:** This is a test-only change with no application code changes.
- **CI regression:** The existing Quality Gates pipeline will validate the fix.

## Traceability

- Source issue: https://github.com/metasession-dev/wawagardenbar-app/issues/478
- Parent requirement: REQ-084 (released) — anonymous customer checkout flow.
