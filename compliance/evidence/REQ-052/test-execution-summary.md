# REQ-052 — Test execution summary

**Date:** 2026-05-31
**Branch:** `feat/REQ-052-partial-payment-businessdate`
**Commit:** `e667e70`

## Gate results

### `npx tsc --noEmit`

```
$ npx tsc --noEmit
[exit 0]
```

Clean.

### `npx vitest run __tests__/services/tab-service.business-date.test.ts`

```
 ✓ __tests__/services/tab-service.business-date.test.ts (4 tests) 8ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  499ms
```

All 4 cases pass (AC1, AC2, multi-partial, cutoff plumbing).

### `npx vitest run` (full)

```
 Test Files  84 passed | 1 skipped (85)
      Tests  893 passed | 4 skipped (897)
   Duration  3.58s
```

- Up from 889 pass / 4 skip (REQ-051 baseline) → +4 new REQ-052 cases.
- 0 failures. 4 skipped pre-existed and are unrelated.

### `npx eslint services/tab-service.ts __tests__/services/tab-service.business-date.test.ts`

```
services/tab-service.ts
  363:11  warning  Unexpected console statement  no-console
  849:11  warning  Unexpected console statement  no-console

✖ 2 problems (0 errors, 2 warnings)
```

- 2 warnings are pre-existing (lines 363, 849) — both predate REQ-052 and
  are unrelated to the change. Lines around the REQ-052 insert (670s) are
  clean.

### `semgrep scan --config auto services/tab-service.ts`

```
Ran 210 rules on 1 file: 0 findings.
```

Clean on the file changed by REQ-052.

### `npm audit --audit-level=high`

```
7 moderate severity vulnerabilities
```

- Unchanged vs the REQ-051 baseline. 0 high / 0 critical. The 7
  moderate-severity findings predate REQ-052 (transitive deps; tracked
  via the dependency-update cadence).

### Pre-existing tab-service suites — regression check

```
 ✓ __tests__/services/tab-service.business-date.test.ts (4 tests) 17ms
 ✓ __tests__/services/tab-service.tip-method.test.ts (3 tests) 18ms
 ✓ __tests__/services/tab-service.delete-super-admin.test.ts (6 tests) 18ms
 ✓ __tests__/services/tab-service.tip.test.ts (5 tests) 20ms

 Test Files  6 passed (6)
      Tests  26 passed (26)
```

No regression across the wider `tab-service.*` slice.

## E2E execution

Pending CI run on `develop` after integration PR merge. The single
load-bearing E2E gate is `e2e/daily-report-payments.spec.ts`'s
`daily report shows partial payment even though tab is still open` test
which #202 specifically tracks. Will be linked into this file on the
release PR.

## Summary

- Unit gate: PASS (893 / 0 / 4 skipped).
- Type gate: PASS (`tsc --noEmit` clean).
- Lint gate: PASS (no errors; pre-existing warnings unaffected).
- Static-analysis gate: PASS (semgrep 0 findings on changed file).
- Dependency-audit gate: PASS (no new high/critical).
- E2E gate: pending CI on develop.
