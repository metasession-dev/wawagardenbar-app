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
- WAT-normalised profitability and inventory-snapshot date handling.
- Dry-run-first, idempotent legacy provenance migration.
- Targeted unit/integration and tagged authenticated E2E coverage.

## Security and migration posture

No dependency or secret changes. The production migration is additive, must be dry-run and independently reviewed before apply, and never overwrites populated sale-time data.

## Reviewer checklist

- [ ] Review report-attribution and legacy-fallback wording.
- [ ] Confirm CI evidence is green and AC3 screenshot is available in DevAudit.
- [ ] Review dry-run migration counts before any production apply.
- [ ] Complete independent HIGH-risk UAT approval.
