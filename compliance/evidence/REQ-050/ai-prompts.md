# AI Prompts — REQ-050

**Requirement:** REQ-050 — Expense-restock stock-leak fix for `trackByLocation` inventory
**Date:** 2026-05-28

Driven through the `sdlc-implementer` skill. The operator-facing prompts:

## Bug report (pre-skill)

Operator described the UAT symptom: "added 40 bottles of Orijin - Small but its still showing a count of 0. this needs investigation." AI diagnosed the bug class (REQ-044 variant in expense-restock path) via code-walk, then filed issue **#175** with the full mechanism, fix shape, and operational-repair note. Operator chose to track as a `#117 P0` follow-up.

## Phase 0 — Workflow Triage

> `start the sdlc-implementer cycle on #175 as the next P0`

Skill fetched #175, classified inference-first (label `bug` + title `fix:` + body heuristics: inventory ledger, customer-visible, user-reported revenue impact → tracked Bug-fix · HIGH). Announced the Workflow Decision; wrote `type:fix`, `risk:high` labels back; paused for operator confirmation.

## Phase 1 — Plan

> `proceed`

Skill ran Phase 1: confirmed scope, code-walked `expense-inventory-link-service.ts` + the inventory pre-save hook + REQ-044's precedent helper. Assigned **REQ-050**. Wrote `compliance/plans/REQ-050/implementation-plan.md` with HIGH-required sections (STRIDE threat model + four-eyes attestation slot + rollback plan). Updated RTM. Posted plan summary to #175. **Paused at the HIGH-mandatory Phase-1 plan-approval checkpoint.**

In-flight scope decision surfaced: "what are we doing about [the broken UAT row]?". Operator chose **A + C in parallel** — bundle the reconciliation script into REQ-050 (A) and apply a one-shot manual repair on the affected Orijin row now (C). Plan updated to reflect (A); UAT repair executed during Phase 1 (C, see § _Operational repair_ in `test-execution-summary.md`).

## Phase 2 — Implement + tests

> `proceed`

Skill ran Phase 2:

- Branched `feat/REQ-050-expense-restock-trackbylocation` off develop.
- Implemented the new `applyExpenseStockDelta` helper + refactored 3 sites in `expense-inventory-link-service.ts` (apply, reverse, runReversalPass).
- Authored `scripts/reconcile-track-by-location-stock.ts` (pure-helper + CLI bootstrap; dry-run default).
- Wrote 17 new vitest cases across 2 files (`expense-inventory-link.trackbylocation.test.ts` + `reconcile-track-by-location-stock.test.ts`).
- Updated 33 existing REQ-034 tests to assert via `inventory.save()` instead of `InventoryModel.updateOne $inc` — used a small Python script for the bulk find-replace (29 `findById` mocks + 13 `updateOne` assertion sites).
- Ran the local gates (all green: tsc 0, vitest 875 pass / 0 fail, eslint 0 errors, npm audit 0 high/critical).
- Committed in 2 logical commits (`docs(compliance):` plan + RTM; `fix: [REQ-050]` impl + tests) with `Ref: REQ-050` + `Co-Authored-By: Claude` trailers.
- Pushed; opened **PR #177** with `[REQ-050]` in the title (`feedback_pr_title_req_brackets` convention); merged to develop at `4f0cbeb`.
- `derive-release-version.sh` returned `REQ-050` for the develop-push ✓ — no #163-style attribution-fix follow-up needed.

## Phase 3 — Evidence (this pack)

> _(continuation after Phase 2 merge)_

Skill wrote this evidence pack; next step is the develop→main release PR (Phase 4 / UAT four-eyes gate).

## Notes / standing rules in force

- **Tests before push** — 17 new cases written first; 33 existing tests updated; all green before commit.
- **No `--no-verify`** — husky/lint-staged ran cleanly on both commits.
- **PR title `[REQ-XXX]` brackets convention** — applied; CI attribution clean.
- **Plan review for HIGH** — Phase-1 checkpoint was the explicit gate; operator approved before any code.
- **UAT-only DB writes** — Orijin manual repair was UAT-only; temp script not committed.

## Sub-skill invocations

None this REQ. Per the Phase-0 read (operator agreed), `e2e-test-engineer` is not applicable: the bug is service-layer; UI just reflects state. Service-integration tests are the appropriate depth.
