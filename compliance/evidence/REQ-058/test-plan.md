# REQ-058 — Test plan

**Requirement ID:** REQ-058
**Risk:** LOW
**Related issue:** [#117 IG-5](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Acceptance criteria → tests

| AC  | Statement                                                                                                   | Test                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| AC1 | `runInstagramRewardsJob()` wraps `InstagramService.processInstagramRewards` with error-swallowing try/catch | `__tests__/lib/scheduled-jobs.test.ts` (2 new cases — happy path + error-swallow with `console.error`)          |
| AC2 | `startScheduledJobs()` registers two intervals (REQ-048 + REQ-058) and is idempotent on second call         | Same file — 1 updated case (was `1`, now `2` intervals after `setInterval` count assertion)                     |
| AC3 | `server.ts` boot wire-up unchanged                                                                          | Manual inspection — `server.ts:53` already calls `startScheduledJobs()`                                         |
| AC4 | Graceful no-credentials path preserved                                                                      | Inspection of `services/instagram-service.ts` mock-mode branch; REQ-058 doesn't introduce any new env-var check |
| AC5 | Tests extend existing file (not duplicate)                                                                  | `__tests__/lib/scheduled-jobs.test.ts` is the home for both REQ-048 and REQ-058 cases                           |

## Test environment

- **Unit**: vitest 4.1.x. `@/services/rewards-service` and `@/services/instagram-service` both mocked at the import boundary. Idempotency test uses `vi.useFakeTimers()` + `vi.spyOn(global, 'setInterval')` to count interval registrations without actually firing them.
- **No integration test** — the scheduler bootstrap is exercised in `server.ts:53` at boot; calling it from tests would spawn real intervals.
- **No E2E** — server-boot scheduler; unit boundary is load-bearing. Honours `project_e2e_targeted_until_117` policy.

## Quality gates

| Gate                                                  | Expected                                           | Actual (2026-06-01)                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                    | exit 0                                             | exit 0                                                                                                                                                                                                                                                         |
| `npx vitest run` (full)                               | 0 failures                                         | 991 pass / 4 skip / 0 fail                                                                                                                                                                                                                                     |
| `npx vitest run __tests__/lib/scheduled-jobs.test.ts` | 5 pass                                             | 5 pass                                                                                                                                                                                                                                                         |
| `npx eslint <changed>`                                | 0 errors                                           | 0 errors                                                                                                                                                                                                                                                       |
| `semgrep scan --severity=ERROR <changed>`             | 0 findings                                         | 0 findings on `lib/scheduled-jobs.ts`                                                                                                                                                                                                                          |
| `npm audit --audit-level=high`                        | 0 high/critical                                    | 0 high / 0 critical                                                                                                                                                                                                                                            |
| Develop CI Pipeline (post-merge)                      | All 3 jobs PASS, attributed to `--release REQ-058` | run [26784899671](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26784899671) — `Release version: REQ-058` (clean step-3 attribution via `[REQ-058]` PR-title body); Quality Gates + Upload Evidence + Compliance Evidence Upload all green |

## Test data

- Mock `RewardsService.expireOldRewards()` and `InstagramService.processInstagramRewards()` with controllable resolutions.
- Fake timers via `vi.useFakeTimers()` to count `setInterval` registrations without firing them.

## Sequencing

1. Unit gate runs locally + on CI per push.
2. E2E not dispatched — `project_e2e_targeted_until_117` policy + scope justification.
3. Phase 3 evidence pack (this bundle) lands on develop BEFORE the release PR per `feedback_phase3_release_ticket_mandatory`.
4. Release PR `develop → main` aggregates the CI evidence under `REQ-058`.

## Rollback signal

The `[scheduled-jobs] instagram-rewards job failed:` log lines stop appearing in server logs; no new IG-campaign points get awarded automatically. The reward-expiry job keeps ticking. Revert is a single `git revert <merge-sha>` removing the helper + the two scheduler lines.
