---
title: 'Implementation plan — REQ-106'
requirement_id: 'REQ-106'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'agent (sdlc-implementer)'
authored_at: '2026-09-14'
---

# Implementation plan — REQ-106

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                         |
| --------------------------------------------------------- | --------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + verification strategy per AC. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.        |
| **GDPR Art. 25** Data protection by design and by default | N/A — see §6.                                       |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | N/A — see §7.                                       |

## 1. Goal + acceptance criteria

- **Goal:** Track a system-computed Current Cash Position (till balance) on the Daily Report — cash sales in, cash-method transferred expenses out, cash deposits to bank out — with a super-admin-editable, fully audited opening balance/correction ledger.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                 | SRS item it traces to         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| AC1 | Given the Daily Report, When it renders for any date, Then a "Current Cash Position" section is always shown, including a defined empty state before an opening balance has been set.                       | REQ-REPORT-007 (new)          |
| AC2 | Given a pending expense is created, When the admin submits the form, Then they must select `cash` or `transfer` as the payment method.                                                                      | REQ-FIN-003 (updated — drift) |
| AC3 | Given a cash-method pending expense group is approved and transferred, When the Daily Report is viewed for that transfer date, Then Current Cash Position reflects the deduction.                           | REQ-REPORT-007 (new)          |
| AC4 | Given a transfer-method pending expense group is approved and transferred, When the Daily Report is viewed, Then Current Cash Position is unaffected.                                                       | REQ-REPORT-007 (new)          |
| AC5 | Given a cash deposit is created, approved, and transferred (with or without a reference), When the Daily Report is viewed for that date, Then Current Cash Position reflects the deduction.                 | REQ-FIN-008 (new)             |
| AC6 | Given a super-admin, When they record a cash position adjustment (opening balance or correction), Then the position updates immediately and the adjustment appears in an audit-trail list.                  | REQ-REPORT-007 (new)          |
| AC7 | Given a report date before any opening balance was set, When the Daily Report renders, Then the section explicitly indicates the position is not yet tracked for that date.                                 | REQ-REPORT-007 (new)          |
| AC8 | Given a batch of pending expense groups assigned together for one transfer, When the batch would mix cash-method and transfer-method groups, Then the system rejects the batch/transfer with a clear error. | REQ-FIN-003 (updated — drift) |

## SRS items proposed/touched

| AC                      | SRS item                         | Status                     | Notes                                                                                                                                                              |
| ----------------------- | -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1, AC3, AC4, AC6, AC7 | REQ-REPORT-007 (new — proposed)  | authored (canonical prose) | New item covering the Daily Report's Current Cash Position section, its empty state, and the super-admin adjustment/audit-trail capability.                        |
| AC2, AC8                | REQ-FIN-003 (existing — updated) | updated (drift resolved)   | Existing item covered pending-expense group submit/approve but never described a payment-method field or batch-homogeneity constraint — both added as new bullets. |
| AC5                     | REQ-FIN-008 (new — proposed)     | authored (canonical prose) | New item covering the parallel Cash Deposit pending→approved→transferred workflow.                                                                                 |

## 2. Scope

- **In scope:**
  - `models/pending-expense-group-model.ts` / interface — add group-level `paymentMethod`.
  - `models/expense-model.ts` / interface — add `paymentMethod`, propagated at transfer.
  - New `models/cash-position-adjustment-model.ts`, `models/cash-deposit-model.ts` + interfaces.
  - `services/pending-expense-group-service.ts` — payment-method-aware transfer-reference validation, batch homogeneity check.
  - New `services/cash-deposit-service.ts`, `services/cash-position-service.ts`.
  - New `app/actions/finance/cash-deposit-actions.ts`, `app/actions/finance/cash-position-actions.ts`; modify `app/actions/finance/pending-expense-actions.ts`.
  - New UI: `cash-position-section.tsx`, `cash-position-adjustment-dialog.tsx`, `cash-deposit-form.tsx`, `cash-deposit-list.tsx`, `cash-deposit-transfer-dialog.tsx`, `app/dashboard/finance/deposits/page.tsx`.
  - Modified UI: `expense-form.tsx`, `edit-pending-group-dialog.tsx`, `pending-expense-group-list.tsx`, `transfer-confirmation-dialog.tsx`, `daily-report-client.tsx`.
- **Out of scope:**
  - Reversing/voiding a transferred cash expense — no such capability exists anywhere today; accepted gap, only recourse is a super-admin correction entry.
  - Cash refunds to customers — no cash refund path exists anywhere today.
  - A per-day waterfall table for date-range reports — range mode shows opening-of-range → closing-of-range only.
  - Editing tags or the other expense-edit-completeness fields (REQ-104/REQ-105, bundled siblings, unrelated data model).

### Surface inventory (MEDIUM/HIGH risk — required)

| Surface                                            | URL / file                                                                           | Status                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| Daily Report — Current Cash Position section       | `/dashboard/reports/daily` — `components/features/reports/cash-position-section.tsx` | In scope                                     |
| Pending expense creation — payment method selector | `/dashboard/finance/expenses` (Add Expense) — `expense-form.tsx`                     | In scope                                     |
| Pending expense transfer confirmation              | `transfer-confirmation-dialog.tsx`                                                   | In scope — conditional reference requirement |
| Cash Deposits page                                 | `/dashboard/finance/deposits` (new)                                                  | In scope                                     |
| Cash position adjustment (super-admin)             | `cash-position-adjustment-dialog.tsx`, launched from the Daily Report section        | In scope                                     |

## 3. Architecture decisions

