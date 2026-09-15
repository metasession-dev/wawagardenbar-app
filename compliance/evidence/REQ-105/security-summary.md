# Security Summary — REQ-105

**Requirement:** REQ-105
**Issue:** [#768](https://github.com/metasession-dev/wawagardenbar-app/issues/768)
**Risk Level:** LOW
**Date:** 2026-09-14

---

## Security Assessment

### Access Control (RBAC)

No new permission gate — the edit dialog remains super-admin only, matching the existing (stricter-than-create) guard on `updateExpenseAction`.

### Re-opened Surface Review

Surfacing `linkedInventoryId` as editable re-exposes the REQ-034 inventory-link reversal/reapply logic (`services/expense-service.ts:263-343`) to a UI trigger. That logic is pre-existing, already handles reversal/reapply correctly, and its guard against driving `Inventory.currentStock` below zero is unchanged — this REQ only adds a UI path to already-validated backend behaviour, it does not modify the guard itself.

### Data Integrity

Purely a UI-surfacing fix — `UpdateExpenseDTO` / `ExpenseService.updateExpense` already fully supported editing `transactionFee`, `receiptReference`, `referenceNumber`, and `linkedInventoryId`; no service-layer or schema change.

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

**@risk-deferred:** LOW risk — this REQ surfaces existing, already-validated backend capability; no new attack surface or financial-calculation risk beyond what REQ-034 already assessed for the inventory-link reversal logic (see `compliance/plans/REQ-105/implementation-plan.md` §5).

## Bundled Release Context

- **Core tracked release:** REQ-105 (declared bundle key; co-tracked with REQ-104, REQ-106)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `main` — see `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
- **Why bundled here:** REQ-104, REQ-105, and REQ-106 were declared as an explicit bundle at Phase 1 planning time (`Bundles: #767, #768, #769`) — all three are LOW/MEDIUM risk, share one branch/PR/release cycle, and touch distinct file sets with no scope overlap between them.
- **Evidence impact:** Evidence ownership remains on each source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers all three co-tracked REQs plus the absorbed non-release housekeeping work listed in the bundle manifest.
- **Security / risk impact:** Bundle ceremony runs at MEDIUM (the max risk across the set, from REQ-106). No additional security/risk impact beyond what each REQ's own risk-register entries (R-029/R-030/R-031 for REQ-106) already document.
- **Reference:** `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
