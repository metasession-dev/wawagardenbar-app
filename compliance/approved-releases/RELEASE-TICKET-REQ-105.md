# Release Ticket: REQ-105 — Expense edit dialog full field visibility

**Status:** RELEASED
**Date:** 2026-09-14
**Requirement ID:** REQ-105
**Risk Level:** LOW
**Issue:** [#768](https://github.com/metasession-dev/wawagardenbar-app/issues/768)
**Implementation branch:** `feat/bundle-cash-tags-expense-edit`

## Bundled Changes

Part of a 3-issue bundle declared up front (`Bundles: #767, #768, #769`) — REQ-104, REQ-105, and REQ-106 share one branch, one PR to `develop`, and one release cycle to `main`, each with its own REQ number, plan, and evidence pack. Bundle eligibility: all three are LOW/MEDIUM risk (no CRITICAL member, no more than one risk tier apart), and each touches a distinct file set with no scope overlap between them. Bundle manifest: `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json` (`sha256:e84a35121bd6a67702a783a8fdfbbcc773fe716f0865a89d70498cc4b257df43`).

- **Core tracked release:** REQ-105 (declared bundle key; co-tracked with REQ-104, REQ-106)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `main` — see `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
- **Why bundled here:** REQ-104, REQ-105, and REQ-106 were declared as an explicit bundle at Phase 1 planning time (`Bundles: #767, #768, #769`) — all three are LOW/MEDIUM risk, share one branch/PR/release cycle, and touch distinct file sets with no scope overlap between them.
- **Evidence impact:** Evidence ownership remains on each source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers all three co-tracked REQs plus the absorbed non-release housekeeping work listed in the bundle manifest.
- **Security / risk impact:** Bundle ceremony runs at MEDIUM (the max risk across the set, from REQ-106). No additional security/risk impact beyond what each REQ's own risk-register entries (R-029/R-030/R-031 for REQ-106) already document.
- **Reference:** `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`

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

## Iteration 1 — requirements gap (post-UAT, 2026-09-15)

UAT found tags could not be added or removed on an already-transferred expense via the edit dialog — a gap the plan flagged as a possible touchpoint but never turned into an AC. Amended AC5, implemented (`UpdateExpenseDTO.tagIds`, `TagCombobox` in `edit-expense-dialog.tsx`, `listAllTagsAction` so archived-but-attached tags still display), `docs/SRS.md` REQ-FIN-007 updated, new unit + e2e coverage added. See `compliance/plans/REQ-105/implementation-plan.md` § "Requirements gap accepted".

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. LOW risk auto-continued through Phase 1 per skill policy. The operator reviews the shared bundle PR + performs the portal UAT review before Production approval.
