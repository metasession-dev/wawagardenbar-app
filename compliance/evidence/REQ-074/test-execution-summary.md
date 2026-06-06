# REQ-074 — Test execution summary

**Date:** 2026-06-06
**Risk:** MEDIUM

## Unit tests

```
$ npx vitest run __tests__/actions/auth/pin-intercept.test.ts --reporter=verbose
 ✓ sendPinAction (SMS) > with bypass active: returns success without calling SMSService + still persists PIN  14ms
 ✓ sendPinAction (SMS) > with bypass inactive: falls through to SMSService (existing behaviour)               1ms
 ✓ sendWhatsAppPinAction > with bypass active: returns success without calling WhatsAppService + still persists PIN  9ms
 ✓ sendWhatsAppPinAction > with bypass inactive: falls through to WhatsAppService                              0ms
 ✓ sendEmailPinAction > with bypass active: returns success without calling sendVerificationPinEmail + still persists PIN  6ms
 ✓ sendEmailPinAction > with bypass inactive: falls through to sendVerificationPinEmail                        0ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  164ms
```

## Full vitest baseline

```
$ npx vitest run --reporter=dot
 Test Files  122 passed | 1 skipped (123)
      Tests  1135 passed | 4 skipped (1139)
   Duration  3.93s
```

+6 cases vs the pre-REQ-074 baseline of 1129 — matches the 6 new unit tests.

## TypeScript

```
$ npx tsc --noEmit
(exit 0)
```

## Focused E2E (UAT)

```
$ BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  MONGODB_URI=$MONGODB_UAT_EXTERNAL_URI \
  MONGODB_DB_NAME=wawagardenbar_uat \
  ENABLE_E2E_PIN_INTERCEPT=true \
  npx playwright test e2e/customer/ --project=regression --reporter=list

  ✓ 1 [auth-setup] › authenticate as csr (3.0s)
  ✓ 3 [auth-setup] › authenticate as admin (3.0s)
  ✓ 5 [regression] › home-page.spec.ts › marketing home (/) renders hero + View Menu CTA for guests (1.2s)
  ✓ 7 [regression] › home-page.spec.ts › /menu renders menu items + navbar shows Sign In for guests (1.5s)
  ✓ 4 [regression] › auth-guest-flow.spec.ts › AC1: guest navigates / → /menu → / without being forced to log in; no auth session minted (2.9s)
  - 6 [regression] › auth-pin-happy-path.spec.ts › AC1: phone → PIN persists → PIN entry → verify → session created   ← skipped

  1 skipped
  6 passed (7.6s)
```

## Why one spec skipped

`auth-pin-happy-path.spec.ts` requires the server-side flag `ENABLE_E2E_PIN_INTERCEPT=true` to be set on Railway UAT — not just on the Playwright runner. Without it, the action falls through to the real SMS provider which returns "SMS service is currently unavailable" and the action returns `success: false`.

The spec **detects this case explicitly**: after clicking Continue it races `#pin` visibility against the provider-error alert. If the alert wins, the spec calls `test.skip()` with a message naming the missing env var and the action the operator needs to take ("set on Railway, redeploy, re-run").

Once the operator sets the env var on Railway and the redeploy completes, the spec walks the full flow: phone → Continue → PIN-entry → reads PIN from `User.verificationPin` via `waitForPin` (Mongo poll with 5s timeout) → fills PIN → Continue → asserts the page leaves `/login` + a session cookie is set.

## What this run proves

- ✓ Bypass logic is correct: 6/6 unit tests pass for both bypass-active and bypass-inactive paths across all 3 actions
- ✓ Unit-test baseline preserved: no other test regressed (1135 = 1129 + 6 new)
- ✓ TypeScript is clean
- ✓ Home + /menu surfaces render for guests against live UAT (the 2 home-page tests + the guest-flow test all pass)
- ✓ The skip-detection logic in `auth-pin-happy-path` works correctly — failure mode is unambiguous

## What this run does NOT yet prove

- ✗ End-to-end PIN flow against UAT (deferred until operator sets the Railway env var)
- ✗ Full regression pack with REQ-074 specs included — runs nightly per the workflow auto-trigger restored by PR #315; spot check via `gh workflow run` after merge

## Cleanup

`afterAll` in `auth-pin-happy-path` calls `cleanupTestUser(conn, phone)` which deletes the User by synthetic phone. Idempotent — safe to re-run.
