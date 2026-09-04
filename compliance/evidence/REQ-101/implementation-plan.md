---
title: 'Implementation plan — REQ-101'
requirement_id: 'REQ-101'
risk_class: 'MEDIUM'
change_type: 'fix'
authored_by: 'sdlc-implementer / claude-sonnet-5'
authored_at: '2026-09-04'
---

# Implementation plan — REQ-101

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | N/A callout below — no personal data touched.              |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A callout below — no AI in scope.                        |

## 1. Goal + acceptance criteria

- **Goal:** Fix the Reports → Revenue (and per-category / date-range) tab so an item sold at multiple portion sizes (full/half/quarter) in the same reporting window is reported as separate rows with correct per-portion pricing, instead of being blended into one row with a misleading weighted-average price.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                                                                                       | SRS item it traces to                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| AC1 | Given orders for an item sold at both full and half portion within the same day, When a staff member opens Dashboard → Reports → Daily → Revenue tab for that day, Then the item appears as two rows ("Peppered Meat" and "Peppered Meat (Half)") each showing its own correct unit price and quantity, and their totals sum to the item's true combined revenue. | @srs-deferred: pending requirements-aligner            |
| AC2 | Given the same mixed-portion order set, When a staff member opens Dashboard → Reports → Daily → Costs tab for that day, Then cost-per-unit rows are likewise split per portion size (no cross-portion blending of the cost column).                                                                                                                               | @srs-deferred: pending requirements-aligner            |
| AC3 | Given the same mixed-portion order set, When a staff member opens a date-range report (Reports → date range picker) or a per-main-category report (`generateMainCategoryReport`) covering the same window, Then the same per-portion split applies (not just the daily summary path).                                                                             | @srs-deferred: pending requirements-aligner            |
| AC4 | Given an item with only full-portion sales (the common case, including all pre-existing data with no `portionSize` field), When the Revenue tab is viewed, Then behaviour is unchanged — one row, `price` equal to the actual (single) sale price — matching REQ-100's existing multi-price-within-window test fixtures exactly.                                  | REQ-REPORT-001 (existing) / REQ-MENUMGT-006 (existing) |

## SRS items proposed/touched

