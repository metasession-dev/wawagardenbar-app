# REQ-058 — Test execution summary

**Date:** 2026-06-01
**Branch:** `feat/REQ-058-ig-scheduler` (merged to develop as PR #240, commit `b33bd2d`)

## Gate results

### `npx tsc --noEmit`

Exit 0. Clean.

### `npx vitest run __tests__/lib/scheduled-jobs.test.ts`

```
 ✓ __tests__/lib/scheduled-jobs.test.ts (5 tests)

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Cases (REQ-058 additions in bold):

- REQ-048 — `runRewardExpiryJob` calls `expireOldRewards` and returns the count (pre-existing)
- REQ-048 — `runRewardExpiryJob` swallows errors and returns 0 (pre-existing)
- **REQ-058 — `runInstagramRewardsJob` calls `processInstagramRewards`**
- **REQ-058 — `runInstagramRewardsJob` swallows errors and does not throw**
- **REQ-048 + REQ-058 — `startScheduledJobs` registers TWO hourly intervals and is idempotent** (was `1`, now `2`)

### `npx vitest run` (full)

```
 Test Files  96 passed | 1 skipped (97)
      Tests  991 passed | 4 skipped (995)
   Duration  3.83s
```

Up from 989 / 4 skip (REQ-057 baseline) → **+2 net new REQ-058 cases** (3 added, 1 absorbed into the idempotency update).

### `npx eslint <changed>`

```
(no output — 0 errors, 0 warnings)
```

0 errors on REQ-058 code. No new `no-console` warnings (the existing `console.warn` for the scheduler boot banner remains, with updated text reflecting both jobs).

### `semgrep scan --severity=ERROR lib/scheduled-jobs.ts`

```
Ran 78 rules on 1 file: 0 findings.
```

Clean.

### `npm audit --audit-level=high`

```
high: 0  critical: 0
```

Unchanged from REQ-057 baseline.

## E2E execution

n/a — REQ-058's surface is a server-boot scheduler. The unit boundary at 5 cases is the load-bearing gate. Honours `project_e2e_targeted_until_117` policy.

## CI on develop after PR #240 merge

Run [26784899671](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26784899671) — all 3 jobs (Register Release / Quality Gates / Upload Evidence) PASS; `Release version: REQ-058` clean step-3 attribution via the `[REQ-058]` bracket in PR #240's merge-commit body.

Compliance Evidence Upload run [26784899645](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26784899645) also succeeded.

## Summary

- Unit gate: PASS (991 / 0 / 4 skipped — +2 net new from REQ-057 baseline).
- Type gate: PASS.
- Lint gate: PASS (0 errors, 0 new warnings).
- Static-analysis gate: PASS (semgrep 0 findings).
- Dependency-audit gate: PASS (no new high/critical).
- E2E gate: n/a (scope-justified + policy-justified).
- Release attribution: PASS — `Release version: REQ-058` clean.
