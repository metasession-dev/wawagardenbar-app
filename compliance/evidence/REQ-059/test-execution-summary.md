# REQ-059 — Test execution summary

**Date:** 2026-06-02
**Branch:** `feat/REQ-059-instagram-post-credit-ledger` (merged to develop as PR #245, commit `96f4f05`)

## Gate results

### `npx tsc --noEmit`

Exit 0. Clean.

### `npx vitest run __tests__/models/instagram-post-credit-model.test.ts`

```
 ✓ __tests__/models/instagram-post-credit-model.test.ts (6 tests)

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Cases:

- AC1 — `status` defaults to `'pending'`
- AC1 — `awardedAt` defaults to `null`
- AC1 — required fields throw validation if missing
- AC1 — `status` enum rejects invalid values
- AC1 — explicit `awardedAt` accepted
- AC1 — indexes registered: unique `postId` + compound `(userId, ruleId, postedAt: -1)`

### `npx vitest run __tests__/services/instagram-service.ledger.test.ts`

```
 ✓ __tests__/services/instagram-service.ledger.test.ts (10 tests)

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

Cases:

- AC2 — new post with no ledger row and no legacy match inserts pending credit
- AC2 — existing ledger row for postId skips entirely
- AC3 — no ledger row but legacy fallback fires inserts awarded credit, no re-award
- AC4 — `pendingCount < postsRequired` returns `inserted_pending` without awarding
- AC4 + AC5 — `pendingCount >= postsRequired` fires award + flip
- AC5 — `awardSocialPoints` throwing does NOT call `updateMany`; credit stays pending
- AC6 — concurrent insert E11000 caught as `skipped_already_seen`, no award
- AC4 — uses rule defaults (3 / 7) when `socialConfig` fields absent
- AC7 — hourly re-tick: same post, ledger already has it → `skipped_already_seen`
- AC4 — count query filters on `userId` + `ruleId` + `status:pending` + `postedAt` window

### `npx vitest run` (full)

```
 Test Files  98 passed | 1 skipped (99)
      Tests  1007 passed | 4 skipped (1011)
   Duration  4.52s
```

Up from 991 / 4 skip (REQ-058 baseline) → **+16 new REQ-059 cases**. 0 failures.

### `npx eslint <changed>`

```
services/instagram-service.ts
   59:7  warning  Unexpected console statement  no-console
   74:9  warning  Unexpected console statement  no-console
   78:7  warning  Unexpected console statement  no-console
   84:7  warning  Unexpected console statement  no-console
   98:5  warning  Unexpected console statement  no-console
  189:7  warning  Unexpected console statement  no-console

✖ 6 problems (0 errors, 6 warnings)
```

0 errors on REQ-059 code. The 6 `no-console` warnings are intentional v1 observability `console.log` / `console.error` lines on the new `processQualifyingPost` method and the existing `getHashtagId` / `getRecentMedia` paths (pre-existing pattern, carried forward by the diff).

### `semgrep scan --severity=ERROR <REQ-059 files>`

```
Ran 78 rules on 2 files: 0 findings.
```

Clean across `models/instagram-post-credit-model.ts` and `services/instagram-service.ts`.

### `npm audit --audit-level=high`

```
high: 0  critical: 0
```

Unchanged from REQ-058 baseline.

## E2E execution

n/a — REQ-059's surface is server-side ledger logic. The unit boundary at 16 cases is the load-bearing gate. Honours `project_e2e_targeted_until_117` policy.

## CI on develop after PR #245 merge

Run [26798396560](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26798396560) — all 3 jobs (Register Release / Quality Gates / Upload Evidence) PASS; `Release version: REQ-059` clean step-3 attribution via the `[REQ-059]` bracket in PR #245's merge-commit body.

Compliance Evidence Upload run [26798396596](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26798396596) also succeeded.

## Summary

- Unit gate: PASS (1007 / 0 / 4 skipped — +16 from REQ-058 baseline).
- Type gate: PASS.
- Lint gate: PASS (0 errors, 6 intentional `no-console` warnings on v1 observability per pre-existing pattern).
- Static-analysis gate: PASS (semgrep 0 findings).
- Dependency-audit gate: PASS (no new high/critical).
- E2E gate: n/a (scope-justified + policy-justified).
- Release attribution: PASS — `Release version: REQ-059` clean.
