# Test isolation contract — E2E retry-safe assertions

**Origin:** issue [#352](https://github.com/metasession-dev/wawagardenbar-app/issues/352) — UAT shared-state pollution amplified by Playwright `serial`-describe retries.

The load-bearing release-blocker for REQ-076 (PR [#336](https://github.com/metasession-dev/wawagardenbar-app/pull/336)) was a Playwright retry chain that re-created DB state inside `describe.serial` blocks. The retry doubled the contribution to aggregate assertions: `cashDelta=1224, expected=612` — exactly 2× — on `daily-report-payments.spec.ts:279`. This document captures the contract critical-tier E2E specs follow to be deterministic under retry, against shared CI Mongo state, and across same-day concurrent runs.

The defenses are layered. **Use the cheapest one that's sufficient for your spec.**

---

## Layer 1 — `retries: 0` on the critical project (foundation)

`playwright.config.ts`:

```ts
{
  name: 'critical',
  retries: 0,        // ← load-bearing per #352
  testMatch: [/e2e\/smoke\/.*\.spec\.ts$/, /e2e\/critical\/.*\.spec\.ts$/, ...],
  dependencies: ['auth-setup'],
}
```

This eliminates the **within-run retry-doubling** class. A `describe.serial` block that fails partway no longer re-creates its DB state. Transient flakes surface as a single PR-gate failure that the operator manually reruns — accepted trade for eliminating the spurious-doubling case entirely.

Regression tier keeps the top-level `retries: 2` because its post-merge auto-issue safety net (per the 3-tier model, see [`Test_Strategy.md`](Test_Strategy.md) § _E2E gating model_) handles its noise differently.

---

## Layer 2 — Entity-specific assertions (preferred for tip + payment write-path proofs)

When a spec proves "the UI flow wrote field X with value V", the **strongest** assertion is to query Mongo for the specific entity that field belongs to — not to verify a downstream aggregate.

### Pattern

```ts
import {
  findRecentOrderWithTip,
  deleteOrderById,
} from '../helpers/db-assertions';

test.describe('REQ-XXX: ...', () => {
  let createdOrderId: string | null = null;

  test.afterEach(async () => {
    if (createdOrderId) {
      await deleteOrderById(createdOrderId).catch(() => {});
      createdOrderId = null;
    }
  });

  test('order persists tip with expected method', async ({ page }) => {
    const since = new Date(); // ← scope the DB query to "this test"

    // ... UI flow ...

    const order = await findRecentOrderWithTip({
      since,
      tipAmount: 500,
      tipPaymentMethod: 'cash',
      paymentMethod: 'card',
    });
    expect(order).toBeTruthy();
    expect(order.tipAmount).toBe(500);
    expect(order.tipPaymentMethod).toBe('cash');
    expect(order.paymentMethod).toBe('card');

    createdOrderId = String(order._id);
  });
});
```

### Why this is strongest

- **Retry-safe** — the query scopes to `paidAt: { $gte: since }` so it can't pick up a previous attempt's record. With `retries: 0` at the project level, retries can't even happen, but the timestamp scope is belt-and-braces against same-day concurrent runs.
- **Concurrency-safe** — even if a cron run + a PR run + a manual dispatch all fire on the same calendar day, each captures its own `since` and finds only its own record.
- **Stronger semantically** — asserts the actual field that REQ-035 specifies (`tipPaymentMethod`), not a derived aggregate. A regression in the WRITE path is caught directly; the aggregation correctness is already unit-tested at `__tests__/services/financial-report-service.tip.test.ts` etc.
- **Cleanup is trivial** — `deleteOrderById(createdOrderId)` in `afterEach`.

### Where to use it

Specs that prove "this UI flow caused this DB write" — `express-tip-capture.spec.ts`, `close-tab-tip-capture.spec.ts`. Any spec whose AC is "field X persists with value V after action Y" should use this pattern.

### Helpers

See [`e2e/helpers/db-assertions.ts`](../e2e/helpers/db-assertions.ts):

| Helper                                                                        | When to use                        |
| ----------------------------------------------------------------------------- | ---------------------------------- |
| `findRecentOrderWithTip({since, tipAmount, tipPaymentMethod, paymentMethod})` | Tip-recording E2Es                 |
| `findRecentTabWithTip({since, tipAmount, paymentType})`                       | Close-tab tip E2Es                 |
| `findRecentPaidOrder({since, total, paymentMethod})`                          | Revenue-tracking E2Es              |
| `deleteOrderById(id)` / `deleteTabById(id)`                                   | Cleanup in afterEach / afterAll    |
| `deleteOrdersByReferencePrefix(prefix)`                                       | Bulk cleanup by `paymentReference` |
| `pollForDoc(collection, filter, opts)`                                        | Generic — for new entity types     |

---

## Layer 3 — Relaxed `>=` assertions (acceptable for revenue-reporting E2Es)

When a spec proves "the daily report INCLUDES my payment", strict equality (`expect(delta).toBe(amount)`) is the wrong contract. It claims "no other writes on this day" — which is true on an isolated dev box but **false on shared CI Mongo with concurrent runs and yesterday's residue**.

Use `>=` instead:

```ts
const delta = updated.cash - baseline.cash;
// Correct: "the daily report INCLUDES my payment". May also include
// other contributions (concurrent runs / prior fixtures) — that's not
// a failure of MY test.
expect(delta).toBeGreaterThanOrEqual(myPaymentAmount);
```

**The strict no-double-counting check moves to the unit-test layer** — see `__tests__/services/financial-report-service.partial-payment-no-double-count.test.ts`, which proves `paymentBreakdown.total === expected` deterministically with mocked Mongo. The E2E asserts the integration shape (UI flow → DB write → daily report includes), not the math.

### Where to use it

Specs where dropping the aggregate assertion would lose meaningful integration coverage but the strict math is already unit-tested. Examples: `daily-report-payments.spec.ts`, `dashboard-revenue.spec.ts`, `express-order-report.spec.ts`.

---

## Layer 4 — Cleanup of created entities (hygiene)

Critical-tier specs that create tabs / orders / inventory entries SHOULD clean up after themselves. Not strictly required for correctness (Layers 1-3 cover that), but it bounds the residue load on shared CI Mongo and keeps later runs' baselines clean.

```ts
test.afterAll(async () => {
  if (createdTabId) {
    const { deleteTabById } = await import('../helpers/db-assertions');
    await deleteTabById(createdTabId);
  }
});
```

Use `afterAll` rather than `afterEach` for serial-describe blocks where the tab persists across tests in the same block. Always wrap in try/catch (or `.catch(() => {})`) — cleanup failure should never fail the spec.

### What if the failing test skips cleanup?

It usually does. `afterEach` / `afterAll` run on success and on `test.skip()`, but **NOT** on uncaught test failure when the test itself throws. The defenses in Layers 1-3 are what makes the suite robust against this — cleanup is a hygiene optimisation, not the safety net.

### Where to use it

Any spec that creates DB entities. Even revenue-reporting specs that survive on `>=` benefit from cleanup so daily-aggregate baselines stay small.

---

## Anti-patterns

| ❌ Don't                                                    | ✅ Do                                                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `expect(report.cash - baseline.cash).toBe(amount)`          | `expect(report.cash - baseline.cash).toBeGreaterThanOrEqual(amount)` OR direct DB query for the specific order |
| Rely on `afterEach` cleanup to keep state clean             | Use timestamp-scoped queries that don't depend on a clean baseline                                             |
| Create unbounded test data and never clean up               | At minimum, use a distinctive `paymentReference` prefix (`E2E-XYZ-${Date.now()}`) so cleanup is possible later |
| Use `describe.serial` when tests don't depend on each other | Use independent tests where possible; `describe.serial` couples failure modes                                  |
| Set `retries > 0` on critical tier                          | Keep `retries: 0` on critical — surface flakes don't amplify into doubling                                     |

---

## The 3-tier model — where this contract applies

| Tier           | Retry policy              | Isolation expectation                                                                                                                                                            |
| -------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **smoke**      | inherits `retries: 2`     | Smoke specs should be fast + side-effect-free — Layer 1 should be enough for most.                                                                                               |
| **critical**   | `retries: 0` (foundation) | All four layers in play. Specs use Layer 2 or 3 + Layer 4 cleanup. **This contract is mandatory for critical-tier specs.**                                                       |
| **regression** | inherits `retries: 2`     | Best-effort. Post-merge auto-issue mechanism (see `e2e-regression.yml` + `Test_Strategy.md`) catches anything that slips through. This contract is recommended but not enforced. |

---

## Worked examples

- `e2e/critical/express-tip-capture.spec.ts` — Layer 2 (entity-specific DB query)
- `e2e/critical/close-tab-tip-capture.spec.ts` — Layer 2 + Layer 4 (cleanup by RESTORING the open-tab fixture, not deleting it)
- `e2e/critical/daily-report-payments.spec.ts` — Layer 3 (`>=`) + Layer 4 (delete the test-created tab)
- `e2e/critical/dashboard-revenue.spec.ts` — Layer 3 (already uses `>=`; no changes needed for retry-safety)
- `e2e/critical/express-order-report.spec.ts` — Layer 3 (already uses `>=`; no changes needed)

---

## Refs

- [`Test_Strategy.md`](Test_Strategy.md) § _E2E gating model — three tiers_
- [`Test_Policy.md`](Test_Policy.md) § _E2E gate enforcement (v0.1.53+)_
- Issue [#352](https://github.com/metasession-dev/wawagardenbar-app/issues/352) — the motivating bug
- Issue [#360](https://github.com/metasession-dev/wawagardenbar-app/issues/360) / PR [#361](https://github.com/metasession-dev/wawagardenbar-app/pull/361) — 3-tier adoption
- PR [#353](https://github.com/metasession-dev/wawagardenbar-app/pull/353) — the unit-test pin that lets the E2E drop the strict no-double-counting check
- [`e2e/helpers/db-assertions.ts`](../e2e/helpers/db-assertions.ts) — the helper library
