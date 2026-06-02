# REQ-059 — AI prompts log

**Date:** 2026-06-02

## Session prompts (user → AI)

1. `plan IG-7 as REQ-059`
   - AI flagged that IG-7's "1/3 progress" depends on IG-4's `InstagramPostCredit` ledger. Surfaced three honest options: plan IG-4 first; bundle IG-4 + IG-7; build a degraded IG-7.

2. _(Selected "Plan IG-4 as REQ-059 first (Recommended)" via AskUserQuestion)_
   - AI presented the implementation plan with 7 ACs, technical approach, STRIDE table including partial-failure edge case, rollback. Surfaced two scope decisions: AC3 transition fallback vs clean-break vs eager-backfill.

3. _(Selected "Approve as scoped (Recommended)" via AskUserQuestion)_
   - Plan approval at the MEDIUM-risk gate. AI proceeded with TDD-first implementation.

4. `#245 merged`
   - Confirmation that the integration PR landed cleanly with `Release version: REQ-059` step-3 attribution. AI started assembling Phase 3 evidence pack per `feedback_phase3_release_ticket_mandatory`.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-059. The work is server-side ledger logic; no e2e author work needed (per the `project_e2e_targeted_until_117` policy AND per the scope justification — unit boundary at 16 cases covers the surface). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **Plan IG-4 before IG-7** — operator's first pick was IG-7 because it sounded S-sized. AI surveyed the spec ("reading from IG-4's ledger" / "Your progress: 1/3") and surfaced the dependency before committing to the smaller PR. Honest scope-shrink in reverse: IG-7 looks small but assumes IG-4's data; better to land the foundation first. Operator agreed.

- **AC3 legacy fallback vs clean break vs eager backfill** — three real options:
  - Clean break (option B): cheapest code, but posts awarded pre-REQ-059 could double-award if they appear again in the Graph API fetch. Real risk.
  - Eager backfill (option C): cleanest end-state, but adds a one-shot script and migration ceremony.
  - AC3 fallback (option A — chosen): keeps legacy `hasProcessedPost` as a transition check; insert `awarded` credit on fallback hit. No migration script; old posts get caught lazily. Operator selected A.

- **`processQualifyingPost` as public static method** — extracted from the inline `processRule` flow for testability. Action-tag union return type makes the tests assert on the public contract rather than on internal call counts. Alternative would have been to mock the full Graph API path which is harder.

- **AC3 inserts as `awarded`, not `pending`** — preserves the invariant that the `updateMany` filter `status: 'pending'` won't pick up legacy posts. If we inserted as `pending`, the next window-count would include the legacy post and could double-award. Stamp `awardedAt = new Date()` as best-known timestamp (original award date is lost from the description-regex).

- **Best-effort award + flip (no transaction)** — acknowledged that `awardSocialPoints` succeeding but `updateMany` failing would cause a double-award on next tick. Trade-off: Mongo transactions add complexity (need a session, need replicaset features), but on indexed updates this failure is rare. Operational monitoring of `PointsTransaction` per `(userId, ruleId)` per window is the recommended mitigation. Future REQ can add the transaction wrap.

- **Promote `hasProcessedPost` to public** — needed for the new `processQualifyingPost` to call it without mocking `PointsTransactionModel` in tests. Tests monkey-patch the static method on the class via `(InstagramService as unknown as Record<string, unknown>).hasProcessedPost = mock`. Cleaner alternative: extract `hasProcessedPost` to a standalone module. Future cleanup if it bothers anyone.

- **Phase 3 BEFORE release PR (third consecutive cycle)** — `feedback_phase3_release_ticket_mandatory` is now load-bearing for cycle hygiene.

## Audit cross-refs

- Parent backlog: #117 (IG-4).
- Direct dependencies:
  - REQ-048 — `lib/scheduled-jobs.ts` precedent + `server.ts:53` wire-up ✅
  - REQ-057 — `socialConfig.postsRequired` / `windowDays` defaults + paired-validity ✅
  - REQ-058 — scheduler ticks `processInstagramRewards` hourly ✅
- Cycle artefacts: PR #245 (integration), PR #246 (Phase 3 evidence pack — about to open), upcoming release PR (develop → main), upcoming close-out PR.
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_wait_for_ci`, `feedback_single_pr_default`, `feedback_pr_title_req_brackets`, `feedback_no_delete_develop_on_release_merge`, `project_e2e_targeted_until_117`, `feedback_phase3_release_ticket_mandatory`.
- Unblocks future work:
  - IG-7 — customer progress card now has real ledger data to read.
  - IG-6 — admin metrics view aggregates cadence completions from this ledger.
  - IG-3 — Graph API polling enhancements get cleaner integration with ledger-based dedup.
- Acknowledged operational concern: partial-failure between award + flip could double-award; mitigation is monitoring, fix is a future REQ wrapping the operation in a Mongo transaction.
