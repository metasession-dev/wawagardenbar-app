# REQ-058 — AI use note

**Date:** 2026-06-01
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- **Pre-implementation survey** — read `lib/scheduled-jobs.ts` (REQ-048 precedent), `services/instagram-service.ts` (the function being scheduled), `__tests__/lib/scheduled-jobs.test.ts` (existing REQ-048 tests), and `server.ts:53` (boot wire-up). Confirmed the scheduler module's header explicitly anticipates IG-5 as a future hook. Scope is tiny — a single `~20 LOC` addition mirroring `runRewardExpiryJob` + two new scheduler lines.
- **Authored** `compliance/plans/REQ-058/implementation-plan.md` with 5 ACs (helper, schedule, server.ts unchanged, no-credentials path preserved, tests extend existing file), STRIDE table, rollback. LOW risk → no formal plan-approval gate per `feedback_sdlc_impl_plan_review`; plan presented for context.
- **TDD red baselines** — wrote 3 new cases in the existing `__tests__/lib/scheduled-jobs.test.ts`: `runInstagramRewardsJob` happy path, error-swallowing, and updated REQ-048's idempotency test from `1` → `2` intervals.
- **Implementation**:
  - `lib/scheduled-jobs.ts`: added `runInstagramRewardsJob()` with the same try/catch + `console.error` posture as `runRewardExpiryJob`; added 2 scheduler lines (`setTimeout(60s)` + `setInterval(1h)`); updated the file header to add `@requirement REQ-058` and the multi-replica caveat; updated the boot-banner `console.warn` to include both jobs.
- **Gates** — full vitest 991 / 4 skip / 0 fail (+2 net new from REQ-057 baseline of 989; 3 added, 1 absorbed into the idempotency update); tsc 0 errors; eslint 0 errors on 2 changed files; semgrep ERROR-severity 0 findings on 1 source file; npm audit 0 high/critical.
- **Commit + push + PR #240** — `feat(scheduler): schedule instagram-rewards hourly in-process [REQ-058]`. No commit-msg hook issues this time.
- **Phase 3 evidence pack assembled BEFORE the release PR**, per `feedback_phase3_release_ticket_mandatory`. This is REQ-057's pattern repeated: Phase 3 lands ahead of the release PR to flip the portal release to `uat_review` cleanly.
- **Updated** `compliance/RTM.md` with the REQ-058 row.

## What the human did

- Asked for IG-5 as REQ-058 after the REQ-057 cycle closed cleanly ("IG-5 as REQ-058").
- Merged the integration PR #240.
- Will perform Phase 4 portal UAT approval + Phase 5 Production approval.

## Risk-tier compliance

- LOW risk → no formal plan-approval gate per `feedback_sdlc_impl_plan_review`; plan presented for context anyway.
- Tests written before implementation per `feedback_tests_before_push` (3 red cases confirmed locally before commit).
- All gates run locally before push per `feedback_wait_for_ci`.
- Single bundled PR per `feedback_single_pr_default` (production + RTM + plan + tests in PR #240; evidence pack in PR #241 per Phase 3 sequencing).
- E2E policy honoured per `project_e2e_targeted_until_117` — no full regression dispatched; unit boundary is load-bearing.
- Phase 3 evidence pack lands BEFORE release PR per `feedback_phase3_release_ticket_mandatory`.
- No `--no-verify`. PR titles use `[REQ-XXX]` brackets per `feedback_pr_title_req_brackets`.

## REQ-057 → REQ-058 cycle hygiene applied

| REQ-057 lesson                             | REQ-058 follow-through                                              |
| ------------------------------------------ | ------------------------------------------------------------------- |
| Phase 3 evidence pack BEFORE release PR    | Done — this PR (#241 once opened) lands before the release PR opens |
| Clean `[REQ-XXX]` attribution via PR title | Done — `Release version: REQ-058` on develop CI after #240 merge    |
| Mongoose `validateSync` gotcha             | Not applicable — REQ-058 doesn't touch schema validation            |
| Pre-emptive vitest CVE bump                | Not applicable — no dep changes                                     |
