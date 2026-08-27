---
title: 'Implementation plan — REQ-100'
requirement_id: 'REQ-100'
risk_class: 'MEDIUM'
change_type: 'fix'
authored_by: 'agent (sdlc-implementer)'
authored_at: '2026-08-27'
---

# Implementation plan — REQ-100

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | N/A — see §5.                                              |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A — see §6.                                              |

## 1. Goal + acceptance criteria

- **Goal:** Fix `FinancialReportService`'s per-item revenue/cost aggregation so that a menu item sold at more than one price within a reporting window is computed by summing each order line's actual revenue/cost, instead of multiplying the total summed quantity by whichever price was seen first — which silently under/over-states the report whenever an item's price varies within the window (half- vs full-portion pricing, or a mid-window menu price change). **Amended in Iteration 1** (see below): the identical defect was found, independently, in two more functions in the same file — `generateDailySummary()` (the Daily Financial Report page, `/dashboard/reports/daily` — the actual page the original bug report's screenshot came from) and `generateDateRangeReport()`. All three are now fixed via one shared, tested helper.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | SRS item it traces to                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| AC1 | Given two or more paid orders in a reporting window sell the same menu item at different prices (e.g. a half-portion line at one price and a full-portion line at another), When a staff member opens `/dashboard/reports/by-main-category` for that date range and category, Then the item's displayed "Line total" and the category's Total Revenue equal the sum of each order line's actual price × quantity (or `subtotal`), not (first-seen price × total summed quantity). | REQ-MENUMGT-006 (existing — updated) |
| AC2 | Given the same multi-price scenario, When the report is viewed, Then the item's cost "Line total" in the Cost items table is likewise the sum of each line's actual cost, unaffected by which price line was encountered first (cost is driven by `costPerUnit`, not sale price, but shares the same accumulation code path this REQ fixes).                                                                                                                                      | REQ-MENUMGT-006 (existing — updated) |
| AC3 | Given a reporting window where every sale of an item used a single consistent price (the common case), When the report is viewed, Then the displayed totals are unchanged from pre-fix behaviour (no regression for the non-multi-price case).                                                                                                                                                                                                                                    | REQ-MENUMGT-006 (existing)           |
| AC4 | **(Iteration 1)** Given the same multi-price scenario, When a staff member opens `/dashboard/reports/daily` (the Daily Financial Report) for that date, Then the affected category's (e.g. Kitchen) "Total" and each item's "Total" in the on-screen breakdown equal the sum of each order line's actual revenue — not the pre-fix `(first-seen price) × (total quantity)` result.                                                                                                | REQ-REPORT-001 (existing — updated)  |
| AC5 | **(Iteration 1)** Given the same multi-price scenario across a selected custom date range, When a staff member generates the Daily Financial Report for that range (`Date Range` mode, same page), Then the category/item totals are likewise correct — this exercises `generateDateRangeReport()`, a separate function from AC4's `generateDailySummary()` but sharing the same underlying aggregation helper.                                                                   | REQ-REPORT-001 (existing — updated)  |

## SRS items proposed/touched

| AC       | SRS item                   | Status                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1, AC2 | REQ-MENUMGT-006 (existing) | updated (drift resolved) | This item already names `services/financial-report-service.ts:generateMainCategoryReport` as its source, but its existing Given/When/Then bullets only described the report's _shape_ (a revenue table with price × qty × line total), never the multi-price-per-item summation _semantics_ — the ambiguity that let this bug ship undocumented. Added a new bullet to `docs/SRS.md` pinning the correct per-line summation behaviour. |
| AC3      | REQ-MENUMGT-006 (existing) | unchanged                | Trace-only — no-regression case for the already-correct single-price path.                                                                                                                                                                                                                                                                                                                                                             |
| AC4, AC5 | REQ-REPORT-001 (existing)  | updated (drift resolved) | Same drift pattern as REQ-MENUMGT-006 above: this item already covers the Daily/date-range report's category-breakdown shape but never documented multi-price-per-item summation semantics. Added the identical clarifying bullet to `docs/SRS.md`.                                                                                                                                                                                    |

Both edits landed directly in `docs/SRS.md` (canonical prose, not stubs) — solo-operator dual-actor sign-off per Phase 4 §2 interpretation (AI tooling authored, human operator reviews at UAT).

