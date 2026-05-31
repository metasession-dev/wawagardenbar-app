# REQ-052 — Test scope

**Requirement:** Open tabs become visible to the DFR by ensuring
`tab.businessDate` is set when the first partial payment lands, mirroring
the pattern that `closeTab` and `completeTabPaymentManually` already follow.

## In scope

- **Unit** — `__tests__/services/tab-service.business-date.test.ts`
  (4 new cases). All four exercise `TabService.recordPartialPayment` with
  the surrounding `SystemSettingsService.getBusinessDayCutoff` +
  `deriveBusinessDate` boundary mocked:
  1. **AC1** — first partial on a tab without `businessDate` sets it via
     `deriveBusinessDate(new Date(), cutoff)`; both the cutoff fetch and
     the date-derivation are exercised.
  2. **AC2** — second-or-later partial on a tab that already has
     `businessDate` does NOT overwrite (and `deriveBusinessDate` is not
     called at all on that path).
  3. **Multi-partial** — three sequential partials on the same tab call
     `deriveBusinessDate` exactly once; a sentinel return value swap rules
     out silent re-derivation.
  4. **Cutoff plumbing** — a non-default cutoff (`'06:00'`) is forwarded
     verbatim from `SystemSettingsService.getBusinessDayCutoff` to
     `deriveBusinessDate`.

- **Regression (existing tab-service suite)** — `tab-service.tip.test.ts`,
  `tab-service.tip-method.test.ts`, `tab-service.delete-super-admin.test.ts`,
  `tab-service.pagination.test.ts`, `tab-service.eligible-rewards.test.ts`
  all pass without modification. The mock set added in REQ-051 to
  `financial-report-service.tip.test.ts`/`tip-method.test.ts`/`order-type.test.ts`
  remains in place.

- **E2E** — `e2e/daily-report-payments.spec.ts:daily report shows partial
payment even though tab is still open` (the [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202)
  test, previously skipped/failing).

## Out of scope

- `generateDateRangeReport` aggregation — REQ-051 deliberately left the
  date-range report untouched and REQ-052 inherits that boundary. Range
  reports aggregate over `Order.businessDate`, which is set on
  closure-via-close-tab (already correct path); no open-tab regression
  surface exists for that report.
- A "lock business day to the order's added timestamp" semantic — the
  intentional choice (per the plan) is that the first cash event anchors
  the tab's business day, not the first menu item added.
- A schema migration. `Tab.businessDate` field type is unchanged; the
  field was always declared optional.

## Risk-based depth

MEDIUM risk → unit + e2e per [`Test_Policy.md`](../../../Test_Policy.md)
§Risk-Based Testing. The 3-LOC change is data-integrity only, no auth
surface; the unit boundary is the load-bearing gate (the production code
path is verifiable to be exact, not statistical).