- **No ADR needed** — reuses the existing `pending→approved→transferred` state-machine pattern (already established by `PendingExpenseGroup`) for the new `CashDeposit` model rather than introducing a new pattern; the on-demand-computation approach for `CashPositionService` mirrors `financial-report-service.ts`'s existing convention rather than introducing a new one (e.g. a running-counter/cache tier, which would have been ADR-worthy). No new external dependency, no new database/cache/queue tier, no new external service. Risk class is MEDIUM but the MEDIUM signal alone doesn't trigger ADR-worthiness per the decision tree (only HIGH/CRITICAL does) — confirmed via `adr-author` invocation below.

## 4. E2E test coverage

- **Spec(s):** `e2e/finance/cash-tags-and-edit.spec.ts` (shared spec file, bundled REQ-104/105/106; four `describe` blocks under REQ-106).
- **ACs covered:** AC1, AC2, AC5, AC6, AC7. AC3/AC4/AC8 covered by unit tests only. This pass surfaced and fixed a genuine business-date resolution defect in `CashPositionService` — see `compliance/evidence/REQ-106/e2e-scope-decision.md` for the full writeup.

## 5. Threat model + security considerations

| Threat                                                                                                         | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Non-super-admin manipulates the cash position via a direct action call, bypassing the UI gate                  | Low        | Medium | `recordCashPositionAdjustmentAction` enforces `requireSuperAdmin` unconditionally at the action layer, independent of any UI affordance — matches the existing `approvePendingExpenseGroupAction`/`assignBatchAction` pattern.                                                                                     |
| A batch mixes cash- and transfer-method groups, causing an ambiguous/incorrect till deduction                  | Medium     | Medium | Homogeneity check enforced in both `assignBatch` and `confirmTransfer` (defense in depth) — batch/transfer rejected with a clear error rather than silently misattributing cash flow.                                                                                                                              |
| Backdated correction entries obscure genuine discrepancies (an admin "fixes" the position to hide a shortfall) | Low        | Medium | Every adjustment is an append-only, fully attributed (`createdBy`/`createdAt`/optional `note`) ledger row, never a silent overwrite — the audit-trail list (`listCashPositionAdjustmentsAction`) makes every correction visible to any admin/super-admin reviewing the Daily Report, not just the one who made it. |

**Secrets / credentials:** None.

**Dependencies introduced:** None.

### Risk register entries

Assessed by `risk-register-keeper`. This REQ's entries in `compliance/risk-register.md`:

- **R-029 — Cash Position adjustment bypassing the super-admin gate** — Status: OPEN. Reused `requireSuperAdmin` guard + append-only audit ledger + negative-case unit test.
- **R-030 — Mixed cash/transfer payment methods within one transfer batch** — Status: OPEN. Homogeneity check enforced at both `assignBatch` and `confirmTransfer`.
- **R-031 — Backdated cash-position corrections could obscure a genuine shortfall** — Status: ACCEPTED. Full audit-trail visibility judged sufficient for this solo-operator project; no additional structural guard added.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ tracks aggregate cash amounts and internal admin actions (`createdBy` references an internal User ID for audit purposes, same convention as every other audit field already in this codebase — e.g. `approvedBy`/`transferredBy` on `PendingExpenseGroup`); no customer personal data is read, stored, or displayed.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit — new collections/fields are additive; no existing data is migrated or altered. The `CashPositionAdjustmentModel`/`CashDepositModel` collections simply go unused on rollback.
- **Data implications of rollback:** None destructive either direction — `paymentMethod` becomes an unused field on `PendingExpenseGroup`/`Expense` if rolled back (existing required-field default would need to stay backward-compatible for any in-flight pending groups created before rollback; migration note: any group created between deploy and rollback with `paymentMethod` set is harmless to read with older code that ignores the field).
- **Notification path if rollback during a release:** Standard PR-revert + re-deploy; the till/cash-position feature is a reporting/tracking addition, not a payment-processing change, so no customer-facing notification is needed.

## 9. Verification

- **Unit + integration tests:** `CashPositionService` (seed-only, seed+corrections, cash-in/out aggregation, pre-seed date behavior), `CashDepositService`'s status machine, the new batch-homogeneity guard (mixed cash/transfer group batching rejected), the conditional `transferReference` requirement.
- **E2E coverage:** see §4.
- **Manual smoke after deploy:** Create a cash-method pending expense group, approve, transfer with no reference → confirm Current Cash Position on the Daily Report drops by that amount on the transfer date; create a transfer-method group → confirm cash position is unaffected. Create and transfer a cash deposit → confirm position drops. As super-admin, record an adjustment → confirm the position updates immediately and appears in the audit list.
- **Monitoring / alerting:** None added — reporting/tracking feature, no new failure mode beyond existing expense-management error handling.

## Plan deviation (post-UAT, iteration 1)

UAT (see [wawagardenbar-app#779](https://github.com/metasession-dev/wawagardenbar-app/issues/779)) found that AC6 did not hold in practice: a same-day adjustment did not update the currently-displayed closing position, only the following business day's. This is an **implementation deviation**, not a requirements deviation — AC6's intent ("updates immediately") was correctly stated; `CashPositionService`'s closing-position formula simply never summed in-range adjustments. Fixed by adding `getAdjustmentsForRange` + a new `adjustments` field on `CashPositionSummary`, and by strengthening the AC6 e2e assertion (which had only checked visibility, not value) to catch this class of regression going forward.

## 10. Sign-off

- **Plan reviewer (eng):** N/A — solo-operator project; reviewed by the sdlc-implementer skill flow, human sign-off at UAT.
- **Plan reviewer (security / DPO):** N/A — no GDPR surface; threat model above covers the RBAC/audit-trail considerations.
- **Plan approved by operator:** MEDIUM risk — auto-continues per Phase 1 step 11 (no HIGH/CRITICAL checkpoint required).

## Upload path

This file lives at `compliance/plans/REQ-106/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
