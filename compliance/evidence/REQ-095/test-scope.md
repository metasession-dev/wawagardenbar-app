# Test Scope — REQ-095

**Risk Level:** HIGH
**Requirement:** Consistent cutoff-aware Daily Summary date selection
**GitHub Issue:** #603
**Date:** 2026-07-26

## Test approach

Full verification for a user-facing financial reporting change.

Universal gates:

- TypeScript compilation: 0 errors.
- SAST scan: 0 new high/critical findings.
- Dependency audit: 0 unaccepted high/critical vulnerabilities.
- Vitest unit/service tests pass.
- Playwright targeted report tests pass, followed by the full regression gate.
- Human review through the feature-to-`develop` PR and subsequent release PR.

High-risk testing:

- [x] Input boundary testing: exact cutoff and one millisecond before cutoff.
- [x] Financial attribution testing: records on both sides of the cutoff.
- [x] Legacy compatibility: records without `businessDate` use the documented fallback.
- [x] Regression testing: single-day, preset, custom range, and export period consistency.
- [x] Independent CI verification through repository quality gates.

## Acceptance criteria

- [x] Given a configured `15:00` WAT cutoff and a time before cutoff, when an admin selects Today and Yesterday, then the reports cover adjacent business-date labels and never the same label.
- [x] Given the same cutoff and a time after cutoff, when an admin selects Today and Yesterday, then the reports cover adjacent business-date labels.
- [x] Given any current time, when an admin selects Last 7 Days, then exactly seven inclusive business-date labels are queried, and the displayed picker range matches what was actually queried.
- [x] Given a custom date range A through B, when an admin generates a report, then the query includes exactly the inclusive business-date labels A through B.
- [x] Given orders or tabs at either side of the cutoff, when the report is generated, then each appears exactly in the expected business-date report.
- [ ] Given a legacy paid record without `businessDate`, when its paidAt timestamp is inside the selected business-date range, then it remains included through the documented fallback. _(Vitest-only; no E2E fixture for this branch — see Required verification.)_
- [x] Given an on-screen report, when an admin exports it, then the export period and totals match the visible report.
- [ ] Given month/year boundaries, when a range crosses the boundary, then no business date is duplicated or omitted. _(Vitest-only; not independently re-verified by E2E.)_
- [x] Given the real time is before the configured cutoff, when an admin loads the Daily Summary or clicks Today, then the report reflects the operational business date orders are actually attributed to — not the raw, un-shifted calendar date. _(Regression found live during REQ-095's own E2E verification, distinct from and deeper than the button-adjacency criteria above: adjacency alone doesn't guarantee Today's contents match what orders paid moments ago were attributed to.)_

### Scope addition — order-number generation race (found during REQ-095 regression testing)

Running the new E2E coverage against the full regression suite surfaced an unrelated but blocking defect: `OrderService.generateOrderNumber()` derived its sequence from `Order.countDocuments()`, which two concurrent order-creation calls could read identically before either inserted — colliding on the unique `orderNumber` index. Once that collision landed, the count was unaffected (the failed insert never landed), so every subsequent call for the rest of the day recomputed the exact same taken number: order creation stayed broken until the calendar date rolled over. Folded into REQ-095 rather than tracked separately because it was found, fixed, and verified within this same regression pass, and because it blocked verifying REQ-095's own report-delta assertions (no new order ⇒ no observable delta).

- [x] Given two order-creation calls in close succession, when each requests an order number, then both resolve to distinct, non-colliding numbers.
- [x] Given a sequence value the counter is unaware of already exists (e.g. legacy data), when the next number is requested, then generation skips past it rather than colliding.

## Required verification

- Unit tests for shared business-date label/range helpers.
- Service tests asserting Mongo query boundaries for single dates and ranges.
- Playwright tests for Today, Yesterday, Last 7 Days, and a custom range using deterministic cutoff-spanning fixtures (`e2e/critical/daily-report-business-date-selection.spec.ts`).
- Unit tests for `OrderService.generateOrderNumber()`'s atomic-counter and collision-retry behavior (`__tests__/services/order-service.generateOrderNumber.test.ts`).
