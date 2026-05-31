# REQ-053 — Test plan

**Requirement ID:** REQ-053
**Risk:** MEDIUM
**Related issue:** [#117 WA-4](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-05-31

## Acceptance criteria → tests

| AC  | Statement                                                                                             | Unit test                                                                           | E2E                                          |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| AC1 | Schema gains `whatsappTransactional` (default `true`) and `whatsappMarketing` (default `false`).      | `__tests__/models/user-model.preferences.test.ts` — schema defaults cases           | n/a — verified by unit                       |
| AC2 | Profile preferences tab renders two new Switches mirroring email/sms/push layout.                     | n/a — UI-only, manual review per `Test_Policy.md`                                   | spec to assert profile toggle round-trip     |
| AC3 | PIN-entry checkbox renders for new users only; checked default; sets both opt-in fields together.     | n/a — wired entirely in `login-form.tsx`                                            | spec to assert checkbox visibility + payload |
| AC4 | `verify*Pin` actions persist `optIn` only on first verification (`!phoneVerified && !emailVerified`). | `__tests__/actions/auth/verify-pin-opt-in.test.ts` — first-verify + preservation    | n/a — covered by unit                        |
| AC5 | `send*Pin` actions return `isNewUser: boolean`.                                                       | covered by existing patterns; pre-existed on sms/whatsapp; gap closed for email-pin | n/a                                          |
| AC6 | Backwards-compat: existing user docs read defaults; verify-pin with no `optIn` is a no-op.            | both unit files — backwards-compat cases                                            | n/a                                          |

## Test environment

- **Unit**: vitest 4.x via `npx vitest run`. Mongo / network boundary fully mocked. Mongoose model exercised via `new UserModel(...)` (no DB connection); chained `findOne().select()` mocked.
- **E2E**: Playwright against [UAT app](https://wawagardenbar-app-uat.up.railway.app/). The spec is authored against the live `/login` + `/profile` paths; CI execution **deferred** per `e2e_regression_suite` memory: customer PIN-login specs need provider mocks (server-side fatal sends without them). The spec is in the repo for the future infra; the unit boundary is the load-bearing gate now.

## Quality gates

| Gate                                                              | Expected        | Actual (2026-05-31)        |
| ----------------------------------------------------------------- | --------------- | -------------------------- |
| `npx tsc --noEmit`                                                | exit 0          | exit 0                     |
| `npx vitest run` (full)                                           | 0 failures      | 901 pass / 4 skip / 0 fail |
| `npx vitest run __tests__/models/user-model.preferences.test.ts`  | 4 pass          | 4 pass                     |
| `npx vitest run __tests__/actions/auth/verify-pin-opt-in.test.ts` | 4 pass          | 4 pass                     |
| `npx eslint <changed>`                                            | 0 errors        | 0 errors                   |
| `semgrep scan --config auto <changed>`                            | 0 findings      | 0 findings                 |
| `npm audit --audit-level=high`                                    | 0 high/critical | 0 high/critical            |

## Test data

- Synthetic phone IDs starting `+2347000000010..` for opt-in scenarios.
- Mock OID `65a1b2c3d4e5f6a7b8c9d0e1` for user docs.
- Mock initial preferences mirror the schema defaults; tests with `phoneVerified: true` represent returning users.

## Sequencing

1. Unit gates run locally + on CI per push (compliance-evidence).
2. E2E focused dispatch on UAT once provider-mock infra lands; tracked as a follow-up REQ.
3. Release PR `develop → main` aggregates the CI evidence under `REQ-053`.

## Rollback signal

`Tab.preferences.communicationPreferences.whatsappTransactional` reads `undefined` on freshly-loaded user docs (Mongoose defaults dropped) → revert `services/user-model.ts` schema patch via `git revert <merge-sha>`. Newly-persisted values on existing tabs persist (the field stays set; old code stops reading it).
