# REQ-060 — Test plan

**Requirement ID:** REQ-060
**Risk:** LOW
**Related issue:** [#117 IG-7](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-02

## Acceptance criteria → tests

| AC  | Statement                                                                                                    | Test                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `getActiveCampaignsForUser` aggregator returns one entry per currently-active social_instagram rule          | `__tests__/services/instagram-service.campaigns.test.ts` (3 cases — no rules, none-active, multiple-active)               |
| AC2 | `currentProgress` counts only `status: 'pending'` credits                                                    | Same file — 1 case (countDocuments filter shape includes `status: 'pending'`)                                             |
| AC3 | Sliding-window filter uses `postedAt >= now - windowDays * DAY_MS`                                           | Same file — 1 case (filter-shape drift assertion < 1 minute)                                                              |
| AC4 | `<InstagramCampaignCard>` renders null on empty array; one block per campaign otherwise                      | Manual UAT verification — JSX is straightforward                                                                          |
| AC5 | Customer rewards page integration — aggregator added to `Promise.all`; card rendered before statistics block | Manual diff inspection                                                                                                    |
| AC6 | DB failure returns `[]` and logs (does not throw)                                                            | Same file — 1 case (`mockFind.mockImplementation(() => { throw ... })` → expect result === `[]` + `console.error` called) |
| AC7 | Aggregator + card pair = end-to-end progress display                                                         | Implicit — passing service tests + manual UAT                                                                             |

## Test environment

- **Unit**: vitest 4.1.x. `@/models/reward-rule-model` and `@/models/instagram-post-credit-model` mocked at the import boundary. Rule docs are synthesised with a `makeRule()` factory that sets `isCurrentlyActive()` to a fixed return value. The `find().exec()` chain is mocked via a `withExec(value)` helper that returns `{ exec: mockResolvedValue(value) }`.
- **No component test** — server-component RTL is non-trivial; the JSX is presentational with a single conditional.
- **No E2E** — read-only customer surface; unit boundary is load-bearing. Honours `project_e2e_targeted_until_117` policy.

## Quality gates

| Gate                                                                    | Expected                                           | Actual (2026-06-02)                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                                                      | exit 0                                             | exit 0                                                                                                                                                                                                                                                       |
| `npx vitest run` (full)                                                 | 0 failures                                         | 1014 pass / 4 skip / 0 fail                                                                                                                                                                                                                                  |
| `npx vitest run __tests__/services/instagram-service.campaigns.test.ts` | 7 pass                                             | 7 pass                                                                                                                                                                                                                                                       |
| `npx eslint <changed>`                                                  | 0 errors                                           | 0 errors (6 intentional `no-console` warnings on v1 observability lines in `services/instagram-service.ts`)                                                                                                                                                  |
| `semgrep scan --severity=ERROR <changed>`                               | 0 findings                                         | 0 findings on 2 source files                                                                                                                                                                                                                                 |
| `npm audit --audit-level=high`                                          | 0 high/critical                                    | 0 high / 0 critical                                                                                                                                                                                                                                          |
| Develop CI Pipeline (post-merge)                                        | All 3 jobs PASS, attributed to `--release REQ-060` | run [26809128553](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26809128553) — `Release version: REQ-060` clean step-3 attribution via `[REQ-060]` PR-title body; Quality Gates + Upload Evidence + Compliance Evidence Upload all green |

## Test data

- Synthetic `RewardRule`-shaped objects via `makeRule({ name, hashtag, postsRequired, windowDays, pointsAwarded, active })` factory.
- `isCurrentlyActive()` is a fixed-return method on the synthesised rule.
- `mockFind.mockReturnValue(withExec([rules]))` simulates the `.find(...).exec()` chain.
- `mockCountDocuments.mockResolvedValueOnce(N)` controls the pending count per rule.

## Sequencing

1. Unit gate runs locally + on CI per push.
2. E2E not dispatched — `project_e2e_targeted_until_117` policy + scope justification.
3. Phase 3 evidence pack (this bundle) lands on develop BEFORE the release PR per `feedback_phase3_release_ticket_mandatory` — fourth consecutive cycle applying this lesson.
4. Release PR `develop → main` aggregates the CI evidence under `REQ-060`.

## Rollback signal

The `<InstagramCampaignCard>` disappears from `/profile/rewards`. The unused `getActiveCampaignsForUser` method remains as dead code in the revert window (harmless). No data migration to roll back; no customer-visible breakage besides the card vanishing.
