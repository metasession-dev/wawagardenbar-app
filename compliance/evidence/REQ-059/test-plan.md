# REQ-059 — Test plan

**Requirement ID:** REQ-059
**Risk:** MEDIUM
**Related issue:** [#117 IG-4](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-02

## Acceptance criteria → tests

| AC  | Statement                                                                                                                         | Test                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| AC1 | `InstagramPostCredit` model with documented fields, defaults, enums, unique `postId`, compound `(userId, ruleId, postedAt)` index | `__tests__/models/instagram-post-credit-model.test.ts` (6 cases)                                                       |
| AC2 | Ledger replaces naive dedup as primary; existing row → skip; new row → insert pending                                             | `__tests__/services/instagram-service.ledger.test.ts` — 2 cases (new post inserted pending; ledger-existing → skipped) |
| AC3 | Legacy `hasProcessedPost` fallback inserts `awarded` credit + skips re-award                                                      | Same file — 1 case (legacy-fallback hit → `inserted_legacy_fallback`)                                                  |
| AC4 | Sliding-window count: `pending` credits within `windowDays` reach `postsRequired` → award                                         | Same file — 3 cases (threshold not met, threshold met, filter-shape verification)                                      |
| AC5 | Award fires once + `updateMany` flips pending → awarded; `awardSocialPoints` throwing leaves credits pending                      | Same file — 2 cases (award + flip; award-failed → no flip)                                                             |
| AC6 | Hourly re-tick idempotent: same `postId` never inserted twice; concurrent E11000 caught                                           | Same file — 2 cases (E11000-as-skipped_already_seen; hourly re-tick no-op)                                             |
| AC7 | `markPostAsProcessed` stub removed; ledger insert is canonical "mark processed"                                                   | Manual inspection of `services/instagram-service.ts` diff confirms the removal                                         |

## Test environment

- **Unit**: vitest 4.1.x. `@/models/instagram-post-credit-model` and `@/services/rewards-service` mocked at the import boundary. Service uses the new public-static `InstagramService.processQualifyingPost` method that was extracted from `processRule` for direct testability — caller passes `{ user, rule, post }` and asserts on the returned `action` tag. `InstagramService.hasProcessedPost` (legacy fallback) is monkey-patched on the static class with the test's mock.
- **No integration test** — the real Graph API isn't exercised; mock-mode dev path stays as-is.
- **No E2E** — server-side ledger logic; unit boundary is load-bearing. Honours `project_e2e_targeted_until_117` policy.

## Quality gates

| Gate                                                                  | Expected                                           | Actual (2026-06-02)                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                                                    | exit 0                                             | exit 0                                                                                                                                                                                                                                                       |
| `npx vitest run` (full)                                               | 0 failures                                         | 1007 pass / 4 skip / 0 fail                                                                                                                                                                                                                                  |
| `npx vitest run __tests__/models/instagram-post-credit-model.test.ts` | 6 pass                                             | 6 pass                                                                                                                                                                                                                                                       |
| `npx vitest run __tests__/services/instagram-service.ledger.test.ts`  | 10 pass                                            | 10 pass                                                                                                                                                                                                                                                      |
| `npx eslint <changed>`                                                | 0 errors                                           | 0 errors (6 intentional `no-console` warnings on v1 observability lines in `services/instagram-service.ts`)                                                                                                                                                  |
| `semgrep scan --severity=ERROR <changed>`                             | 0 findings                                         | 0 findings on 2 files                                                                                                                                                                                                                                        |
| `npm audit --audit-level=high`                                        | 0 high/critical                                    | 0 high / 0 critical                                                                                                                                                                                                                                          |
| Develop CI Pipeline (post-merge)                                      | All 3 jobs PASS, attributed to `--release REQ-059` | run [26798396560](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26798396560) — `Release version: REQ-059` clean step-3 attribution via `[REQ-059]` PR-title body; Quality Gates + Upload Evidence + Compliance Evidence Upload all green |

## Test data

- Synthetic `userId` / `ruleId` Mongoose ObjectIds via `new Types.ObjectId()`.
- Mock posts with stable timestamps (`'2026-06-02T10:00:00Z'`) so window-count math is deterministic.
- Mock rule with default cadence (`postsRequired: 3, windowDays: 7, pointsAwarded: 100, hashtag: 'wawagardenbar'`) and one rule with cadence fields omitted (exercises the `??` defaults from REQ-057).
- Synthetic E11000 error: `Object.assign(new Error(...), { code: 11000 })`.

## Sequencing

1. Unit gate runs locally + on CI per push.
2. E2E not dispatched — `project_e2e_targeted_until_117` policy + scope justification.
3. Phase 3 evidence pack (this bundle) lands on develop BEFORE the release PR per `feedback_phase3_release_ticket_mandatory`.
4. Release PR `develop → main` aggregates the CI evidence under `REQ-059`.

## Rollback signal

`InstagramPostCredit.find().count()` stops growing post-revert; awards revert to per-post-immediate. Risk window: posts that received a `pending` credit (ledger only) when the revert lands could double-award on next tick under the legacy code. Mitigation per plan §Rollback: wait for the scheduler's next tick to flip pending → awarded, or pause the scheduler during rollback.
