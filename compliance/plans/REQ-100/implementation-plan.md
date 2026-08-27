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

- **Goal:** Fix `FinancialReportService.generateMainCategoryReport()` so that revenue and cost for a menu item sold at more than one price within a reporting window are computed by summing each order line's actual revenue/cost, instead of multiplying the total summed quantity by whichever price was seen first — which silently under/over-states the report whenever an item's price varies within the window (half- vs full-portion pricing, or a mid-window menu price change).

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | SRS item it traces to                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| AC1 | Given two or more paid orders in a reporting window sell the same menu item at different prices (e.g. a half-portion line at one price and a full-portion line at another), When a staff member opens `/dashboard/reports/by-main-category` for that date range and category, Then the item's displayed "Line total" and the category's Total Revenue equal the sum of each order line's actual price × quantity (or `subtotal`), not (first-seen price × total summed quantity). | REQ-MENUMGT-006 (existing — updated) |
| AC2 | Given the same multi-price scenario, When the report is viewed, Then the item's cost "Line total" in the Cost items table is likewise the sum of each line's actual cost, unaffected by which price line was encountered first (cost is driven by `costPerUnit`, not sale price, but shares the same accumulation code path this REQ fixes).                                                                                                                                      | REQ-MENUMGT-006 (existing — updated) |
| AC3 | Given a reporting window where every sale of an item used a single consistent price (the common case), When the report is viewed, Then the displayed totals are unchanged from pre-fix behaviour (no regression for the non-multi-price case).                                                                                                                                                                                                                                    | REQ-MENUMGT-006 (existing)           |

## SRS items proposed/touched

| AC       | SRS item                   | Status                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1, AC2 | REQ-MENUMGT-006 (existing) | updated (drift resolved) | This item already names `services/financial-report-service.ts:generateMainCategoryReport` as its source, but its existing Given/When/Then bullets only described the report's _shape_ (a revenue table with price × qty × line total), never the multi-price-per-item summation _semantics_ — the ambiguity that let this bug ship undocumented. Added a new bullet to `docs/SRS.md` pinning the correct per-line summation behaviour. |
| AC3      | REQ-MENUMGT-006 (existing) | unchanged                | Trace-only — no-regression case for the already-correct single-price path.                                                                                                                                                                                                                                                                                                                                                             |

Both edits landed directly in `docs/SRS.md` (canonical prose, not stubs) — solo-operator dual-actor sign-off per Phase 4 §2 interpretation (AI tooling authored, human operator reviews at UAT).

## 2. Scope

- **In scope:**
  - `services/financial-report-service.ts` — `FinancialReportService.generateMainCategoryReport()`, the per-`menuItemId` aggregation map (lines ~1135–1220).
- **Out of scope:**
  - The daily/range aggregate reports (`generateDailyReport`, `generateReportForDateRange`, etc.) — these were not reported as exhibiting the same symptom and are not touched; if they share the same pattern, that's a separate, unverified issue.
  - Bug #677 (order detail Customer Information leaking staff PII) — unrelated defect, split out of the same originating issue #672, tracked and fixed independently.
  - Menu-item price history/versioning — this fix corrects how already-recorded per-line prices are aggregated; it doesn't change how or when prices are recorded on order items.

### Surface inventory (MEDIUM/HIGH risk — required)

| Surface                                       | URL / file                                                                                                          | Status                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| By Main Category report — revenue/cost tables | `/dashboard/reports/by-main-category` — `app/dashboard/reports/by-main-category/by-main-category-report-client.tsx` | In scope (consumes the fixed `generateMainCategoryReport()` output; no UI changes needed — `price`/`costPerUnit`/`total` fields keep their existing shape) |

## 3. Architecture decisions

- **No ADR needed** — assessed by `adr-author` against the decision tree: single file touched (`services/financial-report-service.ts`), no new third-party dependency, no new database/cache/queue tier, no new external service, no pattern change spanning more than one file, and risk class is MEDIUM (not HIGH/CRITICAL). This is a pure arithmetic-accumulation bug fix inside one already-existing service method — matches the tree's explicit "bug fix touching ≤3 files in a service layer" no-ADR case.

## 4. Threat model + security considerations

| Threat                                                                 | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regression re-introduces under/over-counting for the single-price case | Low        | Medium | AC3 pins the no-regression case; existing 8 test cases in `financial-report-service.main-category.test.ts` (filtering, itemCount, orderCount, empty-input, label resolution, gross-profit math) all continue to pass unmodified against the new accumulation logic. |

**Secrets / credentials:** None — no new secrets, no new credential handling.

**Dependencies introduced:** None.

### Risk register entries

Assessed by `risk-register-keeper`. This REQ opens the following entry in `compliance/risk-register.md`:

- **R-023 — Same first-seen-price accumulation defect may exist in other financial report functions** — Status: OPEN. The fix in this REQ is confined to `generateMainCategoryReport()`; other per-item aggregation functions in `services/financial-report-service.ts` (e.g. `generateDailyReport`, `generateReportForDateRange`) were not audited for the same pattern and may share it, unverified. No RBAC/auth/data-exposure surface — bounded to financial-report accuracy.

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

- **Unit + integration tests:** Added `REQ-100: sums actual per-line revenue when the same item sells at more than one price` to `__tests__/services/financial-report-service.main-category.test.ts`, asserting the same menu item sold at two different prices across two orders produces a summed total (18000) rather than the pre-fix first-seen-price × total-quantity result (22500), and that cost aggregation (which shares the same map/accumulation code path) is unaffected. All 9 pre-existing tests in the same file, and the full unit suite (1382 tests), continue to pass unmodified.
- **Browser-driven test coverage:** Not applicable — this is a pure backend aggregation fix with no new UI surface, no changed UI markup, and no changed user interaction; the existing report page already renders `price`/`total`/`costPerUnit` fields exactly as before, just now computed correctly. No spec-authoring skill was invoked; no test files under the browser-test suite directory were authored or edited by this REQ.
- **Manual smoke after deploy:** View `/dashboard/reports/by-main-category` for the Kitchen category on the business date that originally surfaced the bug (2026-08-24 on UAT) and confirm Total Kitchen Revenue reads ₦32,000 (not ₦25,000) and the Beef line reads ₦15,500 (not ₦8,500).
- **Monitoring / alerting:** None added — this is a reporting-accuracy fix with no new failure mode to alert on beyond the pre-existing report page itself.

## 9. Sign-off

- **Plan reviewer (eng):** N/A — solo-operator project; reviewed by the sdlc-implementer skill flow, human sign-off at UAT.
- **Plan reviewer (security / DPO):** N/A — no GDPR or non-trivial threat-model surface.
- **Plan approved by operator:** MEDIUM risk — auto-continues per Phase 1 step 11; the operator's UAT review at Phase 4 is the sign-off gate.

## Upload path

This file lives at `compliance/plans/REQ-100/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
