# REQ-057 — Test plan

**Requirement ID:** REQ-057
**Risk:** LOW
**Related issue:** [#117 IG-1 + IG-2](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Acceptance criteria → tests

| AC  | Statement                                                                           | Test                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `socialConfig.postsRequired` defaults to 3; `windowDays` defaults to 7              | `__tests__/services/reward-rule-cadence-schema.test.ts` (3 new cases — `postsRequired` default, `windowDays` default, explicit override)                                                        |
| AC2 | Paired-validity hook rejects half-set cadence                                       | Same file — 4 cases (`postsRequired` only fails, `windowDays` only fails, both-set passes, neither-set [legacy] passes). Async `.validate()` because middleware skips on `validateSync()`       |
| AC3 | Zod regex accepts IG-valid chars, rejects invalid                                   | `__tests__/actions/profile-actions.instagram-handle.test.ts` — 11 cases (5 accept + 6 reject)                                                                                                   |
| AC4 | Transform strips leading `@` and trims whitespace; manual strip removed from action | Same file — 4 cases (`@foo` → `foo`, `@foo.bar` → `foo.bar`, `  foo  ` → `foo`, `@foo  ` → `foo`); inspection of `app/actions/profile/profile-actions.ts:170-178` confirms manual strip removed |
| AC5 | Explainer copy ties to IG campaigns                                                 | `components/features/profile/personal-info-tab.tsx:166` reads "Required to earn points on Instagram tagging campaigns — we use this to match your tags to your account." — manual inspection    |
| AC6 | Tests written TDD-first per `feedback_tests_before_push`                            | Commit history: tests landed in same commit as production code (`c9d8c04`) — TDD red baseline locally before commit                                                                             |

## Test environment

- **Unit/Integration**: vitest 4.1.x. Mongo / network boundary fully mocked. `connectDB` mocked. Schema tests construct `new RewardRuleModel({...})` and call `await doc.validate()` (NOT `validateSync()` — the pre-validate hook only runs on the async path). Zod tests exercise the exported `instagramHandleSchema` directly via `.safeParse()`.
- **No E2E**: REQ-057's surface is schema-level + form-validation; e2e would exercise the same paths via Playwright with no added confidence. Honours `project_e2e_targeted_until_117` policy.

## Quality gates

| Gate                                                                        | Expected                                                                                                 | Actual (2026-06-01)                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                                          | exit 0                                                                                                   | exit 0                                                                                                                                                                                                                       |
| `npx vitest run` (full)                                                     | 0 failures                                                                                               | 989 pass / 4 skip / 0 fail                                                                                                                                                                                                   |
| `npx vitest run __tests__/services/reward-rule-cadence-schema.test.ts`      | 11 pass                                                                                                  | 11 pass                                                                                                                                                                                                                      |
| `npx vitest run __tests__/actions/profile-actions.instagram-handle.test.ts` | 16 pass                                                                                                  | 16 pass                                                                                                                                                                                                                      |
| `npx eslint <changed>`                                                      | 0 errors                                                                                                 | 0 errors                                                                                                                                                                                                                     |
| `semgrep scan --severity=ERROR <changed>`                                   | 0 findings                                                                                               | 0 findings on 3 files                                                                                                                                                                                                        |
| `npm audit --audit-level=high`                                              | 0 high/critical                                                                                          | 0 high / 0 critical                                                                                                                                                                                                          |
| Develop CI Pipeline (post-merge)                                            | Quality Gates + Upload Evidence + Compliance Evidence Upload all PASS, attributed to `--release REQ-057` | run [26782113739](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26782113739) — `Release version: REQ-057` (clean step-3 attribution via `[REQ-057]` PR-title body); Compliance Evidence Upload succeeded |

## Test data

- Synthetic reward rules with `triggerType: 'social_instagram'` and varied `socialConfig` shapes (both-set, half-set, neither-set, with explicit-null).
- Handles exercised: `foo`, `foo.bar`, `foo_bar`, `foo.123`, `123foo`, `@foo`, `  foo  `, `@foo.bar`, `@foo  `, `foo bar`, `foo-bar`, `foo!`, `<script>alert(1)</script>`, `@@@`, 31-char string, empty string.

## Sequencing

1. Unit gate runs locally + on CI per push.
2. E2E not dispatched — `project_e2e_targeted_until_117` policy + scope justification.
3. Phase 3 evidence pack (this bundle) lands on develop BEFORE the release PR per `feedback_phase3_release_ticket_mandatory` — fixes the REQ-056 cycle's order-of-operations bug.
4. Release PR `develop → main` aggregates the CI evidence under `REQ-057`.

## Rollback signal

Schema default disappears + handle regex relaxes. Existing rules in Mongo unaffected (default-on-read doesn't write to disk). Handles already saved remain valid (they were already constrained to `max(30)`; the regex tightening only blocks future invalid inputs). Revert is single-PR `git revert <merge-sha>`.
