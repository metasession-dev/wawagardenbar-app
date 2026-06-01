# Release Ticket: REQ-058 — Schedule Instagram-rewards in-process (IG-5)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-06-01
**Requirement ID:** REQ-058
**Risk Level:** LOW
**GitHub Issue:** [#117 IG-5](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** [#240](https://github.com/metasession-dev/wawagardenbar-app/pull/240) — merged to develop 2026-06-01 (commit `b33bd2d`).
**Release PR:** pending — to be opened `develop → main` after this evidence pack lands.
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-058`, status `draft` → `uat_review` on this evidence push.

---

## Summary

`InstagramService.processInstagramRewards()` existed but had no caller. Until something ticked it, IG campaign points only got awarded on manual invocation — not viable for production. REQ-058 extends `lib/scheduled-jobs.ts` (REQ-048 precedent) with `runInstagramRewardsJob()` and hooks it into the existing `startScheduledJobs()` bootstrap with the same hourly + 60s catch-up cadence as the reward-expiry job.

The scheduler module's header explicitly anticipated this hook: _"This module is the registry future scheduled jobs hook into (e.g. the Instagram campaign poller, #117 IG-5)."_ REQ-058 closes the loop.

Same error-swallowing posture as `runRewardExpiryJob` — a tick can't crash the server. Idempotent because `InstagramService.processRule` dedupes posts via `hasProcessedPost(mediaId)` (naive description-regex match against `PointsTransaction`). IG-4 will replace this with a proper `InstagramPostCredit` model.

Server boot wire-up unchanged — `server.ts:53` already calls `startScheduledJobs()`.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** implementation plan with 5 ACs + STRIDE + rollback, the `runInstagramRewardsJob` helper, the 2 scheduler lines + header update, 3 new vitest cases (REQ-048's idempotency assertion updated from 1 to 2 intervals as part of the same edit), full REQ-058 compliance markdown pack. See `compliance/evidence/REQ-058/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this cycle:** acknowledged the plan and merged the REQ-058 integration PR #240. Will perform Phase 4 portal UAT approval + Phase 5 Production approval.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

**Files Modified:**

- `lib/scheduled-jobs.ts` — new `runInstagramRewardsJob()` helper; 2 new scheduler lines (`setTimeout(60s)` + `setInterval(1h)`) in `startScheduledJobs()`; file header updated with `@requirement REQ-058` + multi-replica caveat; boot-banner `console.warn` updated to include both jobs.
- `__tests__/lib/scheduled-jobs.test.ts` — extended with 3 REQ-058 cases (happy path, error-swallow, updated idempotency expecting 2 intervals).
- `compliance/RTM.md` — REQ-058 IN PROGRESS row.

**Files Added:**

- `compliance/plans/REQ-058/implementation-plan.md` — plan with ACs, STRIDE, rollback.

**Dependencies Added/Changed:**

- No new packages introduced by REQ-058.
- No env vars, no DB migration.

## Test Evidence

| Test Type         | Count                      | Passed | Failed | Evidence Location                                                                       |
| ----------------- | -------------------------- | ------ | ------ | --------------------------------------------------------------------------------------- |
| Scheduler unit    | 5 (2 pre-existing + 3 new) | 5      | 0      | DevAudit portal: `wgb/REQ-058`; `compliance/evidence/REQ-058/test-execution-summary.md` |
| Full vitest suite | 995                        | 991    | 0      | Same (+4 skipped pre-existing)                                                          |
| E2E               | n/a                        | —      | —      | `project_e2e_targeted_until_117` policy + scope justification (server-boot scheduler)   |

**Net new from REQ-057 baseline (989 / 4 skip):** +2 net new cases (3 added, 1 absorbed into the idempotency update).

## Security Evidence

| Check                 | Result                                                    | Evidence Location                                                                                                                   |
| --------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript Check      | exit 0                                                    | DevAudit portal: `wgb/REQ-058`; CI run [26784899671](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26784899671) |
| SAST (Semgrep)        | 0 ERROR-severity findings                                 | Same                                                                                                                                |
| Dependency Audit      | 0 high / 0 critical                                       | Same                                                                                                                                |
| Access Control review | N/A                                                       | `compliance/evidence/REQ-058/security-summary.md`                                                                                   |
| Audit Log review      | PASS — existing `PointsTransaction` audit trail unchanged | `compliance/evidence/REQ-058/security-summary.md`                                                                                   |

## Acceptance Criteria

- [x] AC1 — `runInstagramRewardsJob()` wraps `processInstagramRewards` with error-swallowing try/catch
- [x] AC2 — `startScheduledJobs()` registers two intervals and is idempotent
- [x] AC3 — `server.ts` boot wire-up unchanged
- [x] AC4 — graceful no-credentials path preserved
- [x] AC5 — tests extend existing file (not duplicate)
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean
- [x] AI use documented

## Risk Assessment

- **Hourly Graph API call** — could hit ~200/hr rate limit if we ever scale to N>1 replicas; single-replica today, documented multi-replica leader-election as a future REQ.
- **Long-running tick** — `setInterval` queues the next tick regardless. With typical completion in seconds, overlap is unlikely. Per-job re-entry guard is a future concern, not load-bearing for v1.
- **Naive dedup via description-regex** — `hasProcessedPost(mediaId)` matches the `PointsTransaction.description` field for the `media_id` token. Functional but inelegant; IG-4 will replace with `InstagramPostCredit` model. REQ-058 doesn't change the dedup mechanism.
- **No new dependencies, no env vars, no DB migration**.

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                                                                                                                                      |
| ---- | ---------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| —    | None             | —      | —        | No data migration, no schema migration. The new scheduler job starts ticking automatically on the next Railway deploy. No env vars to set. |

**Run these after deployment, before production verification.**

---

## Reviewer Checklist

- [ ] Code matches requirement (review `lib/scheduled-jobs.ts` diff)
- [ ] Test evidence present and all-pass (5 cases — green on develop CI)
- [ ] Security evidence present and clean (SAST 0, dep-audit 0, STRIDE assessed)
- [ ] Test scope fully addressed (test-scope.md ↔ test-plan.md ↔ test-execution-summary.md)
- [ ] RTM correct status and risk (LOW, will flip to RELEASED at close-out)
- [ ] No sensitive data committed
- [ ] No regressions (full vitest 991 / 0 fail / 4 skip — unchanged from REQ-057 baseline)
- [ ] AI code reviewed (`ai-use-note.md` + `ai-prompts.md`)
- [ ] No hallucinated dependencies (no new packages)
- [ ] Post-deploy actions documented (None required)

---

## 🛡️ Compliance & UAT Sign-off

_This section must be completed by a human reviewer before merging to Production._

| Role                | Name | Date | Status              | Signature/Notes |
| :------------------ | :--- | :--- | :------------------ | :-------------- |
| **QA Lead**         |      |      | [ ] PASS / [ ] FAIL |                 |
| **Product Owner**   |      |      | [ ] PASS / [ ] FAIL |                 |
| **Security Review** |      |      | [ ] N/A / [ ] OK    |                 |

> **Audit Note:** This release was assisted by Claude Code (Opus 4.7) via the project's `sdlc-implementer` skill. All AI-generated content was reviewed by the operator and linked to the Requirement Traceability Matrix. AC1–AC5 are covered by 5 unit cases (2 pre-existing REQ-048 regression + 3 new REQ-058), 0 failures, with E2E policy honoured per `project_e2e_targeted_until_117`. **Phase 3 evidence pack assembled BEFORE the release PR** per `feedback_phase3_release_ticket_mandatory` (same pattern as REQ-057).

## Audit Trail

| Date       | Action                                 | Actor       | Notes                                                                                                       |
| ---------- | -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-06-01 | Requirement created                    | ostendo-io  | Risk: LOW                                                                                                   |
| 2026-06-01 | Pre-implementation survey              | Claude Code | Confirmed `lib/scheduled-jobs.ts` REQ-048 precedent; tiny scope                                             |
| 2026-06-01 | Implementation plan presented          | Claude Code | 5 ACs + STRIDE + rollback; LOW risk so no formal approval gate                                              |
| 2026-06-01 | TDD red baseline (3 new cases) written | Claude Code | Happy path + error-swallow + idempotency update                                                             |
| 2026-06-01 | Implementation completed               | Claude Code | helper + 2 scheduler lines + header update                                                                  |
| 2026-06-01 | Tests passed                           | Claude Code | 5 / 5; full suite 991 / 4 skip / 0 fail                                                                     |
| 2026-06-01 | Integration PR #240 opened + merged    | ostendo-io  | merged to develop (`b33bd2d`)                                                                               |
| 2026-06-01 | CI green; attribution clean            | —           | run 26784899671 — `Release version: REQ-058` (step 3 picked `[REQ-058]` from PR title in merge-commit body) |
| 2026-06-01 | Phase 3 evidence pack assembled        | Claude Code | This PR — BEFORE release PR per `feedback_phase3_release_ticket_mandatory`                                  |
| 2026-06-01 | Submitted for UAT review               | Claude Code | After this evidence-pack PR merges                                                                          |
