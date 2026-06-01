# REQ-056 — Test plan

**Requirement ID:** REQ-056
**Risk:** MEDIUM-HIGH
**Related issue:** [#117 WA-3](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Acceptance criteria → tests

| AC  | Statement                                                                                 | Test                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `IncomingMessage` model with documented fields, defaults, enums, unique `messageId`       | `__tests__/models/incoming-message-model.test.ts` (5 cases) — defaults, required, enum constraints on state + intent, guest `userId: null` accepted                                    |
| AC2 | `classifyCustomerState(phone)` returns `'new' / 'signing_up' / 'active' / 'dormant'`      | `__tests__/services/whatsapp-inbound-service.classify.test.ts` — 6 cases covering every branch + deleted-account filter                                                                |
| AC3 | `classifyMessageIntent(message)` returns `'opt_out' / 'chat_with_staff' / 'support_text'` | Same file — 7 cases covering STOP regex variants, `"💬 Chat with Staff"` text + Meta `interactive.button_reply`, support-text fallback                                                 |
| AC4 | Routing matrix `state × intent → action`                                                  | `__tests__/services/whatsapp-inbound-service.routing.test.ts` — 4 cases at significant cells (new+support_text, signing_up+support_text, active+support_text, dormant+chat_with_staff) |
| AC5 | STOP compliance clears both `whatsappTransactional` and `whatsappMarketing`               | Same file — 3 cases (active+opt_out, new+opt_out auto-create-then-opt-out, opt_out persists when outbound confirm fails)                                                               |
| AC6 | New-state path calls `UserModel.create({ phone, phoneVerified: false, isGuest: false })`  | Same file — 1 case asserting on the create payload                                                                                                                                     |
| AC7 | Safety: persistence + outbound failures swallowed inside `handle()`                       | Same file — 2 cases (IncomingMessage.create rejection, NotificationService.send rejection)                                                                                             |
| AC8 | `handleWebhook` inbound branch delegates; status branch (REQ-055) untouched               | `__tests__/lib/whatsapp.inbound-integration.test.ts` — 2 cases (inbound delegates once per message; status-payload does NOT call inbound)                                              |

## Test environment

- **Unit/Integration**: vitest 4.1.x. Mongo / network boundary fully mocked. `UserModel.findOne`, `UserModel.create`, `UserModel.updateOne` mocked at `@/models` import boundary. `IncomingMessageModel.create` and `NotificationService.send` mocked separately. `WhatsAppService.sendTextMessage` mocked for the free-form opt-out confirmation. Customer-state classifier exercises real time-math against synthetic `lastLoginAt` Date objects.
- **No E2E**: REQ-056's surface is server-side webhook routing; e2e would require a Meta WhatsApp Cloud API sandbox + a way to simulate inbound — not in v1 testing infrastructure. Honours `project_e2e_targeted_until_117` policy.

## Quality gates

| Gate                                                                          | Expected        | Actual (2026-06-01)                                                                                                  |
| ----------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                                            | exit 0          | exit 0                                                                                                               |
| `npx vitest run` (full)                                                       | 0 failures      | 966 pass / 4 skip / 0 fail                                                                                           |
| `npx vitest run __tests__/models/incoming-message-model.test.ts`              | 5 pass          | 5 pass                                                                                                               |
| `npx vitest run __tests__/services/whatsapp-inbound-service.classify.test.ts` | 13 pass         | 13 pass                                                                                                              |
| `npx vitest run __tests__/services/whatsapp-inbound-service.routing.test.ts`  | 10 pass         | 10 pass                                                                                                              |
| `npx vitest run __tests__/lib/whatsapp.inbound-integration.test.ts`           | 2 pass          | 2 pass                                                                                                               |
| `npx eslint <changed>`                                                        | 0 errors        | 0 errors (6 intentional `no-console` warnings on `lib/whatsapp.ts` — pre-existing pattern carried over from REQ-055) |
| `semgrep scan --severity=ERROR <changed>`                                     | 0 findings      | 0 findings on 4 files                                                                                                |
| `npm audit --audit-level=high`                                                | 0 high/critical | 0 high / 0 critical (after vitest 4.1 bump for the unrelated GHSA — PR #230)                                         |

## Test data

- Synthetic user OIDs `65a1b2c3d4e5f6a7b8c9d0aa..ee` for the 4 customer states + auto-created user.
- Phone `+2348012345678` reused across cases (sanitises to `2348012345678` per `auth-utils.sanitizePhone`).
- Mock inbound messageIds shaped like Meta's wamid: `wamid.A1`, `wamid.S1`, `wamid.r1` etc.
- STOP regex exercised at: `STOP`, `stop  ` (whitespace + lowercase), `unsubscribe`, `opt out`, `opt-out`.
- Quick Reply payload exercised both as text body (`"💬 Chat with Staff"`) and as Meta `interactive.button_reply.title` + `button_reply.id`.

## Sequencing

1. Unit + integration gate runs locally + on CI per push.
2. E2E not dispatched — `project_e2e_targeted_until_117` policy + scope justification.
3. Release PR `develop → main` aggregates the CI evidence under `REQ-056`.

## Rollback signal

`IncomingMessage.find().count()` stops growing → revert `<merge-sha>`. The collection persists in Mongo (orphaned but harmless). Pre-REQ-056 `console.log` lines in `handleWebhook`'s inbound branch are removed by the revert; if needed, they can be restored as observability fallback in a follow-up commit. Any auto-created User rows persist as legitimate accounts; any opt-out flags persist (desired behaviour even after rollback).
