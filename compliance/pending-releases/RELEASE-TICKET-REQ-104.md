# Release Ticket: REQ-104 — Expense Tags

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-09-14
**Requirement ID:** REQ-104
**Risk Level:** LOW
**Issue:** [#767](https://github.com/metasession-dev/wawagardenbar-app/issues/767)
**Implementation branch:** `feat/bundle-cash-tags-expense-edit`

## Bundled Changes

Part of a 3-issue bundle declared up front (`Bundles: #767, #768, #769`) — REQ-104, REQ-105, and REQ-106 share one branch, one PR to `develop`, and one release cycle to `main`, each with its own REQ number, plan, and evidence pack. Bundle eligibility: all three are LOW/MEDIUM risk (no CRITICAL member, no more than one risk tier apart), and each touches a distinct file set with no scope overlap between them. Bundle manifest: `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json` (`sha256:910dda8e20537ae0c8983395a32bec2fb4f32855cda111b86383a2f639a0fd15`).

- **Core tracked release:** REQ-104 (declared bundle key; co-tracked with REQ-105, REQ-106)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `main` — see `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
- **Why bundled here:** REQ-104, REQ-105, and REQ-106 were declared as an explicit bundle at Phase 1 planning time (`Bundles: #767, #768, #769`) — all three are LOW/MEDIUM risk, share one branch/PR/release cycle, and touch distinct file sets with no scope overlap between them.
- **Evidence impact:** Evidence ownership remains on each source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers all three co-tracked REQs plus the absorbed non-release housekeeping work listed in the bundle manifest.
- **Security / risk impact:** Bundle ceremony runs at MEDIUM (the max risk across the set, from REQ-106). No additional security/risk impact beyond what each REQ's own risk-register entries (R-029/R-030/R-031 for REQ-106) already document.
- **Reference:** `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`

## Summary

Adds creatable, archivable tags for expense line items: create a new tag inline while adding a pending expense (or pick an existing one), archive tags so the list stays manageable without losing historical attribution, and filter the expense list by one or more tags. Tags survive the transfer from pending group to the live `Expense` ledger.

## AI contributors

| Tool        | Version  | Commits                                   | Date       |
| ----------- | -------- | ----------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `0c691e8` (plan + implementation + tests) | 2026-09-14 |

## Implementation details

- `models/tag-model.ts` / `interfaces/tag.interface.ts` — new `Tag` collection, `archivedAt` soft-delete pattern (mirrors `Inventory`/`MenuItem`).
- `services/tag-service.ts` — case-insensitive find-or-create by slug, unarchive-on-recreate, archive/restore.
- `app/actions/finance/tag-actions.ts` — CRUD+archive server actions, `requireAdminOrAbove`.
- `components/ui/tag-combobox.tsx` — new creatable multi-select combobox (hand-built on `Popover`, no new dependency).
- `models/pending-expense-group-model.ts` / `interfaces/pending-expense-group.interface.ts` — `tagIds` per line item.
- `models/expense-model.ts` / `interfaces/expense.interface.ts` — `tagIds` propagated at transfer.
- `services/pending-expense-group-service.ts` — `buildExpenseRecordsFromGroup` propagates `tagIds` onto the created `Expense` records.
- `components/features/finance/expense-form.tsx`, `edit-pending-group-dialog.tsx` — per-line-item tag combobox.
- `components/features/finance/expense-list.tsx` — tag multi-select filter.
- `docs/SRS.md` — REQ-FIN-006 (new). No ADR needed (new collection reusing established patterns, LOW risk). No risk-register entry warranted (`@risk-deferred`).
- Tests: 13 new unit tests (`tag-service.test.ts`, `pending-expense-group-service.test.ts` REQ-104 blocks); 1 new E2E test.

## Verification

- Unit: 1,479 passed, 4 skipped (full suite), 14 new for this REQ.
- E2E: 1/1, run locally against a dev server backed by the tunneled UAT database.
- TypeScript/ESLint: 0 errors.
- Full detail: `compliance/evidence/REQ-104/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. LOW risk auto-continued through Phase 1 per skill policy. The operator reviews the shared bundle PR + performs the portal UAT review before Production approval.
