# Security Summary — REQ-108

**Requirement:** REQ-108
**Issue:** [#815](https://github.com/metasession-dev/wawagardenbar-app/issues/815)
**Risk Level:** HIGH
**Date:** 2026-09-22

---

## Security Assessment

### Access Control (RBAC)

No permission-gate change. `updateOrderStatusAction` and `TabService.addOrderToTab` retain their existing role guards; this REQ only changes the payment-status side effect logic inside an already-gated code path.

### Financial-Correctness Surface (the actual risk driver for this REQ's HIGH classification)

The change closes a confirmed, already-occurring production defect: tab-linked orders were silently marked `paymentStatus: 'paid'`/`paymentMethod: 'cash'` on kitchen completion while their tab remained open/unpaid, corrupting revenue and cash-position reporting. The fix adds two independent, structurally-decoupled enforcement layers (root-cause `Order.tabId` reliability at the single attach chokepoint, plus an independent `TabModel.exists` membership check) so a future regression would need to break both simultaneously — see `compliance/risk-register.md` R-032 for the full assessment.

### Data Migration Surface

`scripts/backfill-order-tabid.ts` is a one-time, operator-run migration script (not executed as part of this REQ's deployment). It defaults to a read-only report; its opt-in `--revert-false-positives` flag is scoped narrowly (only orders on tabs still `open` and unpaid at the tab level) and requires a mandatory `--dry-run` review first. See `compliance/risk-register.md` R-033.

### Dependencies

None introduced — `package.json`/`package-lock.json` untouched by this diff.

### Secrets / Credentials

None. The migration script reads `MONGODB_WAWAGARDENBAR_APP_URI`/`MONGODB_DB_NAME` from the existing `.env.local` convention already used by sibling backfill scripts; no new credential surface.

---

## Static Analysis (Semgrep)

**Status:** PASS — `SAST findings: 0` (baseline 0), Quality Gates job, PR #836 (run 35656683401) and confirmed again post-merge on `develop`.

---

## Dependency Audit (npm audit)

**Status:** PRE-EXISTING FINDINGS, none introduced by this REQ — `npm audit --audit-level=high` reports 16 vulnerabilities (9 high) in the existing dependency tree; `package.json`/`package-lock.json` are untouched by this diff, so none are attributable to REQ-108.

---

## Risk Register

- **R-032** — Tab orders falsely auto-marked cash-paid on kitchen completion. Status: MITIGATED. Residual: low × low.
- **R-033** — Backfill script for REQ-108 could incorrectly revert a legitimately-paid order. Status: ACCEPTED. Residual: low × medium.

Full detail: `compliance/evidence/REQ-108/risk-assessment.md`.