## Requirements gap — Iteration 1 (discovered post-implementation, pre-UAT-approval)

**What happened:** After REQ-100's original fix (`generateMainCategoryReport()` only) was implemented, tested, merged to `develop`, and deployed to UAT, the operator viewed the live UAT report and found the **Daily Financial Report** page (`/dashboard/reports/daily`) still showing the original bug's exact symptom (Kitchen Revenue ₦25,000, Beef 17 units × ₦500 = ₦8,500). Investigation confirmed this page is powered by `generateDailySummary()`, a **separate function** carrying an independent copy of the identical accumulation bug — and that this, not `generateMainCategoryReport()`, was almost certainly the actual source of the original bug report's screenshot (never explicitly verified against the live app before the original fix was scoped). A third copy of the same pattern was found in `generateDateRangeReport()` (its own code comment read "same logic as daily report").

**Root cause of the scoping miss:** the original Stage 1 plan diagnosed the bug from the code pattern alone, without confirming which URL/page actually produced the reported screenshot. Both are legitimate, separately-reachable report surfaces in this codebase; the code search happened to surface `generateMainCategoryReport()` first.

**Resolution (this iteration):** rather than patch the two additional copies inline (which would perpetuate a fourth future duplicate), extracted the accumulation logic into one shared, tested private helper — `FinancialReportService.aggregateItemsIntoCategories()` — now called by both `generateDailySummary()` and `generateDateRangeReport()`. `generateMainCategoryReport()` keeps its own implementation (already fixed in the original iteration; its return shape differs enough — single-category filtered, no `report.categories` array — that forcing it into the same helper added risk without proportionate benefit).

**Impact on existing evidence:** AC1–AC3 and their existing test/evidence are unaffected (still correct, still passing). AC4–AC5 are new; `test-scope.md`/`test-plan.md`/`test-execution-summary.md` are updated to include them per drift management. Risk register entry R-023 (opened in the original iteration specifically to flag this exact possibility as unverified) is updated from OPEN to MITIGATED.

## 2. Scope

- **In scope:**
  - `services/financial-report-service.ts` — `FinancialReportService.generateMainCategoryReport()`, the per-`menuItemId` aggregation map (original iteration).
  - **(Iteration 1)** `services/financial-report-service.ts` — `generateDailySummary()` and `generateDateRangeReport()`, both refactored to call a new shared `aggregateItemsIntoCategories()` helper instead of each carrying its own independent (and independently buggy) copy of the same loop.
- **Out of scope:**
  - Bug #677 (order detail Customer Information leaking staff PII) — unrelated defect, split out of the same originating issue #672, tracked and fixed independently.
  - Menu-item price history/versioning — this fix corrects how already-recorded per-line prices are aggregated; it doesn't change how or when prices are recorded on order items.

### Surface inventory (MEDIUM/HIGH risk — required)

| Surface                                                       | URL / file                                                                                                          | Status                                                                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| By Main Category report — revenue/cost tables                 | `/dashboard/reports/by-main-category` — `app/dashboard/reports/by-main-category/by-main-category-report-client.tsx` | In scope (consumes the fixed `generateMainCategoryReport()` output; no UI changes needed — `price`/`costPerUnit`/`total` fields keep their existing shape) |
| Daily Financial Report — category breakdown (single day)      | `/dashboard/reports/daily` — consumes `generateDailySummary()`                                                      | **In scope (Iteration 1)** — this is the actual page the original bug report's screenshot came from; no UI changes needed                                  |
| Daily Financial Report — category breakdown (date range mode) | `/dashboard/reports/daily` — consumes `generateDateRangeReport()`                                                   | **In scope (Iteration 1)** — same page, range mode; no UI changes needed                                                                                   |

## 3. Architecture decisions

