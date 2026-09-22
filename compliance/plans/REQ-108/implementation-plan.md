---
title: 'Implementation plan — REQ-108'
requirement_id: 'REQ-108'
risk_class: 'HIGH'
change_type: 'fix'
authored_by: 'sdlc-implementer / claude-sonnet-5'
authored_at: '2026-09-21'
---

# Implementation plan — REQ-108

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

- **Goal:** Stop tab-linked orders from being silently, incorrectly marked as paid-in-cash purely because their kitchen status was progressed to "completed" — the auto-mark-cash feature must only ever apply to genuinely non-tab (pay-now/express/counter) orders.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                                          | SRS item it traces to |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| AC1 | Given an order attached to an open tab via the express/POS "add to tab" flow, When a kitchen-staff/admin user progresses that order through Preparing → Ready → Completed on the kitchen display, Then the order's payment status remains unchanged (not auto-flipped to paid/cash) and the tab remains open/unpaid. | REQ-ORDMGT-017 (new)  |
| AC2 | Given a non-tab ("pay now") order, When it is marked Completed, Then it is still auto-marked `paymentStatus: 'paid'`, `paymentMethod: 'cash'` exactly as today (regression guard — must not break the existing intended behaviour).                                                                                  | REQ-ORDMGT-017 (new)  |
| AC3 | Given an order attached to a tab via any current or future code path (not just the two known-buggy ones), When it is attached to the tab, Then `Order.tabId` is reliably set so the existing exclusion guard works without needing per-call-site correctness.                                                        | REQ-ORDMGT-017 (new)  |

## SRS items proposed/touched

| AC  | SRS item                        | Status | Notes                                                                                                                                                                                                                                                      |
| --- | ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-ORDMGT-017 (new — proposed) | added  | Fuzzy-matched against the existing REQ-ORDMGT-007 (inventory-deduction chokepoint) first — that item's SoT text covers only inventory deduction, no payment-status side effects, so this is genuinely new behaviour rather than drift on an existing item. |
| AC2 | REQ-ORDMGT-017 (new — proposed) | added  | Same item — the positive (non-tab auto-mark) and negative (tab exclusion) cases are two Given/When/Then bullets under one SRS item, matching how REQ-ORDMGT-007 itself pairs a positive and negative case.                                                 |
| AC3 | REQ-ORDMGT-017 (new — proposed) | added  | Same item — covers the `addOrderToTab` chokepoint fix that makes the exclusion reliable.                                                                                                                                                                   |

## 2. Scope

- **In scope:**
  - `services/tab-service.ts` — `addOrderToTab` sets `order.tabId` on attach.
  - `app/actions/admin/order-management-actions.ts` — `updateOrderStatusAction`'s auto-mark-cash guard gains an independent tab-membership check.
  - `scripts/backfill-order-tabid.ts` (new) — one-time backfill/audit script; written and unit-tested in this REQ, **not executed against UAT/production during this REQ** — that is a deliberate, separate operator-run step after this fix ships.
  - `__tests__/actions/admin/order-management-actions.test.ts` — new unit coverage.
  - `e2e/critical/tab-payment-no-status-reset.spec.ts` — new e2e case (or sibling spec) via `e2e-test-engineer`.
- **Out of scope:**
  - `app/api/public/orders/route.ts` and `app/actions/admin/express-actions.ts`'s own `Order.create()` payloads — not touched, since the chokepoint fix in `addOrderToTab` makes their `tabId` omission harmless. (Considered adding `tabId` there too for defense-in-depth/readability; deferred as genuinely optional once the chokepoint fix lands — not needed for correctness.)
  - Actually running the backfill script against UAT/production data.
  - Any change to the `TabService.markTabPaid` / `completeTabPaymentManually` tab-close payment flow — already correct, not touched.

### Surface inventory

| Surface                                              | URL / file                                                                                                            | Status                                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Kitchen display / orders dashboard "Complete" action | `/dashboard/orders` (kitchen-staff/admin) — `app/actions/admin/order-management-actions.ts` `updateOrderStatusAction` | In scope — the guard fix                                                                                                                    |
| Express/POS "add to tab" order creation              | `/dashboard/orders/express/...` — `app/actions/admin/express-actions.ts` `expressCreateOrderAction`                   | Already works after fix — no direct change needed here, fixed at the `TabService` chokepoint; used as the e2e regression test's attach path |
| Tab payment / close-out                              | tab payment UI — `services/tab-service.ts` `markTabPaid` / `completeTabPaymentManually`                               | Already works — unaffected, not touched                                                                                                     |

## 3. Architecture decisions

