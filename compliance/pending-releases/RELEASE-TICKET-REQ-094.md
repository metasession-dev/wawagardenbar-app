# Release Ticket — REQ-094: Reporting Attribution and Reconciliation Correctness

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-07-18
**Risk:** HIGH
**Implementation PR:** #517

## Summary

REQ-094 makes financial report attribution consistent with the WAT business-date model and prevents newly-created sales from changing categories in historical reporting after menu maintenance. Legacy rows are explicitly marked as current-menu fallback data; they are not represented as original sale-time history.

## Included changes

- Immutable `mainCategoryAtSale` / `categoryAtSale` order-item fields.
- Main-category and profitability report preference for sale-time taxonomy.
- Daily/range report sections, charts, and exports map every configured Main Category rather than collapsing non-legacy categories into Other.
- WAT-normalised profitability and inventory-snapshot date handling.
- Dry-run-first, idempotent legacy provenance migration.
- Targeted unit/integration and tagged authenticated E2E coverage.

## Bundled Changes

- **Core tracked release:** REQ-094 reporting attribution and reconciliation correctness.
- **Absorbed predecessor releases:** None. `v2026.07.14` was already superseded by released REQ-093 and remains distinct historical lineage.
- **Absorbed non-release work:** None.
- **Why bundled here:** No predecessor release is bundled. The repository's stale v2026.07.14 pending ticket is reconciled to its existing REQ-093 supersession separately.
- **Evidence impact:** REQ-094 retains only its own implementation, test, and security evidence. REQ-093 retains v2026.07.14 lineage and cycles.
- **Reviewer impact:** Approval covers REQ-094 only; it does not relabel or reassign prior released work.
- **Security / risk impact:** No additional application-security impact beyond the REQ-094 HIGH-risk reporting and migration controls.

## Security and migration posture

No dependency or secret changes. The production migration is additive, must be dry-run and independently reviewed before apply, and never overwrites populated sale-time data.

## Reviewer checklist

- [ ] Review report-attribution and legacy-fallback wording.
- [ ] Confirm CI evidence is green and the feature E2E workflow uploaded the AC3 PNG screenshot plus sidecar provenance to DevAudit.
- [ ] Review dry-run migration counts before any production apply.
- [ ] Complete independent HIGH-risk UAT approval.
