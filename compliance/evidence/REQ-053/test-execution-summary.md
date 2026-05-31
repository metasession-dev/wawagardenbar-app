# REQ-053 — Test execution summary

**Date:** 2026-05-31
**Branch:** `feat/REQ-053-whatsapp-opt-in-surface`
**Commit:** `5934ff1`

## Gate results

### `npx tsc --noEmit`

```
$ npx tsc --noEmit
[exit 0]
```

Clean.

### `npx vitest run __tests__/models/user-model.preferences.test.ts`

```
 ✓ __tests__/models/user-model.preferences.test.ts (4 tests) 28ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

All four cases pass:

- AC1 — new doc has `whatsappTransactional === true`
- AC1 — new doc has `whatsappMarketing === false`
- AC1 — existing email/sms/push defaults unchanged
- AC6 — explicit overrides honoured at construction

### `npx vitest run __tests__/actions/auth/verify-pin-opt-in.test.ts`

```
 ✓ __tests__/actions/auth/verify-pin-opt-in.test.ts (4 tests) 32ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

All four cases pass:

- AC4 — first verify writes both fields
- AC4 — first verify with marketing opt-out persists `false`
- AC4 — subsequent verify does NOT overwrite preferences
- AC6 — no `optIn` argument is a backwards-compat no-op

### `npx vitest run` (full)

```
 Test Files  86 passed | 1 skipped (87)
      Tests  901 passed | 4 skipped (905)
   Duration  2.79s
```

Up from 893 / 4 skip (REQ-052 baseline) → **+8 new REQ-053 cases**. 0 failures. 4 skipped pre-existed.

### `npx eslint <changed>`

```
[8 warnings — all pre-existing react/no-unescaped-entities + console-statement;
 0 errors on REQ-053 code]
```

0 errors on the changed surface. Pre-existing warnings in `login-form.tsx` are not introduced by REQ-053.

### `semgrep scan --config auto <REQ-053 files>`

```
Ran 210 rules on 8 files: 0 findings.
```

Clean.

### `npm audit --audit-level=high`

```
high: 0  critical: 0
```

Unchanged vs the REQ-052 baseline.

## E2E execution

Deferred for this REQ — per project memory `e2e_regression_suite`, customer PIN-login specs need provider mocks (server-side fatal sends without them). The PIN-form opt-in checkbox flow is **exercised through unit boundaries** at this stage; the e2e wrapper will be added when the provider-mock infra lands, tracked as a separate REQ.

## Summary

- Unit gate: PASS (901 / 0 / 4 skipped).
- Type gate: PASS (`tsc --noEmit` clean).
- Lint gate: PASS (no errors on REQ-053 code).
- Static-analysis gate: PASS (semgrep 0 findings on changed files).
- Dependency-audit gate: PASS (no new high/critical).
- E2E gate: deferred (provider-mock infra).
