---
title: 'Implementation plan — REQ-107'
requirement_id: 'REQ-107'
risk_class: 'LOW'
change_type: 'fix'
authored_by: 'agent (sdlc-implementer)'
authored_at: '2026-09-16'
---

# Implementation plan — REQ-107

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

- **Goal:** The Expenses page's three summary cards (Total Direct Costs, Total Operating Expenses, Total Expenses) were computed via a separate `getExpenseSummaryAction(dateRange.from, endOfDay)` call keyed only on the date range — blind to `ExpenseList`'s client-side search/type/category/tag filters. Applying a filter narrowed the table but never changed the totals shown above it, reading as stale/incorrect. Fix: compute the cards from the same filtered subset the table actually renders.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                          | SRS item it traces to |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| AC1 | Given the Expenses page with a mix of direct-cost and operating-expense records, When an admin applies a filter that narrows the visible rows, Then the summary cards recompute from exactly the filtered subset shown in the table. | REQ-FIN-009 (new)     |

## SRS items proposed/touched

| AC  | SRS item                     | Status                                           | Notes                                                                                      |
| --- | ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| AC1 | REQ-FIN-009 (new — proposed) | authored (canonical Given/When/Then, not a stub) | No existing SRS item covered the Expenses summary cards' relationship to the list filters. |

## 2. Scope

**In scope:**

- `components/features/finance/expense-list.tsx` — export the `Expense` type; wrap `filteredExpenses` in `useMemo`; add an `onFilteredChange` callback prop, fired via `useEffect` whenever the filtered subset changes.
- `app/dashboard/finance/expenses/expenses-client.tsx` — replace the separate `getExpenseSummaryAction` fetch with a `displaySummary` computed via `useMemo` from the filtered list; wire `onFilteredChange={setFilteredExpenses}`.
- Remove now-dead code: `getExpenseSummaryAction` (action), `ExpenseService.getExpenseSummary` (service), `ExpenseSummary` interface — nothing else referenced any of the three after the fix.

**Out of scope:**

- Server-side filtering/pagination of the expense list itself (unrelated to this defect; the list already loads the full date-range result and filters client-side, unchanged here).
- Any change to how `getExpensesByDateRange` or the underlying `Expense` schema work.

## 3. Architecture decisions

- **No ADR needed** — single-purpose UI wiring fix (lift filtered state to the parent via a callback prop), no new dependency, no schema change, no pattern spanning more than 2 files in a structurally significant way.

## 4. E2E test coverage

- **Spec(s):** `e2e/finance/cash-tags-and-edit.spec.ts` (shared spec file, same functional area as REQ-104/105/106; `describe('REQ-107: Expense summary totals follow filters')`).
- **ACs covered:** AC1 — filter to Operating Expense only, assert the Total Direct Costs card drops to ₦0.00 and Total Expenses changes. See `compliance/evidence/REQ-107/e2e-scope-decision.md`.

## 5. Threat model + security considerations

| Threat                                                                                                                                                                                      | Likelihood | Impact | Mitigation |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ---------- |
| None identified — this is a client-side display recomputation using data already fetched and authorized for the viewing admin/super-admin; no new data exposure, no new permission surface. | N/A        | N/A    | N/A        |

**Secrets / credentials:** None.

**Dependencies introduced:** None.

### Risk register entries

- **@risk-deferred:** LOW risk, display-only recomputation of already-authorized, already-fetched data. No new attack surface, no financial-calculation change (the underlying `Expense` records and their amounts are untouched — only which subset is summed for the on-screen cards). No RISK-NNN entry warranted.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — expense records are business transaction data; this REQ only changes which subset is summed for on-screen display.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A.

## 8. Rollback plan

- **Reversible via:** `git revert` — UI-only change, no schema/migration, no data written differently.
- **Data implications of rollback:** None.
- **Notification path if rollback during a release:** Standard PR-revert + re-deploy.

## 9. Verification

- **Unit + integration tests:** None added — the fix is UI wiring (a callback prop + a `useMemo` reduce); the underlying aggregation logic (sum by `expenseType`) is trivial and was previously covered indirectly by the now-removed `getExpenseSummary` — the e2e test proves the wiring end-to-end instead, which unit tests couldn't (they'd only prove the arithmetic in isolation, not that the summary cards actually listen to the table's filters).
- **E2E coverage:** see §4.
- **Manual smoke after deploy:** On the Expenses page, apply the category/type/tag filters and confirm the three summary cards update to match the filtered subset shown in the table.
- **Monitoring / alerting:** None added — display-only fix, no new failure mode.

## 10. Sign-off

- **Plan reviewer (eng):** N/A — solo-operator project; reviewed by the sdlc-implementer skill flow, human sign-off at UAT.
- **Plan reviewer (security / DPO):** N/A — no GDPR or security surface.
- **Plan approved by operator:** LOW risk — auto-continues per Phase 1 step 11.

## Upload path

This file lives at `compliance/plans/REQ-107/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
