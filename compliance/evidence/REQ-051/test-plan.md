# Test Plan — REQ-051

**Requirement:** REQ-051 — DFR aggregation queries by business-day range, not calendar-day range
**Risk Level:** HIGH → unit + integration; e2e for the 7 originally-blocked specs
**Date:** 2026-05-30

## Approach

Vitest, no DB required, fully mocked per the existing `financial-report-service.*.test.ts` convention. 14 new cases total: 9 unit (helper boundary semantics) + 5 integration (the service's filter shape verified by extracting the `$or` branch's `businessDate.$gte` / `.$lte` from the mock call). 3 existing `financial-report-service.*.test.ts` files gained a `SystemSettingsService` mock to stub the new awaited cutoff fetch.

The load-bearing assertion is **AC1** — for `generateDailySummary(date)` invoked at 07:00 WAT (before cutoff), the OrderModel.find filter's `businessDate` range covers the _previous_ business day, which is the business day the moment is inside.

## Cases

### 1. New unit coverage — `__tests__/lib/business-date.test.ts` (+9)

- **start equals deriveBusinessDate(date, cutoff)** — pins the helper to the existing REQ-025 attribution function.
- **end is 24h − 1ms after start** — invariant on the range width.
- **AC1: 07:00 WAT (before cutoff) → range is the previous business day.**
- **AC2: 16:00 WAT (after cutoff) → range is the current business day.**
- **boundary at 14:59:59.999 WAT → previous business day.**
- **boundary at 15:00:00.000 WAT → current business day.**
- **falls back to 15:00 default on invalid cutoff** — matches `deriveBusinessDate`'s fallback contract.
- **an order created at `now` has its businessDate inside the range** — the substantive invariant the report query depends on.
- **consecutive moments at the boundary land in adjacent ranges** — no gap, no overlap.

### 2. New integration coverage — `__tests__/services/financial-report-service.business-day.test.ts` (+5)

Helper `extractBusinessDateRange(callArgs)` walks the `$or` filter and returns the businessDate range; tests then assert against it.

- **AC1: at 07:00 WAT (before cutoff) → range covers the _previous_ business day.**
- **AC2: at 16:00 WAT (after cutoff) → range covers the _current_ business day.**
- **an order created at the same `now` falls inside the query range.**
- **honours a non-default cutoff (06:00 WAT)** — proves the cutoff is actually read from `SystemSettingsService`.
- **falls back to 15:00 default when cutoff is invalid** — robustness.

### 3. Existing tests updated — 3 files, no behavioural change

- `__tests__/services/financial-report-service.tip.test.ts`
- `__tests__/services/financial-report-service.tip-method.test.ts`
- `__tests__/services/financial-report-service.order-type.test.ts`

Each gains:

```ts
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue('15:00'),
  },
}));
```

placed between the existing mocks and the service import. Without this, `generateDailySummary`'s new awaited cutoff fetch hangs.

### 4. E2E — focused regression on the 7 affected specs

Dispatched on the feature branch:

```bash
gh workflow run e2e-regression.yml --ref feat/REQ-051-dfr-business-day-range \
  --field specs='e2e/daily-report-payments.spec.ts e2e/dashboard-revenue.spec.ts \
                 e2e/express-order-report.spec.ts \
                 e2e/kitchen/daily-report-regression.spec.ts \
                 e2e/orders/express-tip-capture.spec.ts'
```

Result (run [`26678721792`](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26678721792)): **48 expected, 4 unexpected, 0 flaky, 0 skipped**. Of the 7 originally-failing targeted by REQ-051:

|     | Test                                                              | Outcome                                                                                                   |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `daily-report-payments:reflects both payment methods`             | ✅ passed                                                                                                 |
| 2   | `dashboard-revenue:revenue increased by the order amount`         | ✅ passed                                                                                                 |
| 3   | `dashboard-revenue:payment method section renders`                | ✅ passed                                                                                                 |
| 4   | `express-order-report:reflects cash payment`                      | ✅ passed                                                                                                 |
| 5   | `kitchen/daily-report-regression:AC14 production batch invariant` | ❌ different bug — CSS selector ([#200](https://github.com/metasession-dev/wawagardenbar-app/issues/200)) |
| 6   | `kitchen/daily-report-regression:Total Revenue card`              | ❌ same CSS bug ([#200](https://github.com/metasession-dev/wawagardenbar-app/issues/200))                 |
| 7   | `orders/express-tip-capture:AC7 Tips Received`                    | ❌ tip path needs same fix ([#201](https://github.com/metasession-dev/wawagardenbar-app/issues/201))      |

Plus 1 newly-exercised failure: `daily-report-payments:partial payment when tab is still open` — was previously skipped in serial mode; filed as [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202).

## Gates run on `feat/REQ-051-dfr-business-day-range`

- `npx tsc --noEmit` — exit 0
- `npx vitest run` (full suite) — **889 pass · 0 fail · 4 skip** (14 new + 3 existing-with-mock cases included)
- `npx eslint <changed files>` — 0 errors
