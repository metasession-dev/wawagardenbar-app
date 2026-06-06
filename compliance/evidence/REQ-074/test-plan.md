# REQ-074 — Test plan

**Requirement ID:** REQ-074
**Risk:** MEDIUM
**Related issue:** [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292)
**Date:** 2026-06-06

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                                                   | Test                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| AC1 | `sendPinAction` with `ENABLE_E2E_PIN_INTERCEPT=true` returns `success: true` without invoking `SMSService.sendVerificationPinSMS`; PIN is still persisted to `User.verificationPin`.                        | `__tests__/actions/auth/pin-intercept.test.ts` — "sendPinAction (SMS) > with bypass active"          |
| AC2 | Same shape for `sendWhatsAppPinAction` (no `WhatsAppService` call) + `sendEmailPinAction` (no `sendVerificationPinEmail` call).                                                                             | same file — "sendWhatsAppPinAction > with bypass active" + "sendEmailPinAction > with bypass active" |
| AC3 | With flag unset, existing behaviour preserved: provider dispatch fires.                                                                                                                                     | same file — 3 "with bypass inactive" cases                                                           |
| AC4 | `e2e/customer/auth-pin-happy-path.spec.ts` walks `/login → SMS → phone → Continue → PIN-entry → verify → session`. Reads PIN from `User.verificationPin` via `e2e/helpers/customer-auth.ts`'s `waitForPin`. | `e2e/customer/auth-pin-happy-path.spec.ts` — single case, runs only when server has the flag         |
| AC5 | `e2e/customer/home-page.spec.ts` pins `/` hero + View Menu CTA, and `/menu` navbar (Sign In for guests) + items.                                                                                            | 2 cases in `home-page.spec.ts`                                                                       |
| AC6 | `e2e/customer/auth-guest-flow.spec.ts` pins guest navigation `/` ↔ `/menu` doesn't mint an authenticated session.                                                                                          | 1 case in `auth-guest-flow.spec.ts`                                                                  |

## Surfaces / contracts under test

| Surface                               | Source-of-truth                               | Pinned by                    |
| ------------------------------------- | --------------------------------------------- | ---------------------------- |
| PIN persist before SMS dispatch       | `app/actions/auth/send-pin.ts:55`             | unit tests AC1 + spec AC4    |
| Same persist-before-dispatch ordering | `app/actions/auth/send-whatsapp-pin.ts:56`    | unit tests AC2               |
| Same persist-before-dispatch ordering | `app/actions/auth/send-email-pin.ts:110`      | unit tests AC2               |
| Marketing splash CTA                  | `app/page.tsx:34`                             | spec AC5 (test 1)            |
| Menu navbar auth surface              | `components/shared/navigation/navbar.tsx:160` | spec AC5 (test 2) + AC6      |
| /menu items render                    | `app/menu/page.tsx`                           | spec AC5 (test 2)            |
| /api/auth/user endpoint               | `app/api/auth/user/route.ts`                  | spec AC6 (guest-state probe) |

## Test environment

- **Unit:** vitest + Mongo mocked + provider services mocked. No network, no DB.
- **E2E (this PR):** Playwright + UAT URL + UAT Mongo (read-only assertions on User docs the spec itself seeded by triggering the action).
- New helper `e2e/helpers/customer-auth.ts` exposes `mongoConn`, `syntheticPhone`, `waitForPin`, `cleanupTestUser`, `isInterceptLikelyEnabled`. Pattern mirrors REQ-069's `webhook-mock.ts` + REQ-072's `socket-listener.ts`.
- `auth-pin-happy-path` spec is `mode: 'serial'` and uses synthetic phone numbers prefixed with the test run's timestamp; `afterAll` deletes the seeded test user.

## Quality gates

| Gate                                      | Expected                                   | Actual (2026-06-06)                    |
| ----------------------------------------- | ------------------------------------------ | -------------------------------------- |
| `npx tsc --noEmit`                        | exit 0                                     | exit 0                                 |
| `npx vitest run` (full)                   | 1129 + 6 new = 1135 pass / 4 skip / 0 fail | 1135 pass / 4 skip / 0 fail            |
| Focused E2E UAT (flag NOT set on Railway) | 6 passed + 1 cleanly-skipped               | 6 passed + 1 skipped (7.6s wall-clock) |
| Focused E2E UAT (flag SET on Railway)     | 7 passed                                   | _to confirm after operator sets var_   |

## Out of scope

- Real SMS / WhatsApp / Email dispatch — covered by integration tests on `lib/sms.ts` / `lib/whatsapp.ts` / `lib/email.ts`
- PIN expiry + rate-limit + wrong-PIN error states — deferred to V2 spec `auth-pin-errors.spec.ts`
- Profile + rewards page coverage — deferred to V2 within #292
- Cart preservation across pages — deferred to V2; V1 guest-flow pins navigation + no-auth-minted only
