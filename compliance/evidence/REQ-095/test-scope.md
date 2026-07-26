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

- [ ] Given a configured `15:00` WAT cutoff and a time before cutoff, when an admin selects Today and Yesterday, then the reports cover adjacent business-date labels and never the same label.
- [ ] Given the same cutoff and a time after cutoff, when an admin selects Today and Yesterday, then the reports cover adjacent business-date labels.
- [ ] Given any current time, when an admin selects Last 7 Days, then exactly seven inclusive business-date labels are queried.
- [ ] Given a custom date range A through B, when an admin generates a report, then the query includes exactly the inclusive business-date labels A through B.
- [ ] Given orders or tabs at either side of the cutoff, when the report is generated, then each appears exactly in the expected business-date report.
- [ ] Given a legacy paid record without `businessDate`, when its paidAt timestamp is inside the selected business-date range, then it remains included through the documented fallback.
- [ ] Given an on-screen report, when an admin exports it, then the export period and totals match the visible report.
- [ ] Given month/year boundaries, when a range crosses the boundary, then no business date is duplicated or omitted.

## Required verification

- Unit tests for shared business-date label/range helpers.
- Service tests asserting Mongo query boundaries for single dates and ranges.
- Playwright tests for Today, Yesterday, Last 7 Days, and a custom range using deterministic cutoff-spanning fixtures.
