---
title: 'Implementation plan — REQ-094'
requirement_id: 'REQ-094'
risk_class: 'HIGH'
change_type: 'fix'
authored_by: 'sdlc-implementer@1.0'
authored_at: '2026-07-18'
---

# Implementation plan — REQ-094

**Issue:** [#439](https://github.com/metasession-dev/wawagardenbar-app/issues/439)  
**Release coordination:** [#514](https://github.com/metasession-dev/wawagardenbar-app/issues/514)

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

This plan supplies the test plan, secure-SDLC, privacy-by-design, and technical-documentation evidence required for REQ-094.

## 1. Goal + acceptance criteria

**Goal:** Make financial and inventory reports use an explicit, consistent business-date and historical-category contract, so an authorised reviewer can understand and reconcile the numbers shown.

| AC  | Description                                                                                                                                                                                                                                                       | SRS item it traces to       | Verification                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| AC1 | Given paid orders spanning a configured WAT cutoff, when an authorised admin selects a profitability range, then totals and daily trends use the same business-day attribution as the Daily and per-main-category reports.                                        | REQ-REPORT-002              | Service unit/integration tests plus authenticated report UI test.                      |
| AC2 | Given a menu item is later reclassified, when an authorised admin reviews a profitability or main-category report for a newly-created sale, then the sale remains attributed to the category and main category captured at sale time.                             | REQ-REPORT-003; REQ-INV-007 | Model/service tests, migration tests, and report UI coverage.                          |
| AC3 | Given an authorised admin applies a category filter, when the profitability report renders, then summary, item, category, order-type, and daily results are consistently scoped and the category breakdown is populated rather than silently empty.               | REQ-REPORT-003              | Service/API/action tests and authenticated UI test.                                    |
| AC4 | Given staff submit or review an inventory snapshot in WAT, when the snapshot is retrieved or deduplicated by date, then its date is normalised through the shared business-date contract rather than the server timezone.                                         | REQ-INV-003; REQ-INV-004    | Service tests at WAT boundaries and UI/API integration coverage.                       |
| AC5 | Given pre-REQ-094 orders without immutable category-at-sale fields, when reports include them, then the application does not present a current menu category as historical fact: the legacy fallback is explicit and documented, and the migration is idempotent. | REQ-REPORT-003; REQ-INV-007 | Migration fixture tests, report contract tests, and reviewer-visible legacy labelling. |

## 2. Scope

**In scope:**

- `models/order-model.ts` and order creation/update paths: immutable `mainCategoryAtSale` and `categoryAtSale` snapshots on order items, populated from the authoritative menu item at sale time.
- A versioned, idempotent migration/backfill with a provenance field for legacy rows. It may use current menu metadata only as a labelled fallback; it must never claim that fallback is original historical category data.
- `services/profitability-analytics-service.ts`, profitability action/API, and dashboard client: WAT business-day queries, category filtering, populated category aggregation, and a single documented gross-profit definition.
- `services/financial-report-service.ts`: per-main-category aggregation changed to prefer immutable item snapshots, with an explicit legacy fallback.
- `services/inventory-snapshot-service.ts` and snapshot retrieval/filtering: shared WAT date normalisation rather than `Date#setHours` in the server timezone.
- Unit/integration and targeted authenticated E2E coverage, evidence capture, migration runbook, and reviewer-facing report labelling.

**Out of scope:**

- Rewriting historical financial values, payment allocation, or inventory quantities.
- Claiming exact historical categories for orders where no sale-time category was persisted.
- Redesigning report exports, staff-pot calculations, or changing the configured business-day cutoff.

### Surface inventory

| Surface                              | URL / file                                                                        | Status                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Profitability dashboard              | `/dashboard/reports/profitability`; `services/profitability-analytics-service.ts` | In scope                                                                                                   |
| Daily report                         | `/dashboard/reports/daily`; `services/financial-report-service.ts`                | Already works for business-day attribution; regression/reconciliation coverage in scope                    |
| Per-main-category report             | `/dashboard/reports/by-main-category`; `services/financial-report-service.ts`     | In scope: prefer sale-time category snapshot                                                               |
| Inventory snapshot submission/review | `/dashboard/inventory/snapshots`; `services/inventory-snapshot-service.ts`        | In scope                                                                                                   |
| Admin/customer order entry           | order service/action paths                                                        | In scope only for recording immutable report-attribution fields; user flow must otherwise remain unchanged |

## 3. Architecture decisions

**ADR required — ADR-001, immutable report-attribution snapshots and legacy-data disclosure.** This is a HIGH-risk data-contract decision spanning order persistence, financial reports, and migrations. The ADR must decide the canonical snapshot fields, provenance values, legacy display wording, and rollback limits before implementation.

## 4. Threat model + security considerations

| Threat                                                          | Likelihood | Impact | Mitigation                                                                                                 |
| --------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Report totals are misattributed around the WAT cutoff.          | Medium     | High   | Reuse the shared business-day helper; test before/after-cutoff fixtures and reconcile report totals.       |
| A menu reclassification silently rewrites historical reporting. | Medium     | High   | Persist sale-time fields for new sales; legacy fallback is labelled and never treated as original history. |
| An unauthorised caller reads financial reporting data.          | Low        | High   | Retain existing admin/super-admin guards and add action/API authorisation regression tests.                |
| Migration double-writes or creates conflicting provenance.      | Medium     | Medium | Dry-run mode, idempotent update predicates, counts/audit output, backup and rollback runbook.              |

**Secrets / credentials:** No new secrets. Existing database and session credentials remain environment-scoped.  
**Dependencies introduced:** None.  
**Risk register entries:** R-012 (opened by this plan) — financial-history attribution and migration integrity.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No new personal-data purpose. The affected order and snapshot documents may already contain staff/customer identifiers, but this change reads only the financial/category fields required to produce authorised internal reports. It adds no collection, disclosure, retention period, or cross-border transfer. Access remains limited to existing admin/super-admin report guards.

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** N/A — this REQ changes deterministic report and data-migration logic only; it neither invokes nor changes an AI model.

## 7. Rollback plan

- **Reversible via:** Git revert for report/query/UI changes. New order-item fields are additive and remain readable by an older application version.
- **Data implications:** A migration must not destructively overwrite existing fields. It records provenance and supports a dry-run/count report. If rollback is required after a migration, preserve the provenance fields and revert only read-path preference, rather than fabricating historical values.
- **Notification path:** Stop the migration, notify the release reviewer and finance/report users, restore the prior report read path, and retain migration counts/audit evidence for incident assessment.

## 8. Verification

- **Unit + integration tests:** business-day boundaries, category filter and aggregation, item snapshot persistence, legacy fallback labelling, migration idempotency/dry-run, inventory snapshot WAT normalisation, and auth guards.
- **E2E coverage:** delegated to `e2e-test-engineer` after plan approval. The target is an authenticated admin report journey showing a selected range/category and a reviewer-visible legacy state where seeded data permits it.
- **Manual smoke after deploy:** compare a known WAT-boundary order and a reclassified menu item against daily, profitability, and per-main-category reports; submit/retrieve a snapshot on a WAT boundary.
- **Monitoring / alerting:** migration emits before/after/unchanged counts and fails closed on validation mismatch; release evidence records reconciliation results.

## 9. Sign-off

- **Plan reviewer (eng):** Pending independent review.
- **Plan reviewer (security / DPO):** N/A — no new personal-data purpose; security review remains required for financial integrity and migration controls.
- **Plan approved by operator:** Pending HIGH-risk approval.
