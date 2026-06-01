# REQ-055 — Test execution summary

**Date:** 2026-06-01
**Branch:** `feat/REQ-055-notification-log`

## Gate results

### `npx tsc --noEmit`

Exit 0. Clean.

### `npx vitest run __tests__/models/notification-log-model.test.ts`

```
 ✓ __tests__/models/notification-log-model.test.ts (6 tests)

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Cases:

- AC1 — status defaults to "queued"
- AC1 — attemptedAt defaults to now-ish
- AC1 — required fields throw validation error if missing
- AC1 — status enum constraint rejects invalid values
- AC1 — channel enum constraint rejects invalid values
- AC1 — `userId: null` accepted (guest path)

### `npx vitest run __tests__/services/notification-log-service.test.ts`

```
 ✓ __tests__/services/notification-log-service.test.ts (10 tests)

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

Cases (in roughly AC order):

- AC2 — `recordAttempt` writes a doc with the passed fields and returns the doc id
- AC2 — `userId: null` accepted (guest path)
- AC6 — `recordAttempt` persistence error is swallowed; no throw, console.error called
- AC2 — `updateStatus` updates an existing queued doc to delivered
- AC5 — failureReason recorded on `failed` status
- AC5 — filter guards monotonic transitions (delivered → read allowed)
- AC5 — `failed` is terminal: subsequent `delivered` does not overwrite
- AC2 — unknown messageId returns false, no throw
- AC2 — update error is swallowed; no throw, console.error called
- AC5 — `queued → sent` allowed (smallest forward step)

### `npx vitest run __tests__/services/notification-service.log-integration.test.ts`

```
 ✓ __tests__/services/notification-service.log-integration.test.ts (3 tests)

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

Cases:

- AC3 — WhatsApp success: `recordAttempt` called with messageId
- AC3 — WhatsApp fail → email fallback: `recordAttempt` called twice (one per channel attempt, in order)
- AC6 — `recordAttempt` rejection does NOT break the send path (caller still gets `{ sentVia: 'whatsapp', success: true }`)

### `npx vitest run` (full)

```
 Test Files  91 passed | 1 skipped (92)
      Tests  936 passed | 4 skipped (940)
   Duration  3.85s
```

Up from 917 / 4 skip (REQ-054 baseline) → **+19 new REQ-055 cases**. 0 failures.

### `npx eslint <changed>`

```
services/notification-service.ts
  128:3  warning  Unexpected console statement  no-console

✖ 8 problems (0 errors, 8 warnings)
```

0 errors on REQ-055 code. The 8 `no-console` warnings are on intentional v1 observability `console.log` lines in `notification-service.ts` (carried over from REQ-054) and the lazy-import `console.warn` in `lib/whatsapp.ts` (for misconfigured environments). All match the REQ-054 release pattern.

### `semgrep scan --config auto <REQ-055 files>`

```
Ran 210 rules on 4 files: 0 findings.
```

Clean across `models/notification-log-model.ts`, `services/notification-log-service.ts`, `services/notification-service.ts`, `lib/whatsapp.ts`.

### `npm audit --audit-level=high`

```
high: 0  critical: 0
```

Unchanged.

## E2E execution

n/a — REQ-055's surface is server-side persistence. The unit + integration boundary at 19 cases is the load-bearing gate. Honours `project_e2e_targeted_until_117` policy.

## Summary

- Unit + integration gate: PASS (936 / 0 / 4 skipped — +19 from REQ-054 baseline).
- Type gate: PASS.
- Lint gate: PASS (no errors; intentional `no-console` warnings per REQ-054 design).
- Static-analysis gate: PASS (semgrep 0 findings).
- Dependency-audit gate: PASS (no new high/critical).
- E2E gate: n/a (scope-justified + policy-justified).