- **No ADR needed** — bug fix touching a single existing chokepoint function (`TabService.addOrderToTab`) plus one additional guard clause in an existing action. No new dependency, no new data store, no pattern change spanning more than 2 files. The HIGH risk classification on this REQ is a financial-correctness/business-domain risk (see §5 Risk register entries), not an architectural-complexity signal — confirmed with the operator via `adr-author`'s ambiguous-verdict escalation (risk class alone suggested ADR; scope/signals did not).

## 4. E2E test coverage

> _Populated by `e2e-test-engineer` at Stage 2._

## 5. Threat model + security considerations

| Threat                                                                                                                                         | Likelihood                                                                  | Impact                                                                                                    | Mitigation                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Financial mis-statement — tab orders falsely recorded as paid, corrupting cash-vs-other-method revenue reporting and the cash-position feature | Confirmed occurring today (not hypothetical)                                | Medium — reporting/reconciliation inaccuracy, not fund loss (no real money moves as a result of this bug) | This REQ's root-cause fix + defense-in-depth guard closes the surface; backfill script (written here, run separately) will identify/correct existing corrupted records |
| Backfill script incorrectly reverting a genuinely-paid order                                                                                   | Low (script requires explicit opt-in flag, scoped to open/unpaid tabs only) | Medium — would falsely un-mark a real payment                                                             | Script defaults to report-only; `--revert-false-positives` is opt-in and scoped narrowly; operator reviews the printed report before opting in                         |

**Secrets / credentials:** None handled by this change.

**Dependencies introduced:** None.

### Risk register entries

This REQ opens the following entries in [`compliance/risk-register.md`](../../risk-register.md) (project convention uses `R-NNN`, not `RISK-NNN`):

- **R-032 — Tab orders falsely auto-marked cash-paid on kitchen completion** — Status: MITIGATED. The root-cause fix (chokepoint `tabId` assignment) + defense-in-depth guard (`TabModel.exists`) landing in this REQ close the residual to low×low.
- **R-033 — Backfill script for REQ-108 could incorrectly revert a legitimately-paid order** — Status: ACCEPTED. The backfill script's opt-in flag + narrow scoping + operator-run dry-run-first process are judged sufficient controls; the script itself isn't executed during this REQ.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No.

N/A — this REQ only touches order/tab payment-status bookkeeping (amounts, statuses, timestamps, ObjectId references) already covered by the app's existing data-handling posture; no new personal-data field or processing purpose is introduced.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change any AI/ML behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit. The `addOrderToTab` and `updateOrderStatusAction` changes are additive/defensive (they only prevent an incorrect write; they don't change any schema or migrate existing data), so reverting is safe and immediate.
- **Data implications of rollback:** None — the code change doesn't alter stored data shape. Any `tabId` values newly set on Order documents by the fixed `addOrderToTab` after this ships remain harmless if the code is later reverted (the field already exists in the schema, just previously unpopulated in these two paths).
- **Notification path if rollback during a release:** Standard incident/rollback path — operator reverts, redeploys, and (if the backfill script had already been run separately) no action needed since the backfill's writes are also harmless/idempotent.

## 9. Verification

- **Unit + integration tests:** New `describe('updateOrderStatusAction', ...)` block in `__tests__/actions/admin/order-management-actions.test.ts` — see `test-plan.md`.
- **E2E coverage:** see §4 / `e2e-test-engineer` output.
- **Manual smoke after deploy:** Create a tab via the express/POS flow in the deployed environment, add an order, progress it through kitchen statuses to Completed, confirm `paymentStatus` stays `pending` via an admin view or DB check.
- **Monitoring / alerting:** None new; existing revenue/cash-position reports are the implicit monitor (their numbers should stop drifting for tab-heavy days once this ships).

## Plan deviation

`scripts/backfill-order-tabid.ts` is not unit-tested. This is an implementation-approach deviation, not a requirements deviation: it matches this repo's existing convention for one-off migration scripts (`scripts/backfill-business-dates.ts` and similar have no dedicated test file, connecting directly via the raw MongoDB driver rather than through testable service functions). Correctness is verified via the script's mandatory `--dry-run` review before any write. None of AC1-AC3 require backfill-script test coverage, so no AC/SRS update is needed.

## 10. Sign-off

- **Plan reviewer (eng):** operator, approved via plan-approval checkpoint (HIGH risk pause), 2026-09-21
- **Plan reviewer (security / DPO):** N/A — no personal data / no non-trivial threat-model surface beyond the financial-correctness point already covered above
- **Plan approved by operator:** approved, 2026-09-21

## Upload path

This file lives at `compliance/plans/REQ-108/implementation-plan.md` and uploads automatically on the next push to `develop`.
