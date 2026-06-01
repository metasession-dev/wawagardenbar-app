# REQ-056 — Test execution summary

**Date:** 2026-06-01
**Branch:** `feat/REQ-056-whatsapp-inbound-router`

## Gate results

### `npx tsc --noEmit`

Exit 0. Clean.

### `npx vitest run __tests__/models/incoming-message-model.test.ts`

```
 ✓ __tests__/models/incoming-message-model.test.ts (5 tests)

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Cases:

- AC1 — receivedAt defaults to now-ish
- AC1 — required fields throw validation error if missing
- AC1 — classifiedState enum rejects unknown values
- AC1 — classifiedIntent enum rejects unknown values
- AC1 — `userId: null` accepted (new customer, before auto-create)

### `npx vitest run __tests__/services/whatsapp-inbound-service.classify.test.ts`

```
 ✓ __tests__/services/whatsapp-inbound-service.classify.test.ts (13 tests)

 Test Files  1 passed (1)
      Tests  13 passed (13)
```

State classifier (6):

- AC2 — no user → "new" with `user: null`
- AC2 — user with `phoneVerified: false` → "signing_up"
- AC2 — `phoneVerified: true` + recent `lastLoginAt` → "active"
- AC2 — `phoneVerified: true` + `lastLoginAt` 31 days ago → "dormant"
- AC2 — `phoneVerified: true` + `lastLoginAt` undefined → "dormant"
- AC2 — deleted-account users skipped (filter excludes `accountStatus: 'deleted'`)

Intent classifier (7):

- AC3 — `"STOP"` → "opt_out"
- AC3 — `"stop  "` (whitespace + lowercase) → "opt_out"
- AC3 — `"unsubscribe"` → "opt_out"
- AC3 — `"opt out"` / `"opt-out"` → "opt_out"
- AC3 — text body `"💬 Chat with Staff"` → "chat_with_staff"
- AC3 — Meta interactive `button_reply.title: "💬 Chat with Staff"` → "chat_with_staff"
- AC3 — arbitrary text → "support_text"

### `npx vitest run __tests__/services/whatsapp-inbound-service.routing.test.ts`

```
 ✓ __tests__/services/whatsapp-inbound-service.routing.test.ts (10 tests)

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

Cases (in roughly AC order):

- AC4 — `new` + `support_text` → auto-creates User, sends `welcome_new_user`, action `sent_welcome_new_user`
- AC4 — `signing_up` + `support_text` → no auto-create, sends `welcome_new_user`
- AC4 — `active` + `support_text` → no template send, action `queued_for_staff`
- AC4 — `dormant` + `chat_with_staff` → sends `welcome_back`
- AC5 — `active` + `opt_out` → both whatsapp flags set to false; free-form confirm sent; action `persisted_opt_out`
- AC5 — `new` + `opt_out` → auto-creates User, then persists opt-out flags on the new doc
- AC5 — opt_out persists even when outbound free-form confirmation fails
- AC6 — `UserModel.create` called with `phone, phoneVerified: false, isGuest: false`
- AC7 — `IncomingMessageModel.create` rejecting does not throw out of `handle()`
- AC7 — `NotificationService.send` rejecting does not throw out of `handle()`

### `npx vitest run __tests__/lib/whatsapp.inbound-integration.test.ts`

```
 ✓ __tests__/lib/whatsapp.inbound-integration.test.ts (2 tests)

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

Cases:

- AC8 — inbound-messages payload routes to `WhatsAppInboundService.handle` once per message
- AC8 — status-events payload does NOT call the inbound service (REQ-055 path stays untouched)

### `npx vitest run` (full)

```
 Test Files  95 passed | 1 skipped (96)
      Tests  966 passed | 4 skipped (970)
   Duration  3.29s
```

Up from 936 / 4 skip (REQ-055 baseline) → **+30 new REQ-056 cases**. 0 failures.

### `npx eslint <changed>`

```
lib/whatsapp.ts
  306:7   warning  Unexpected console statement  no-console
  318:7   warning  Unexpected console statement  no-console
  333:11  warning  Unexpected console statement  no-console
  355:13  warning  Unexpected console statement  no-console
  360:13  warning  Unexpected console statement  no-console
  404:11  warning  Unexpected console statement  no-console

✖ 6 problems (0 errors, 6 warnings)
```

0 errors on REQ-056 code. The 6 `no-console` warnings are on intentional `console.error` / `console.warn` lines on the new `sendTextMessage` method + the lazy-import safety net (matches the v1 observability pattern carried over from REQ-054/055).

### `semgrep scan --severity=ERROR <REQ-056 files>`

```
Ran 78 rules on 4 files: 0 findings.
```

Clean across `models/incoming-message-model.ts`, `services/whatsapp-inbound-service.ts`, `lib/whatsapp-inbound-templates.ts`, `lib/whatsapp.ts`.

### `npm audit --audit-level=high`

```
high: 0  critical: 0
```

After the unrelated vitest 4.1.x GHSA bump landed via PR #230 (npm advisory DB published the critical between REQ-055's CI and REQ-056's, no REQ-056-introduced deps).

## E2E execution

n/a — REQ-056's surface is server-side webhook routing. The unit + integration boundary at 30 cases is the load-bearing gate. Honours `project_e2e_targeted_until_117` policy.

## CI on develop

After PR #229 merged + the vitest CVE was fixed (PR #230) + the re-attribution PR landed (PR #231): CI Pipeline run [26774830299](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26774830299) passed all 3 jobs (Register Release / Quality Gates / Upload Evidence) and attributed to `--release REQ-056` per `derive-release-version.sh` step 3 picking up the `[REQ-056]` bracket in the merge-commit body.

## Summary

- Unit + integration gate: PASS (966 / 0 / 4 skipped — +30 from REQ-055 baseline).
- Type gate: PASS.
- Lint gate: PASS (no errors; intentional `no-console` warnings per v1 observability pattern).
- Static-analysis gate: PASS (semgrep 0 findings).
- Dependency-audit gate: PASS (no new high/critical post-vitest-bump).
- E2E gate: n/a (scope-justified + policy-justified).
