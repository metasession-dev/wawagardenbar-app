# REQ-055 — Test plan

**Requirement ID:** REQ-055
**Risk:** LOW-MEDIUM
**Related issue:** [#117 WA-5](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Acceptance criteria → tests

| AC  | Statement                                                                    | Test                                                                                                                        |
| --- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `NotificationLog` model with the documented fields, defaults, enums, indexes | `notification-log-model.test.ts` (6 cases) — defaults, required, enum constraints, guest path                               |
| AC2 | `NotificationLogService.recordAttempt` + `updateStatus`                      | `notification-log-service.test.ts` (10 cases) — write/update happy paths + error swallowing + unknown id                    |
| AC3 | REQ-054's `logAttempt` calls `recordAttempt`                                 | `notification-service.log-integration.test.ts` — success path (1 attempt) + fallback chain (2 attempts)                     |
| AC4 | `lib/whatsapp.ts:handleWebhook` status branch calls `updateStatus`           | Inspection of the diff + the lazy-import `try/catch` pattern; no isolated unit test (would mock too much)                   |
| AC5 | Idempotent / monotonic status filter                                         | `notification-log-service.test.ts` — 4 cases on the lifecycle gate (queued→sent, delivered→read, failed terminal, no-match) |
| AC6 | Backwards-compat: persistence failure swallowed; send path unaffected        | `notification-log-service.test.ts` error-swallow case + `notification-service.log-integration.test.ts` rejection case       |

## Test environment

- **Unit/Integration**: vitest 4.x. Mongo / network boundary fully mocked. `UserModel.findById` mocked with the chainable thenable convention used by other tests (`.lean()` → thenable). `NotificationLogModel` mocked directly at the import boundary. `WhatsAppService.sendMessage` mocked.
- **No E2E**: REQ-055's surface is server-side persistence; e2e would only exercise the order-confirmation path which the existing regression suite covers. Honours `project_e2e_targeted_until_117` policy.

## Quality gates

| Gate                                                                             | Expected        | Actual (2026-06-01)                                                     |
| -------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| `npx tsc --noEmit`                                                               | exit 0          | exit 0                                                                  |
| `npx vitest run` (full)                                                          | 0 failures      | 936 pass / 4 skip / 0 fail                                              |
| `npx vitest run __tests__/models/notification-log-model.test.ts`                 | 6 pass          | 6 pass                                                                  |
| `npx vitest run __tests__/services/notification-log-service.test.ts`             | 10 pass         | 10 pass                                                                 |
| `npx vitest run __tests__/services/notification-service.log-integration.test.ts` | 3 pass          | 3 pass                                                                  |
| `npx eslint <changed>`                                                           | 0 errors        | 0 errors (8 intentional `no-console` warnings on v1 observability logs) |
| `semgrep scan --config auto <changed>`                                           | 0 findings      | 0 findings on 4 files                                                   |
| `npm audit --audit-level=high`                                                   | 0 high/critical | 0 high / 0 critical                                                     |

## Test data

- Synthetic user OID `65a1b2c3d4e5f6a7b8c9d0aa`.
- Mock messageIds shaped like Meta's wamid: `wamid.abc`, `wamid.integration-1`, etc.
- Status lifecycle exercised at every documented transition.

## Sequencing

1. Unit gate runs locally + on CI per push.
2. E2E not dispatched — `project_e2e_targeted_until_117` policy + scope justification.
3. Release PR `develop → main` aggregates the CI evidence under `REQ-055`.

## Rollback signal

`NotificationLog.find().count()` stops growing → revert `<merge-sha>`. The collection persists in Mongo (orphaned but harmless). REQ-054's `console.log` lines keep firing as observability fallback.
