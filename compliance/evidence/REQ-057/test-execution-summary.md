# REQ-057 — Test execution summary

**Date:** 2026-06-01
**Branch:** `feat/REQ-057-ig-foundation` (merged to develop as PR #236, commit `4eaa2b8`)

## Gate results

### `npx tsc --noEmit`

Exit 0. Clean.

### `npx vitest run __tests__/services/reward-rule-cadence-schema.test.ts`

```
 ✓ __tests__/services/reward-rule-cadence-schema.test.ts (11 tests)

 Test Files  1 passed (1)
      Tests  11 passed (11)
```

Cases (REQ-057 additions in bold):

- has postsRequired registered as Number with min=1 (pre-existing)
- has windowDays registered as Number with min=1 (pre-existing)
- has requireMention registered as Boolean defaulting to true (pre-existing)
- still has the legacy socialConfig fields intact — regression (pre-existing)
- **AC1 — postsRequired defaults to 3**
- **AC1 — windowDays defaults to 7**
- **AC1 — explicit cadence values override the defaults**
- **AC2 — half-set (postsRequired only) fails validation**
- **AC2 — half-set (windowDays only) fails validation**
- **AC2 — both-set cadence passes validation**
- **AC2 — neither-set (explicit null both) passes (legacy mode)**

### `npx vitest run __tests__/actions/profile-actions.instagram-handle.test.ts`

```
 ✓ __tests__/actions/profile-actions.instagram-handle.test.ts (16 tests)

 Test Files  1 passed (1)
      Tests  16 passed (16)
```

Cases:

Accept (5):

- AC3 — bare handle `foo`
- AC3 — dotted `foo.bar`
- AC3 — underscore `foo_bar`
- AC3 — mixed alphanumeric `foo.123`
- AC3 — leading-digit `123foo`

Reject (6):

- AC3 — space `foo bar`
- AC3 — hyphen `foo-bar`
- AC3 — special char `foo!`
- AC3 — 31-char overflow
- AC3 — `<script>alert(1)</script>`
- AC3 — `@@@` (post-strip becomes `@@`, still invalid)

Transform (4):

- AC4 — `@foo` → `foo` (leading-`@` strip)
- AC4 — `@foo.bar` → `foo.bar`
- AC4 — `  foo  ` → `foo` (whitespace trim)
- AC4 — `@foo  ` → `foo` (combined strip + trim)

Sentinel (1):

- AC3 — empty string accepted (clear-handle sentinel)

### `npx vitest run` (full)

```
 Test Files  96 passed | 1 skipped (97)
      Tests  989 passed | 4 skipped (993)
   Duration  4.01s
```

Up from 966 / 4 skip (REQ-056 baseline) → **+19 new REQ-057 cases (7 schema + 12 zod handle — 4 of the 16 zod cases are transform/whitespace, counted under AC4 not AC3 add count)**. 0 failures.

### `npx eslint <changed>`

```
(no output — 0 errors, 0 warnings)
```

0 errors on REQ-057 code. No intentional `no-console` warnings introduced.

### `semgrep scan --severity=ERROR <REQ-057 files>`

```
Ran 78 rules on 3 files: 0 findings.
```

Clean across `models/reward-rule-model.ts`, `app/actions/profile/profile-actions.ts`, `components/features/profile/personal-info-tab.tsx`.

### `npm audit --audit-level=high`

```
high: 0  critical: 0
```

Unchanged from REQ-056 baseline (vitest 4.1.x via PR #230 fixed the pre-existing UI-server GHSA mid-REQ-056 cycle).

## E2E execution

n/a — REQ-057's surface is schema-level + form validation. The unit boundary at 27 cases (11 schema + 16 zod handle) is the load-bearing gate. Honours `project_e2e_targeted_until_117` policy.

## CI on develop after PR #236 merge

Run [26782113739](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26782113739) — **Compliance Evidence Upload** succeeded; `derive-release-version.sh` step 3 picked `[REQ-057]` from the merge-commit body (PR #236 title) → `Release version: REQ-057`. Quality Gates + Upload Evidence still finishing at the time of this evidence pack assembly; this evidence-pack PR commits to develop will trigger another Compliance Evidence Upload run that uploads the markdown evidence under the same release.

## Summary

- Unit gate: PASS (989 / 0 / 4 skipped — +19 from REQ-056 baseline).
- Type gate: PASS.
- Lint gate: PASS (0 errors, 0 new warnings).
- Static-analysis gate: PASS (semgrep 0 findings).
- Dependency-audit gate: PASS (no new high/critical).
- E2E gate: n/a (scope-justified + policy-justified).
- Release attribution: PASS — `Release version: REQ-057` (clean step-3 resolution).
