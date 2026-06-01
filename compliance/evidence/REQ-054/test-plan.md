# REQ-054 — Test plan

**Requirement ID:** REQ-054
**Risk:** MEDIUM
**Related issue:** [#117 WA-2](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Acceptance criteria → tests

| AC  | Statement                                                                                            | Test                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `NotificationService.send(opts)` with per-channel payloads, returns `{ sentVia, success, attempts }` | `notification-service.test.ts` — first case asserts the full return shape                                                        |
| AC2 | `TEMPLATE_CATEGORIES` covers every documented template; unknown key throws                           | `notification-templates.test.ts` (6 cases) + `notification-service.test.ts` — unknown-key throw case                             |
| AC3 | Consent gating per category (`transactional` / `marketing` / `authentication`)                       | `notification-service.test.ts` — consent + category test cases (transactional opt-out, marketing opt-out, auth exemption)        |
| AC4 | Channel order WA → email → SMS; first success wins; fallback on failure                              | `notification-service.test.ts` — WA fail → email; full fallback chain (WA + email fail → SMS); all opted out → `sentVia: 'none'` |
| AC5 | Backwards-compat: `ENABLE_WHATSAPP_NOTIFICATIONS=false` or unapproved template → email fires         | `notification-service.test.ts` — WA returns `TEMPLATE_NOT_FOUND` → email fallback test                                           |
| AC6 | `communication-actions.ts:80` swapped to `NotificationService.send`                                  | Caller diff verified manually + tsc/eslint pass + full vitest suite (no regression in other tests)                               |
| AC7 | Each attempt `console.log`'d with structured fields                                                  | Verified by inspection of `services/notification-service.ts:logAttempt` + console output during tests                            |

## Test environment

- **Unit**: vitest 4.x via `npx vitest run`. Mongo / network boundary fully mocked. `UserModel.findById(id).lean()` mocked with a chainable thenable so both `.lean()` and `await` resolve to the mock value. `WhatsAppService.sendMessage` mocked via the `vi.mock('@/lib/whatsapp', ...)` boundary.
- **No E2E**: the orchestrator is server-action-shaped; e2e would only exercise the email fallback (same UX as today) so no incremental signal.

## Quality gates

| Gate                                                             | Expected        | Actual (2026-06-01)                                                                       |
| ---------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                               | exit 0          | exit 0                                                                                    |
| `npx vitest run` (full)                                          | 0 failures      | 917 pass / 4 skip / 0 fail                                                                |
| `npx vitest run __tests__/lib/notification-templates.test.ts`    | 6 pass          | 6 pass                                                                                    |
| `npx vitest run __tests__/services/notification-service.test.ts` | 10 pass         | 10 pass                                                                                   |
| `npx eslint <changed>`                                           | 0 errors        | 0 errors (1 pre-existing-style warning on intentional `console.log` for v1 observability) |
| `semgrep scan --config auto <changed>`                           | 0 findings      | 0 findings                                                                                |
| `npm audit --audit-level=high`                                   | 0 high/critical | 0 high / 0 critical                                                                       |

## Test data

- Synthetic user OID `65a1b2c3d4e5f6a7b8c9d0ff`.
- Mock phone `+2347000000001`, email `user@example.com`.
- Mock `whatsappTransactional: true`, `whatsappMarketing: false` by default (matches REQ-053 schema defaults); per-test overrides verify each consent branch.

## Sequencing

1. Unit gate runs locally + on CI per push (compliance-evidence).
2. E2E n/a; the existing regression suite covers the order-confirmation path's UX side via PR #211 / #213 fixes.
3. Release PR `develop → main` aggregates CI evidence under `REQ-054`.

## Rollback signal

Order confirmation `console.log` lines no longer carry `event: 'notification.attempt'` → revert merge SHA. Email path reverts to direct `sendOrderConfirmationEmail` call as it was pre-REQ-054.