| AC  | SRS item                                    | Status          | Notes                                                                                                                                                                                               |
| --- | ------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-REPORT-001 (existing)                   | stale — updated | Existing bullet only covered per-line revenue _summation_; added a new Given/When/Then bullet requiring per-`portionSize` row splitting (was silent on row granularity — the exact gap #689 found). |
| AC2 | REQ-REPORT-001 (existing)                   | stale — updated | Same bullet covers both revenue and costs rows.                                                                                                                                                     |
| AC3 | REQ-MENUMGT-006 (existing)                  | stale — updated | Added an equivalent per-`portionSize` row-splitting bullet to the per-main-category report item (was also silent on row granularity).                                                               |
| AC4 | REQ-REPORT-001 / REQ-MENUMGT-006 (existing) | unchanged       | Regression pin — REQ-100's existing per-line summation bullets are untouched; new bullets are additive.                                                                                             |

## 2. Scope

- **In scope:** `services/financial-report-service.ts` — the three item-aggregation `Map<string, …>` keyed by `menuItemId` inside `aggregateItemsIntoCategories` (shared by `generateDailySummary` + `generateDateRangeReport`) and `generateMainCategoryReport`. Re-key both maps by `${menuItemId}:${portionSize ?? 'full'}` and give the resulting revenue/cost row a display name suffix (`(Half)` / `(Quarter)`) when portion size isn't `'full'`.
- **Out of scope:** the write-off cost aggregation helper (`getWrittenOffOrdersSummary`, ~line 269) — it caches `costPerUnit` per `menuItemId` for a _live menu_ lookup (not a per-line price sum) and has no "Price" display column; it doesn't exhibit this bug. Also out of scope: the Price Overrides tab / `price-override-analytics-service.ts` (separate, already portion-agnostic-correct feature); any change to how orders store `portionSize`/`portionMultiplier` (already correct — verified against production-synced UAT data in issue #689).

### Surface inventory (MEDIUM risk — required)

| Surface                    | URL / file                                                                     | Status                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Daily Report — Revenue tab | `/dashboard/reports/daily` — `components/features/reports/revenue-section.tsx` | In scope — consumes `aggregateItemsIntoCategories` output, no changes needed to the component itself, only to the data it's given |
| Daily Report — Costs tab   | `/dashboard/reports/daily` — cost-items rendering                              | In scope — same map, cost side                                                                                                    |
| Date-range report          | `generateDateRangeReport` (shares `aggregateItemsIntoCategories`)              | In scope — fixed by the same shared-helper change                                                                                 |
| Per-main-category report   | `generateMainCategoryReport`                                                   | In scope — separate map, same fix pattern applied independently                                                                   |
| Menu → Edit Item → Price   | `app/dashboard/menu/[id]/edit` (live `MenuItem.price`)                         | Already works — unaffected, this REQ doesn't touch menu-item pricing                                                              |
| Price Overrides tab        | `components/features/reports/price-overrides-section.tsx`                      | Out of scope (waived) — separate `priceOverridden`-keyed feature, not portion-size-keyed; no defect found there                   |

## 3. Architecture decisions

- **No ADR needed** — single-file fix to an existing aggregation function's map key; no new dependency, no new data store, no external service, and the pattern change is confined to one file (`services/financial-report-service.ts`), well under the >3-file significance threshold. Risk class is MEDIUM (not HIGH/CRITICAL), so that signal doesn't apply either. Same class of change as REQ-100, which also required no ADR.

## 4. E2E test coverage

- **`@e2e-deferred: <rationale>`** — No UI-facing files (`app/**/*.tsx`, `components/**/*.tsx`) are touched by this REQ's diff; the fix is confined to `services/financial-report-service.ts`'s data aggregation. The Revenue/Costs tab components already render whatever rows the service returns — REQ-101 changes row _count and shape_ (two rows instead of one for mixed-portion items), which is fully exercised by unit tests against the service's public methods (`generateDailySummary`, `generateDateRangeReport`, `generateMainCategoryReport`). No new UI behaviour is introduced that requires browser-level verification.

## 5. Threat model + security considerations

| Threat                                                                                        | Likelihood | Impact | Mitigation |
| --------------------------------------------------------------------------------------------- | ---------- | ------ | ---------- |
| N/A — pure aggregation-key/display-name fix, no new input surface, no auth/data-access change | N/A        | N/A    | N/A        |

**Secrets / credentials:** N/A — none handled.

**Dependencies introduced:** None.

### Risk register entries

- **@risk-deferred:** MEDIUM risk classification is driven by "user-visible feature defect, financial reporting" (per Test_Policy.md §Risk-Based Testing), not by a security/data/RBAC signal — there is no new register-worthy risk here beyond what REQ-100 (RISK-023, MITIGATED) already covers for this exact function. No new RISK-NNN opened.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No — this REQ touches only aggregate order revenue/cost figures (item name, price, quantity), no customer or staff PII fields.

N/A — this REQ does not process personal data. It re-keys an in-memory aggregation map by an existing non-personal order-line field (`portionSize`); no new data is read, stored, or displayed.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour. It is a deterministic aggregation-logic bug fix.

## 8. Rollback plan

- **Reversible via:** `git revert` of the single fix commit — the change only affects how existing, already-correct order-line data (`price`, `quantity`, `portionSize`) is grouped for display; no schema, migration, or write-path change.
- **Data implications of rollback:** None — no data is written by this change; it only changes read-time aggregation/grouping.
- **Notification path if rollback during a release:** Standard `#deploys` notification per existing incident playbook; no data-repair step needed since nothing is persisted.

## 9. Verification

- **Unit + integration tests:** New Vitest cases in `__tests__/services/financial-report-service.main-category.test.ts` (generateMainCategoryReport) and `__tests__/services/financial-report-service.dynamic-main-categories.test.ts` (generateDailySummary / generateDateRangeReport, via `aggregateItemsIntoCategories`): assert that full + half portion lines for the same `menuItemId` produce two separate rows with correct per-row `price`/`costPerUnit`/`quantity`/`total`, and that the existing REQ-100 multi-price-same-portion fixtures (no `portionSize` field / both `'full'`) remain unchanged (AC4 regression pin).
- **E2E coverage:** see §4 — `@e2e-deferred`, no UI-facing diff.
- **Manual smoke after deploy:** View Dashboard → Reports → Daily → Revenue tab for a date range covering "Peppered Meat" sales (UAT DB already has the real mixed-portion data from issue #689's investigation) and confirm two distinct rows now appear with correct ₦1000/₦500 prices instead of one blended ₦940 row.
- **Monitoring / alerting:** None added — no new failure mode introduced (existing report-generation error handling covers this code path already).

## 10. Sign-off

- **Plan reviewer (eng):** REPLACE — operator to confirm before merge
- **Plan reviewer (security / DPO):** N/A — no GDPR/threat-model content
- **Plan approved by operator:** REPLACE — MEDIUM risk, no HIGH/CRITICAL checkpoint required; proceeds automatically per Phase 1 step 11

## Upload path

`compliance/plans/REQ-101/implementation-plan.md`, uploaded on next push to `develop`.
