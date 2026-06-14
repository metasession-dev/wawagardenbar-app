# Test Plan - REQ-080

**Requirement ID:** REQ-080
**Risk:** HIGH
**Related issue:** [#380](https://github.com/metasession-dev/wawagardenbar-app/issues/380)
**Date:** 2026-06-14

## Acceptance Criteria to Tests

| AC | Statement | Test |
| --- | --- | --- |
| AC1 | High-severity audit findings are resolved. | Run `npm audit --audit-level=high` locally after dependency update and in CI. |
| AC2 | TypeScript and SAST remain green. | Run `npx tsc --noEmit`; rely on CI SAST gate and inspect CI result. |
| AC3 | CI proceeds past dependency audit into E2E/build. | Trigger CI on `fix/REQ-080-dependency-audit` and confirm E2E/build are not skipped because of audit failure. |
| AC4 | Diff stays minimal. | Review `git diff --stat` and changed file list before commit. |

## Tests to Add

None. This is a dependency metadata/security remediation. Behavioral coverage comes from existing gates.

## Tests to Update

None expected. If dependency updates require test harness compatibility changes, document the reason before making them.

## Tests to Remove

None.

## Verification Commands

Local targeted checks:

```bash
npm audit --audit-level=high
npm run lint
npx tsc --noEmit
npm test
npm run build
```

CI checks:

```bash
gh workflow run ci.yml --ref fix/REQ-080-dependency-audit
gh run list --branch fix/REQ-080-dependency-audit --limit 5
```

## Expected Results

- Dependency audit exits 0 for high-severity threshold.
- Lint/type/unit/build continue to run after dependency changes.
- CI Quality Gates no longer stop at Dependency Audit.

## Rollback Signal

If dependency updates introduce build/test breakage that cannot be fixed without broad framework migration, revert the dependency update and split the migration into a larger follow-up requirement.
