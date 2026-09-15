# Security Summary — REQ-106

**Requirement:** REQ-106
**Issue:** [#769](https://github.com/metasession-dev/wawagardenbar-app/issues/769)
**Risk Level:** MEDIUM
**Date:** 2026-09-14

---

## Security Assessment

### Access Control (RBAC)

`recordCashPositionAdjustmentAction` enforces `requireSuperAdmin` unconditionally at the action layer, independent of any UI affordance — matches the existing `approvePendingExpenseGroupAction`/`assignBatchAction` pattern. `getCashPositionAction` (read path) uses the same role gate as the daily report itself (`admin`/`super-admin`).

### Batch Payment-Method Integrity

A mixed cash/transfer batch could cause an ambiguous or incorrect till deduction. Mitigated with a homogeneity check enforced in both `assignBatch` and `confirmTransfer` (defense in depth) — a mixed batch is rejected with a clear error rather than silently misattributing cash flow.

### Audit Trail / Tamper Resistance

Every cash-position adjustment (opening seed or later correction) is an append-only, fully attributed (`createdBy`/`createdAt`/optional `note`) ledger row — never a silent overwrite. This directly mitigates the risk of a backdated correction obscuring a genuine shortfall: the audit-trail list (`listCashPositionAdjustmentsAction`) makes every correction visible to any admin/super-admin reviewing the Daily Report, not just the one who made it.

### Data Integrity

New collections (`CashPositionAdjustmentModel`, `CashDepositModel`) and new fields (`paymentMethod` on `PendingExpenseGroup`/`Expense`) are additive; no migration, no backfill, no change to existing records. Cash deposits never write to `ExpenseModel`, keeping P&L aggregation in `financial-report-service.ts` unaffected.

### Dependencies

None introduced.

### Secrets / Credentials

None.

---

## Static Analysis (Semgrep)

**Status:** PASS — no findings in the changed files (see PR #770 CI run).

---

## Dependency Audit (npm audit)

**Status:** PASS — no new dependencies added; no new findings introduced by this REQ's diff.

---

## Risk Register

Assessed by `risk-register-keeper`. Entries in `compliance/risk-register.md`:

- **R-029 — Cash Position adjustment bypassing the super-admin gate** — Status: OPEN. Mitigated by the `requireSuperAdmin` guard + append-only audit ledger + a negative-case unit test.
- **R-030 — Mixed cash/transfer payment methods within one transfer batch** — Status: OPEN. Mitigated by the homogeneity check enforced at both `assignBatch` and `confirmTransfer`.
- **R-031 — Backdated cash-position corrections could obscure a genuine shortfall** — Status: ACCEPTED. Full audit-trail visibility judged sufficient for this solo-operator project; no additional structural guard added.

## Bundled Release Context

- **Core tracked release:** REQ-106 (declared bundle key; co-tracked with REQ-104, REQ-105)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `main` — see `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
- **Why bundled here:** REQ-104, REQ-105, and REQ-106 were declared as an explicit bundle at Phase 1 planning time (`Bundles: #767, #768, #769`) — all three are LOW/MEDIUM risk, share one branch/PR/release cycle, and touch distinct file sets with no scope overlap between them.
- **Evidence impact:** Evidence ownership remains on each source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers all three co-tracked REQs plus the absorbed non-release housekeeping work listed in the bundle manifest.
- **Security / risk impact:** Bundle ceremony runs at MEDIUM (the max risk across the set, from REQ-106). No additional security/risk impact beyond what each REQ's own risk-register entries (R-029/R-030/R-031 for REQ-106) already document.
- **Reference:** `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
