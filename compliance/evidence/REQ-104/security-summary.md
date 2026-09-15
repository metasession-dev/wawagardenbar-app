# Security Summary — REQ-104

**Requirement:** REQ-104
**Issue:** [#767](https://github.com/metasession-dev/wawagardenbar-app/issues/767)
**Risk Level:** LOW
**Date:** 2026-09-14

---

## Security Assessment

### Access Control (RBAC)

All new server actions (`app/actions/finance/tag-actions.ts`) reuse the existing `requireAdminOrAbove` guard already defined in `pending-expense-actions.ts` — identical gating to expense category actions today. No new roles, no new permission surface.

### XSS / Output Encoding

Tag names are plain text rendered via React's default escaping; no `dangerouslySetInnerHTML` is used anywhere in the expense UI, and this REQ does not introduce any.

### Data Integrity

New `Tag` collection is additive (`archivedAt` soft-delete pattern, mirrors `Inventory`/`MenuItem`). `tagIds` arrays added to `ExpenseLineItemSchema` and `Expense` are optional, sparse, propagated at transfer time only — no migration, no backfill, no change to existing records.

### Dependencies

None introduced — the creatable combobox is hand-built on the existing `@radix-ui/react-popover` dependency.

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

**@risk-deferred:** LOW risk, purely additive descriptive metadata with no financial-calculation, auth, or data-exposure surface. No RISK-NNN entry warranted (see `compliance/plans/REQ-104/implementation-plan.md` §5).

## Bundled Release Context

- **Core tracked release:** REQ-104 (declared bundle key; co-tracked with REQ-105, REQ-106)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `main` — see `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
- **Why bundled here:** REQ-104, REQ-105, and REQ-106 were declared as an explicit bundle at Phase 1 planning time (`Bundles: #767, #768, #769`) — all three are LOW/MEDIUM risk, share one branch/PR/release cycle, and touch distinct file sets with no scope overlap between them.
- **Evidence impact:** Evidence ownership remains on each source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers all three co-tracked REQs plus the absorbed non-release housekeeping work listed in the bundle manifest.
- **Security / risk impact:** Bundle ceremony runs at MEDIUM (the max risk across the set, from REQ-106). No additional security/risk impact beyond what each REQ's own risk-register entries (R-029/R-030/R-031 for REQ-106) already document.
- **Reference:** `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
