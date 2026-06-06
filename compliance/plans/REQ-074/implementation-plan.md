# REQ-074 — Implementation plan

**Requirement ID:** REQ-074
**Risk:** MEDIUM (production code change in 3 auth actions + new E2E specs covering customer surfaces)
**Related issue:** [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Date:** 2026-06-06
**Operator plan approval:** 2026-06-06 (plan-mode review, Option A confirmed)

## Context

Umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) closed 5 of 6 sub-issues via the v2026.06.05 bundle. Sub-issue [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292) — customer journey E2E coverage — has been blocked the whole time on PIN-flow auth surface gaps. This REQ unblocks it via the smallest viable production-code change.

## Why blocked

`app/actions/auth/send-pin.ts` (+ siblings `send-whatsapp-pin.ts` + `send-email-pin.ts`) persist a PIN to `User.verificationPin` then attempt SMS / WhatsApp / Email dispatch. In test environments the providers return `success: false` (sandbox restrictions, no key, rate-limit), the action returns failure, and the UI shows an error toast — blocking any spec touching PIN login.

## Fix

Insert an env-gated short-circuit AFTER the PIN persist and BEFORE the provider dispatch in each of the three send actions:

```ts
if (process.env.ENABLE_E2E_PIN_INTERCEPT === 'true') {
  return {
    success: true,
    message: 'PIN persisted (E2E intercept mode)',
    isNewUser,
  };
}
```

The PIN is already in MongoDB — E2E specs read it via `User.verificationPin` and submit it to the verify form.

## Acceptance criteria

- **AC1** — `sendPinAction` with `ENABLE_E2E_PIN_INTERCEPT=true` returns success without calling `SMSService.sendVerificationPinSMS`; `User.verificationPin` is still persisted.
- **AC2** — Same shape for `sendWhatsAppPinAction` (no `WhatsAppService` call) + `sendEmailPinAction` (no `sendVerificationPinEmail` call).
- **AC3** — With flag unset, existing behaviour is unchanged: provider dispatch fires; on failure the action returns `success: false` as before.
- **AC4** — `e2e/customer/auth-pin-happy-path.spec.ts` walks the full PIN flow (login → SMS step → phone → Continue → PIN-entry → verify → session) against UAT once Railway has the flag set.
- **AC5** — `e2e/customer/home-page.spec.ts` pins marketing home + /menu navbar+items.
- **AC6** — `e2e/customer/auth-guest-flow.spec.ts` pins guest can navigate `/` ↔ `/menu` without an auth session being minted.

## V1 scope

- 3 specs: `auth-pin-happy-path` (REQ-AUTHC-001), `home-page` (REQ-HOME-001/002), `auth-guest-flow` (REQ-AUTHC-003)
- 1 helper: `e2e/helpers/customer-auth.ts` (Mongo PIN read, synthetic phone, cleanup, intercept-likely check)
- 1 unit test file: `__tests__/actions/auth/pin-intercept.test.ts` (6 tests, parameterised across 3 actions)
- Production code change: 3 actions, ~15 lines total

## Deferred to V2 within #292

- `e2e/customer/profile-page.spec.ts` (REQ-PROFILE-001) — needs authenticated-user fixture + addresses seed
- `e2e/customer/rewards-page.spec.ts` (REQ-REWARDC-001/002) — needs seeded points + rewards
- `the V2 auth-pin-errors spec (file name TBD)` (REQ-AUTHC-002) — rate-limit + expiry error states

## Security

- `ENABLE_E2E_PIN_INTERCEPT` defaults to `false` (env-only, no input path)
- Variable name carries `E2E` for visibility in env-var audits
- Bypass only short-circuits the provider dispatch — does NOT bypass PIN validation, expiry, rate-limiting, or session creation
- Real customers cannot trigger the bypass via any input
- Mitigation if accidentally enabled in prod: customers would log in via PINs they didn't receive (UX failure, not security failure — PIN is random + expiry-gated)

## Quality gates

| Gate                                           | Expected                                   |
| ---------------------------------------------- | ------------------------------------------ |
| `npx tsc --noEmit`                             | exit 0                                     |
| `npx vitest run`                               | green; +6 cases vs baseline                |
| Focused E2E (UAT, with flag set on Railway)    | 7 passed (3 auth-setup + 4 customer)       |
| Focused E2E (UAT, WITHOUT flag set on Railway) | 6 passed + 1 cleanly-skipped auth-pin spec |

## Stage plan

- [x] Stage 1 — Plan (this doc, operator-approved 2026-06-06)
- [x] Stage 2 — Implement + unit-test (6/6 pass)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR); operator sets Railway env var
- [ ] Stage 5 — Merge + close-out