- **No ADR needed** — assessed by `adr-author` against the decision tree: single file touched (`services/financial-report-service.ts`), no new third-party dependency, no new database/cache/queue tier, no new external service, and risk class is MEDIUM (not HIGH/CRITICAL). **Iteration 1** extracts a private helper method shared by two existing functions within the same file — a de-duplication refactor of pre-existing logic, not a new cross-file architectural pattern (matches the tree's "single-file refactor" no-ADR case; the file's own scope didn't change, just internal structure).

## 4. Threat model + security considerations

| Threat                                                                 | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Regression re-introduces under/over-counting for the single-price case | Low        | Medium | AC3 pins the no-regression case; existing 8 test cases in `financial-report-service.main-category.test.ts` continue to pass unmodified. **(Iteration 1)** The refactor extracting `aggregateItemsIntoCategories()` is covered by re-running the full unit suite (1384 tests) plus new targeted tests for `generateDailySummary()` and `generateDateRangeReport()` — both pass, and pre-existing category-aggregation tests (`financial-report-service.dynamic-main-categories.test.ts`, 3 pre-existing cases) continue to pass unmodified. |

**Secrets / credentials:** None — no new secrets, no new credential handling.

**Dependencies introduced:** None.

### Risk register entries

Assessed by `risk-register-keeper`. This REQ's entry in `compliance/risk-register.md`:

- **R-023 — Same first-seen-price accumulation defect may exist in other financial report functions** — Status: **MITIGATED (updated Iteration 1)**. Originally opened OPEN to flag this exact possibility as unverified. Now confirmed and fixed: `generateDailySummary()` and `generateDateRangeReport()` both carried the identical defect and are fixed via the shared `aggregateItemsIntoCategories()` helper (same test coverage as `generateMainCategoryReport()`'s original fix). No RBAC/auth/data-exposure surface — bounded to financial-report accuracy.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ only changes how existing order line `price`/`quantity`/`subtotal`/`costPerUnit` figures (already non-personal, already stored) are summed for a financial report. No new field is read, stored, or transmitted.

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI/model behaviour.

## 7. Rollback plan

- **Reversible via:** `git revert` of the merge commit — the change is confined to one function's internal aggregation logic with no schema or data migration.
- **Data implications of rollback:** None — no data is written by this change; it only changes how already-stored order data is summed at report-read time.
- **Notification path if rollback during a release:** Standard PR-revert + re-deploy; no out-of-band notification needed given no data-write surface.

## 8. Verification

- **Unit + integration tests:**
  - Original iteration: `REQ-100: sums actual per-line revenue when the same item sells at more than one price` in `__tests__/services/financial-report-service.main-category.test.ts`.
  - **Iteration 1:** two new tests in `__tests__/services/financial-report-service.dynamic-main-categories.test.ts` — `REQ-100 follow-up: sums actual per-line revenue when the same item sells at more than one price` (pins `generateDailySummary()`: two orders selling the same item at ₦1000×2 and ₦500×3 correctly sum to ₦3,500, not ₦1000×5=₦5,000) and `REQ-100 follow-up: generateDateRangeReport sums actual per-line revenue for a multi-price item too` (same fixture against `generateDateRangeReport()`). All 3 pre-existing tests in that file, all 9 tests in `main-category.test.ts`, and the full unit suite (1384 tests), continue to pass unmodified.
- **Browser-driven test coverage:** Not applicable — this is a pure backend aggregation fix with no new UI surface, no changed UI markup, and no changed user interaction; the existing report pages already render `price`/`total`/`costPerUnit` fields exactly as before, just now computed correctly. No spec-authoring skill was invoked; no test files under the browser-test suite directory were authored or edited by this REQ.
- **Manual smoke after deploy:** View `/dashboard/reports/by-main-category` **and** `/dashboard/reports/daily` for the Kitchen category on the business date that originally surfaced the bug (2026-08-24 on UAT) and confirm Total Kitchen Revenue reads ₦32,000 (not ₦25,000) and the Beef line reads ₦15,500 (not ₦8,500) on **both** pages. **Iteration 1 note:** this was already independently verified by the operator directly against the live UAT database (matching the shared helper's logic exactly) before this evidence pack was compiled — see the release ticket for the confirmed figures.
- **Monitoring / alerting:** None added — this is a reporting-accuracy fix with no new failure mode to alert on beyond the pre-existing report pages themselves.

## 9. Sign-off

- **Plan reviewer (eng):** N/A — solo-operator project; reviewed by the sdlc-implementer skill flow, human sign-off at UAT.
- **Plan reviewer (security / DPO):** N/A — no GDPR or non-trivial threat-model surface.
- **Plan approved by operator:** MEDIUM risk — auto-continues per Phase 1 step 11; the operator's UAT review at Phase 4 is the sign-off gate.

## Upload path

This file lives at `compliance/plans/REQ-100/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
