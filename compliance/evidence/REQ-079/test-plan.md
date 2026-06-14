# Test Plan - REQ-079

**Requirement ID:** REQ-079
**Risk:** LOW
**Related issue:** [#377](https://github.com/metasession-dev/wawagardenbar-app/issues/377)
**Date:** 2026-06-13

## Acceptance Criteria to Tests

| AC  | Statement                                                                                   | Test                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `npm run lint` runs ESLint directly and avoids the removed `next lint` path.                | Inspect `package.json` script and run `npm run lint` after restoring dependency install state.                                                                |
| AC2 | `npm test` runs the Vitest suite.                                                           | Inspect `package.json` script and run `npm test`.                                                                                                             |
| AC3 | `npm run lint && npx tsc --noEmit && npm test` is the supported local verification command. | Run the full chained command after dependency install state is consistent.                                                                                    |
| AC4 | ESLint install/config is coherent with legacy `.eslintrc.json`.                             | Run `npm ls eslint --depth=0` after `npm ci`; expected root ESLint is compatible with `^8.57.1`. Do not introduce ESLint 9 flat-config migration in this REQ. |

## Tests to Add

None. This change updates package scripts only; behavior is verified by executing the scripts.

## Tests to Update

None expected. If a CI workflow references `npm test` or `npm run lint`, no workflow change is required because the script names remain stable and are made functional.

## Tests to Remove

None.

## Verification Commands

Run in order:

```bash
npm ci
npm ls eslint --depth=0
npm run lint
npx tsc --noEmit
npm test
npm run lint && npx tsc --noEmit && npm test
```

Broader gates before push/PR, environment permitting:

```bash
npm audit --audit-level=high
npx playwright test
```

## Expected Results

- `npm ci` restores `node_modules` to the lockfile state.
- `npm ls eslint --depth=0` reports an ESLint 8.x version satisfying the root `^8.57.1` range.
- `npm run lint` no longer invokes `next lint`.
- `npm test` invokes `vitest run`.
- TypeScript and Vitest pass as already observed in issue #377.

## Rollback Signal

If lint cannot run under the legacy `.eslintrc.json` configuration with ESLint 8.x, revert the script change and open a follow-up requirement for an ESLint 9 flat-config migration. Do not mix an ESLint 9 install with the legacy config in this REQ.
