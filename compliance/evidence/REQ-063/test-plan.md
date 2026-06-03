# REQ-063 — Test plan

**Requirement ID:** REQ-063
**Risk:** MEDIUM
**Related issue:** [#117 P4 #21](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-03

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                                                                    | Test                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | PIN-entry renders three distinct checkboxes (WA transactional default on, WA marketing default off, email marketing default off) and persists each independently to the user's communicationPreferences on first verify only | `__tests__/actions/verify-pin.optin-payload.test.ts` — 2 cases: (1) first verify with `{ whatsappTransactional: true, whatsappMarketing: false, emailMarketing: false }` sets all three independently + stamps audit timestamp; (2) returning user (`phoneVerified: true`) with payload — no prefs paths set                                |
| AC2 | `IPreferences.communicationPreferences.emailMarketing: boolean` exists with default `false`; backwards-compatible via Mongoose default-fill                                                                                  | `__tests__/models/user-model.preferences.test.ts` — 2 cases: (1) new doc has `emailMarketing === false`; (2) explicit override at construction is honoured                                                                                                                                                                                  |
| AC3 | `IPreferences.communicationPreferencesUpdatedAt?: Date` accepts Date values; server-stamped at PIN first-verify + on `updatePreferencesAction` save                                                                          | `__tests__/models/user-model.preferences.test.ts` — accepts Date construction; `__tests__/actions/verify-pin.optin-payload.test.ts` AC3 row — `preferences.communicationPreferencesUpdatedAt` is one of the paths set during first verify                                                                                                   |
| AC4 | NotificationService marketing-category email blocked when `emailMarketing === false`; allowed when `true`; transactional email NOT affected by `emailMarketing`                                                              | `__tests__/services/notification-service.email-marketing-gate.test.ts` — 3 cases: (1) `reward_earned` + `emailMarketing: false` — email closure NOT called, `sentVia: 'none'`; (2) `reward_earned` + `emailMarketing: true` — closure called, `sentVia: 'email'`; (3) `order_confirmation` + `emailMarketing: false` — closure still called |
| AC5 | Profile preferences-tab renders "Email — offers & promotions" toggle alongside the existing WhatsApp marketing one, wired through `updatePreferencesAction`                                                                  | Manual UAT verification — UI-only addition; Zod schema + form defaults updated in same diff for type-safety                                                                                                                                                                                                                                 |
| AC6 | Backwards-compat: existing REQ-053 + REQ-054 tests still pass under the new payload + gate shape                                                                                                                             | Full vitest suite — 1047 pass / 4 skip / 0 fail (+8 from REQ-062 baseline of 1039)                                                                                                                                                                                                                                                          |

## Test environment

- **Unit:** vitest 4.1.x. `@/lib/mongodb` / `@/lib/session` / `iron-session` / `next/headers` mocked at the import boundary. `@/models` mocked for `UserModel.findOne` (verify-pin) and `UserModel.findById` (NotificationService). `@/lib/whatsapp` mocked. `@/services/notification-log-service` mocked (no Mongo writes during tests).
- **No component test for the three-checkbox surface or the new profile toggle.** Both are pure UI additions wiring already-tested action paths; manual UAT covers the visual + interactive parts.
- **No E2E.** Honours `project_e2e_targeted_until_117` policy; unit + integration boundary at 8 new cases is the load-bearing gate.

## Quality gates

| Gate                            | Expected   | Actual (2026-06-03)                          |
| ------------------------------- | ---------- | -------------------------------------------- |
| `npx tsc --noEmit`              | exit 0     | exit 0                                       |
| `npx vitest run` (full)         | 0 failures | 1047 pass / 4 skip / 0 fail                  |
| `npx eslint . --max-warnings=0` | 0 errors   | 0 errors / 950 pre-existing console warnings |
| `npm run build`                 | exit 0     | exit 0                                       |
| CI Pipeline (develop)           | SUCCESS    | run 26888266053 — SUCCESS                    |
| Compliance Evidence Upload      | SUCCESS    | run 26888266061 — SUCCESS                    |
