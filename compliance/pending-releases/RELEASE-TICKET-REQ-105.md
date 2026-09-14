# Release Ticket: REQ-105 — Expense edit dialog full field visibility

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-09-14
**Requirement ID:** REQ-105
**Risk Level:** LOW
**Issue:** [#768](https://github.com/metasession-dev/wawagardenbar-app/issues/768)
**Implementation branch:** `feat/bundle-cash-tags-expense-edit`

## Bundled Release Context

Part of a 3-issue bundle declared up front (`Bundles: #767, #768, #769`) — REQ-104, REQ-105, and REQ-106 share one branch, one PR to `develop`, and one release cycle to `main`, each with its own REQ number, plan, and evidence pack. Bundle eligibility: all three are LOW/MEDIUM risk (no CRITICAL member, no more than one risk tier apart), and each touches a distinct file set with no scope overlap between them.

## Summary

`EditExpenseDialog` (super-admin only) silently omitted `transactionFee`, `receiptReference`, `referenceNumber`, and `linkedInventoryId` — all four already accepted by `UpdateExpenseDTO`/`ExpenseService.updateExpense`, just never wired into the UI. Surfaces the four as editable fields (reusing the existing kitchen/sellable inventory lookups for the link picker) plus a read-only audit block (`pendingGroupId`/`createdBy`/`createdAt`/`updatedAt`). No backend change.

## AI contributors

| Tool        | Version  | Commits                                   | Date       |
| ----------- | -------- | ----------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `7c27a71` (plan + implementation + tests) | 2026-09-14 |

## Implementation details

- `components/features/finance/edit-expense-dialog.tsx` — four newly-editable fields (transactionFee, receiptReference, referenceNumber, linkedInventoryId) plus a read-only audit info block.
- `docs/SRS.md` — REQ-FIN-007 (new — retroactively documents an existing capability's gap). No ADR needed (single-file UI-surfacing fix, LOW risk, no backend change).
- Tests: 2 new unit tests (`expense-service.update-fields.test.ts`); 1 new E2E test.

## Verification

- Unit: 1,479 passed, 4 skipped (full suite), 2 new for this REQ.
- E2E: 1/1, run locally against a dev server backed by the tunneled UAT database.
- TypeScript/ESLint: 0 errors.
- Full detail: `compliance/evidence/REQ-105/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. LOW risk auto-continued through Phase 1 per skill policy. The operator reviews the shared bundle PR + performs the portal UAT review before Production approval.
